/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure Kundali Incident Recovery & Integrity Evaluator
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Implements strict, enforceable governance invariants for birth_profiles:
 * 1. Distinguishes synthetic containment from authentic-data recovery.
 * 2. An empty table or arbitrary rows cannot pass while 20 authentic rows remain unresolved.
 * 3. `closed_verified` and exit code 0 require a verified backup manifest, exact
 *    cardinality match, zero synthetic rows, zero unknown rows, clean ownership,
 *    and valid AstroChart v2 derived summaries.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import crypto from 'crypto';
import { isValidAstroChart } from './kundali-contract';

const SHA256_HEX_PATTERN = /^[a-f0-9]{64}$/;
const INCIDENT_STATUSES = new Set([
  'containment_complete_recovery_pending',
  'unrecoverable_with_approval',
]);

export interface KundaliIncidentManifest {
  schemaVersion: number;
  incidentId: string;
  incidentStatus: string;
  expectedDeletedAuthenticRowCount: number;
  knownSyntheticIdHashes: string[];
  recoveryManifestStatus: 'unavailable' | 'pending_backup_restore' | 'verified';
  recoveredAuthenticIdHashes: string[];
  approvedUnexpectedIdHashes: string[];
  manifestSource: 'incident_record' | 'verified_backup_reconciliation';
  decisionRecordRef?: string | null;
  reviewedAt: string | null;
  reviewedByRole: string | null;
}

export interface BirthProfileRowForAudit {
  id: string;
  owner_id?: string | null;
  session_token?: string | null;
  is_primary?: boolean | null;
  rashi?: string | null;
  sun_rashi?: string | null;
  nakshatra?: string | null;
  nakshatra_pada?: number | null;
  lagna?: string | null;
  lagna_deg?: number | null;
  ayanamsa?: number | null;
  chart_data?: any;
}

export type DeriveFn = (chart: any) => {
  rashi: string | null;
  sun_rashi: string | null;
  nakshatra: string | null;
  nakshatra_pada: number | null;
  lagna: string | null;
  lagna_deg: number | null;
  ayanamsa: number | null;
};

export interface KundaliRecoveryAuditResult {
  timestamp: string;
  syntheticContainmentStatus: 'complete' | 'incomplete';
  recoveryStatus: 'pending' | 'partial' | 'recovered' | 'unrecoverable_with_approval';
  expectedRecoverableRowCount: number;
  recoveredAuthenticRowCount: number;
  unresolvedDeletedRowCount: number;
  unexpectedRowCount: number;
  duplicateOwnershipCount: number;
  invalidOwnershipCount: number;
  duplicatePrimaryKeyCount: number;
  cardinalityStatus: 'pending_manifest' | 'short' | 'exact' | 'excess' | 'conflicting';
  chartIntegrityStatus: 'pending_recovery' | 'clean' | 'discrepancies';
  incidentStatus:
    | 'containment_incomplete'
    | 'containment_complete_recovery_pending'
    | 'recovery_partial'
    | 'recovered_pending_integrity'
    | 'closed_verified'
    | 'unrecoverable_with_approval';
  schemaVersionDistribution: Record<string, number>;
  timeUnknownDistribution: {
    known: number;
    unknown: number;
    invalidOrMissing: number;
  };
  verifiedSyntheticRowCount: number;
  denormalizedMismatchCounts: {
    rashi: number;
    sun_rashi: number;
    nakshatra: number;
    nakshatra_pada: number;
    lagna: number;
    lagna_deg: number;
    ayanamsa: number;
    totalRowsWithAnyMismatch: number;
  };
  storedSummaryDisagreesWithChartCount: number;
  hasDiscrepancies: boolean;
  exitCode: 0 | 1;
}

export function validateManifest(manifest: unknown): KundaliIncidentManifest {
  if (!manifest || typeof manifest !== 'object') {
    throw new Error('Invalid manifest: Expected object');
  }
  const m = manifest as Record<string, any>;
  if (m.schemaVersion !== 1) {
    throw new Error(`Unsupported manifest schemaVersion: ${m.schemaVersion}`);
  }
  if (!m.incidentId || typeof m.incidentId !== 'string') {
    throw new Error('Invalid manifest: missing incidentId');
  }
  if (typeof m.expectedDeletedAuthenticRowCount !== 'number' || m.expectedDeletedAuthenticRowCount <= 0) {
    throw new Error('Invalid manifest: expectedDeletedAuthenticRowCount must be positive number');
  }
  if (!Array.isArray(m.knownSyntheticIdHashes) || m.knownSyntheticIdHashes.length === 0) {
    throw new Error('Invalid manifest: knownSyntheticIdHashes must be non-empty array');
  }
  if (!['unavailable', 'pending_backup_restore', 'verified'].includes(m.recoveryManifestStatus)) {
    throw new Error(`Invalid manifest: recoveryManifestStatus '${m.recoveryManifestStatus}'`);
  }
  if (!INCIDENT_STATUSES.has(m.incidentStatus)) {
    throw new Error(`Invalid manifest: incidentStatus '${m.incidentStatus}'`);
  }
  if (!['incident_record', 'verified_backup_reconciliation'].includes(m.manifestSource)) {
    throw new Error(`Invalid manifest: manifestSource '${m.manifestSource}'`);
  }
  if (!Array.isArray(m.recoveredAuthenticIdHashes) || !Array.isArray(m.approvedUnexpectedIdHashes)) {
    throw new Error('Invalid manifest: hash ledgers must be arrays');
  }

  const hashLedgers: Array<[string, unknown[]]> = [
    ['knownSyntheticIdHashes', m.knownSyntheticIdHashes],
    ['recoveredAuthenticIdHashes', m.recoveredAuthenticIdHashes],
    ['approvedUnexpectedIdHashes', m.approvedUnexpectedIdHashes],
  ];
  for (const [name, values] of hashLedgers) {
    if (values.some((value) => typeof value !== 'string' || !SHA256_HEX_PATTERN.test(value))) {
      throw new Error(`Invalid manifest: ${name} must contain lowercase SHA-256 hashes`);
    }
    if (new Set(values).size !== values.length) {
      throw new Error(`Invalid manifest: ${name} contains duplicate hashes`);
    }
  }

  const syntheticHashes = new Set<string>(m.knownSyntheticIdHashes);
  if (m.recoveredAuthenticIdHashes.some((hash: string) => syntheticHashes.has(hash))) {
    throw new Error('Invalid manifest: authentic and synthetic hash ledgers overlap');
  }

  if (m.recoveryManifestStatus === 'verified') {
    if (m.manifestSource !== 'verified_backup_reconciliation') {
      throw new Error('Invalid verified manifest: source must be verified_backup_reconciliation');
    }
    if (
      typeof m.reviewedAt !== 'string' ||
      !Number.isFinite(Date.parse(m.reviewedAt)) ||
      typeof m.reviewedByRole !== 'string' ||
      !m.reviewedByRole.trim()
    ) {
      throw new Error('Invalid verified manifest: review metadata is required');
    }
    if (m.recoveredAuthenticIdHashes.length !== m.expectedDeletedAuthenticRowCount) {
      throw new Error('Invalid verified manifest: authentic hash count must match expected recovery count');
    }
  } else if (m.recoveredAuthenticIdHashes.length !== 0) {
    throw new Error('Invalid pending manifest: recovered authentic hashes require verified backup reconciliation');
  }

  if (m.incidentStatus === 'unrecoverable_with_approval') {
    if (
      typeof m.decisionRecordRef !== 'string' ||
      !m.decisionRecordRef.trim() ||
      typeof m.reviewedAt !== 'string' ||
      !Number.isFinite(Date.parse(m.reviewedAt)) ||
      typeof m.reviewedByRole !== 'string' ||
      !m.reviewedByRole.trim()
    ) {
      throw new Error('Invalid unrecoverable decision: decision record and review metadata are required');
    }
  }
  return m as KundaliIncidentManifest;
}

export function evaluateRecoveryState(
  manifest: KundaliIncidentManifest,
  rows: BirthProfileRowForAudit[],
  deriveDenormalizedFields: DeriveFn,
  validateChart: (chart: unknown) => boolean = isValidAstroChart
): KundaliRecoveryAuditResult {
  // Validate manifest structure strictly
  validateManifest(manifest);

  const knownSyntheticSet = new Set(manifest.knownSyntheticIdHashes);
  const verifiedAuthenticSet = new Set(manifest.recoveredAuthenticIdHashes);
  const approvedUnexpectedSet = new Set(manifest.approvedUnexpectedIdHashes || []);

  const report: KundaliRecoveryAuditResult = {
    timestamp: new Date().toISOString(),
    syntheticContainmentStatus: 'complete',
    recoveryStatus: 'pending',
    expectedRecoverableRowCount: manifest.expectedDeletedAuthenticRowCount,
    recoveredAuthenticRowCount: 0,
    unresolvedDeletedRowCount: manifest.expectedDeletedAuthenticRowCount,
    unexpectedRowCount: 0,
    duplicateOwnershipCount: 0,
    invalidOwnershipCount: 0,
    duplicatePrimaryKeyCount: 0,
    cardinalityStatus: 'pending_manifest',
    chartIntegrityStatus: 'pending_recovery',
    incidentStatus: 'containment_complete_recovery_pending',
    schemaVersionDistribution: {},
    timeUnknownDistribution: {
      known: 0,
      unknown: 0,
      invalidOrMissing: 0,
    },
    verifiedSyntheticRowCount: 0,
    denormalizedMismatchCounts: {
      rashi: 0,
      sun_rashi: 0,
      nakshatra: 0,
      nakshatra_pada: 0,
      lagna: 0,
      lagna_deg: 0,
      ayanamsa: 0,
      totalRowsWithAnyMismatch: 0,
    },
    storedSummaryDisagreesWithChartCount: 0,
    hasDiscrepancies: true,
    exitCode: 1,
  };

  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const seenOwnerPrimary = new Set<string>();

  for (const row of rows) {
    const rawId = String(row.id || '').trim();
    if (!rawId) {
      report.unexpectedRowCount++;
      continue;
    }

    if (seenIds.has(rawId)) {
      report.duplicatePrimaryKeyCount++;
    } else {
      seenIds.add(rawId);
    }

    const rowHash = crypto.createHash('sha256').update(rawId).digest('hex');
    if (seenFingerprints.has(rowHash)) {
      report.duplicatePrimaryKeyCount++;
    } else {
      seenFingerprints.add(rowHash);
    }

    // Check ownership validity
    if (!row.owner_id && !row.session_token) {
      report.invalidOwnershipCount++;
    }
    if (row.is_primary && row.owner_id) {
      const ownerKey = String(row.owner_id);
      if (seenOwnerPrimary.has(ownerKey)) {
        report.duplicateOwnershipCount++;
      } else {
        seenOwnerPrimary.add(ownerKey);
      }
    }

    // Check synthetic identification
    const isSynthetic = knownSyntheticSet.has(rowHash);
    if (isSynthetic) {
      report.verifiedSyntheticRowCount++;
    }

    // Check authentic classification
    if (manifest.recoveryManifestStatus === 'verified') {
      if (verifiedAuthenticSet.has(rowHash)) {
        report.recoveredAuthenticRowCount++;
      } else if (!isSynthetic && !approvedUnexpectedSet.has(rowHash)) {
        report.unexpectedRowCount++;
      }
    } else {
      // In pending_backup_restore or unavailable mode, rows cannot be classified as recovered
      if (!isSynthetic && !approvedUnexpectedSet.has(rowHash)) {
        report.unexpectedRowCount++;
      }
    }

    // Check chart data and schema
    const chart = row.chart_data;
    const chartContractValid = validateChart(chart);
    const sv = chart?.schemaVersion !== undefined ? String(chart.schemaVersion) : 'missing_or_legacy';
    report.schemaVersionDistribution[sv] = (report.schemaVersionDistribution[sv] || 0) + 1;

    if (typeof chart?.timeUnknown === 'boolean') {
      if (chart.timeUnknown) report.timeUnknownDistribution.unknown++;
      else report.timeUnknownDistribution.known++;
    } else {
      report.timeUnknownDistribution.invalidOrMissing++;
    }

    // Check denormalized fields
    let rowHasMismatch = false;
    if (chartContractValid) {
      const expected = deriveDenormalizedFields(chart);
      const storedLagnaDeg = row.lagna_deg != null ? Number(Number(row.lagna_deg).toFixed(2)) : null;
      const storedAyanamsa = row.ayanamsa != null ? Number(Number(row.ayanamsa).toFixed(2)) : null;

      if (row.rashi !== expected.rashi) {
        report.denormalizedMismatchCounts.rashi++;
        rowHasMismatch = true;
      }
      if (row.sun_rashi !== expected.sun_rashi) {
        report.denormalizedMismatchCounts.sun_rashi++;
        rowHasMismatch = true;
      }
      if (row.nakshatra !== expected.nakshatra) {
        report.denormalizedMismatchCounts.nakshatra++;
        rowHasMismatch = true;
      }
      if (row.nakshatra_pada !== expected.nakshatra_pada) {
        report.denormalizedMismatchCounts.nakshatra_pada++;
        rowHasMismatch = true;
      }
      if (row.lagna !== expected.lagna) {
        report.denormalizedMismatchCounts.lagna++;
        rowHasMismatch = true;
      }
      if (storedLagnaDeg !== expected.lagna_deg) {
        report.denormalizedMismatchCounts.lagna_deg++;
        rowHasMismatch = true;
      }
      if (storedAyanamsa !== expected.ayanamsa) {
        report.denormalizedMismatchCounts.ayanamsa++;
        rowHasMismatch = true;
      }

      if (rowHasMismatch) {
        report.denormalizedMismatchCounts.totalRowsWithAnyMismatch++;
        report.storedSummaryDisagreesWithChartCount++;
      }
    } else {
      report.denormalizedMismatchCounts.totalRowsWithAnyMismatch++;
      report.storedSummaryDisagreesWithChartCount++;
    }
  }

  // 1. Synthetic Containment Status
  report.syntheticContainmentStatus = report.verifiedSyntheticRowCount === 0 ? 'complete' : 'incomplete';

  // 2. Unresolved Deleted Rows
  report.unresolvedDeletedRowCount = Math.max(0, manifest.expectedDeletedAuthenticRowCount - report.recoveredAuthenticRowCount);

  // 3. Chart Integrity Status
  const hasLegacyOrMissingSchema = Object.keys(report.schemaVersionDistribution).some((k) => k !== '2');
  const hasInvalidTimeUnknown = report.timeUnknownDistribution.invalidOrMissing > 0;
  const hasSummaryMismatches = report.denormalizedMismatchCounts.totalRowsWithAnyMismatch > 0;
  const hasDuplicates = report.duplicatePrimaryKeyCount > 0 || report.duplicateOwnershipCount > 0 || report.invalidOwnershipCount > 0;

  if (rows.length === 0) {
    report.chartIntegrityStatus = 'pending_recovery';
  } else if (hasLegacyOrMissingSchema || hasInvalidTimeUnknown || hasSummaryMismatches || hasDuplicates || report.storedSummaryDisagreesWithChartCount > 0) {
    report.chartIntegrityStatus = 'discrepancies';
  } else {
    report.chartIntegrityStatus = 'clean';
  }

  // 4. Cardinality Status
  if (manifest.recoveryManifestStatus !== 'verified') {
    if (rows.length === 0) {
      report.cardinalityStatus = 'pending_manifest';
    } else if (report.unexpectedRowCount > 0 || report.duplicatePrimaryKeyCount > 0) {
      report.cardinalityStatus = 'conflicting';
    } else if (rows.length > manifest.expectedDeletedAuthenticRowCount) {
      report.cardinalityStatus = 'excess';
    } else {
      report.cardinalityStatus = 'pending_manifest';
    }
  } else {
    if (rows.length === 0) {
      report.cardinalityStatus = 'short';
    } else if (rows.length > manifest.expectedDeletedAuthenticRowCount) {
      report.cardinalityStatus = 'excess';
    } else if (report.unexpectedRowCount > 0 || report.duplicatePrimaryKeyCount > 0 || report.duplicateOwnershipCount > 0) {
      report.cardinalityStatus = 'conflicting';
    } else if (report.recoveredAuthenticRowCount < manifest.expectedDeletedAuthenticRowCount) {
      report.cardinalityStatus = 'short';
    } else if (report.recoveredAuthenticRowCount === manifest.expectedDeletedAuthenticRowCount && rows.length === manifest.expectedDeletedAuthenticRowCount) {
      report.cardinalityStatus = 'exact';
    } else {
      report.cardinalityStatus = 'conflicting';
    }
  }

  // 5. Explicit Unrecoverable Decision Record Check
  const hasExplicitUnrecoverableApproval = Boolean(
    manifest.incidentStatus === 'unrecoverable_with_approval' &&
    manifest.decisionRecordRef &&
    manifest.reviewedAt &&
    manifest.reviewedByRole
  );

  // 6. Recovery Status
  if (hasExplicitUnrecoverableApproval) {
    report.recoveryStatus = 'unrecoverable_with_approval';
  } else if (manifest.recoveryManifestStatus === 'verified' && report.cardinalityStatus === 'exact' && report.chartIntegrityStatus === 'clean') {
    report.recoveryStatus = 'recovered';
  } else if (report.recoveredAuthenticRowCount > 0 && report.recoveredAuthenticRowCount < manifest.expectedDeletedAuthenticRowCount) {
    report.recoveryStatus = 'partial';
  } else {
    report.recoveryStatus = 'pending';
  }

  // 7. Incident Status
  if (report.syntheticContainmentStatus === 'incomplete') {
    report.incidentStatus = 'containment_incomplete';
  } else if (hasExplicitUnrecoverableApproval) {
    report.incidentStatus = 'unrecoverable_with_approval';
  } else if (
    manifest.recoveryManifestStatus === 'verified' &&
    report.recoveryStatus === 'recovered' &&
    report.cardinalityStatus === 'exact' &&
    report.chartIntegrityStatus === 'clean' &&
    report.unexpectedRowCount === 0 &&
    report.verifiedSyntheticRowCount === 0
  ) {
    report.incidentStatus = 'closed_verified';
  } else if (manifest.recoveryManifestStatus === 'verified' && report.cardinalityStatus === 'exact' && report.chartIntegrityStatus === 'discrepancies') {
    report.incidentStatus = 'recovered_pending_integrity';
  } else if (report.recoveryStatus === 'partial') {
    report.incidentStatus = 'recovery_partial';
  } else {
    report.incidentStatus = 'containment_complete_recovery_pending';
  }

  // 8. Discrepancies & Exit Code
  report.hasDiscrepancies = report.incidentStatus !== 'closed_verified';
  report.exitCode = report.incidentStatus === 'closed_verified' ? 0 : 1;

  return report;
}
