/**
 * ─────────────────────────────────────────────────────────────────────────────
 * Non-Destructive Birth Profiles Data-Integrity & Recovery Auditor
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * READ-ONLY auditor that aggregates metrics across `birth_profiles`:
 * - Consumes the versioned governance manifest (`docs/remediation/kundali-incident-recovery-manifest.json`)
 * - Evaluates current state via pure evaluator (`lib/kundali-recovery-evaluator.ts`)
 * - Enforces separate containment, recovery, cardinality, and chart-integrity ledgers
 * - Emits ONLY aggregate numbers and SHA-256 fingerprints, zero row-level PII
 * - Writes reports atomically (`.tmp` -> rename) so partial evaluations cannot corrupt reports
 * - Fails non-zero while authentic-data recovery remains pending
 * ─────────────────────────────────────────────────────────────────────────────
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import {
  evaluateRecoveryState,
  validateManifest,
  type KundaliIncidentManifest,
  type KundaliRecoveryAuditResult,
  type BirthProfileRowForAudit,
} from '../lib/kundali-recovery-evaluator';

export const MANIFEST_PATH = path.resolve(
  __dirname,
  '../docs/remediation/kundali-incident-recovery-manifest.json'
);

export function loadManifest(): KundaliIncidentManifest {
  if (!fs.existsSync(MANIFEST_PATH)) {
    throw new Error(`Incident recovery manifest not found at ${MANIFEST_PATH}`);
  }
  const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const parsed = JSON.parse(content);
  return validateManifest(parsed);
}

export function formatReportMarkdown(report: KundaliRecoveryAuditResult, manifest: KundaliIncidentManifest): string {
  return `# Non-Destructive Birth Profiles Incident Recovery Audit Report

**Timestamp**: ${report.timestamp}
**Incident ID**: \`${manifest.incidentId}\`
**Overall Incident Status**: **\`${report.incidentStatus}\`**
**Process Exit Code**: **${report.exitCode}**

---

## 1. Governance & Recovery Ledgers

| Ledger | Status / Value | Invariant Description |
| :--- | :--- | :--- |
| **Synthetic Containment** | **\`${report.syntheticContainmentStatus.toUpperCase()}\`** | Verified 0 synthetic fingerprints in production |
| **Authentic Data Recovery** | **\`${report.recoveryStatus.toUpperCase()}\`** | Pre-incident authentic row restoration state |
| **Cardinality Status** | **\`${report.cardinalityStatus}\`** | Expected (${report.expectedRecoverableRowCount}) vs Recovered (${report.recoveredAuthenticRowCount}) |
| **Chart Data Integrity** | **\`${report.chartIntegrityStatus.toUpperCase()}\`** | Production AstroChart contract and summary agreement; pending until rows are restored |

---

## 2. Row Cardinality Accounting

- **Expected Recoverable Authentic Rows**: **${report.expectedRecoverableRowCount}**
- **Recovered Authentic Rows**: **${report.recoveredAuthenticRowCount}**
- **Unresolved Deleted Rows**: **${report.unresolvedDeletedRowCount}**
- **Unexpected / Unclassified Rows**: **${report.unexpectedRowCount}**
- **Verified Synthetic Rows Present**: **${report.verifiedSyntheticRowCount}**
- **Duplicate Primary Keys**: **${report.duplicatePrimaryKeyCount}**
- **Duplicate Owner Primary Profiles**: **${report.duplicateOwnershipCount}**
- **Invalid Ownership Rows**: **${report.invalidOwnershipCount}**

---

## 3. Schema Version & Accuracy Distribution

- **Schema Version Distribution**:
${
  Object.keys(report.schemaVersionDistribution).length > 0
    ? Object.entries(report.schemaVersionDistribution)
        .map(([k, v]) => `  - Schema v${k}: **${v}** rows`)
        .join('\n')
    : '  - *(None — table currently empty pending pre-incident backup restoration)*'
}
- **Birth Time Accuracy (\`timeUnknown\`)**:
  - Known Birth Time (\`timeUnknown=false\`): **${report.timeUnknownDistribution.known}**
  - Unknown Birth Time (\`timeUnknown=true\`): **${report.timeUnknownDistribution.unknown}**
  - Missing / Malformed \`timeUnknown\`: **${report.timeUnknownDistribution.invalidOrMissing}**

---

## 4. Denormalized Column Mismatch Summary

- \`rashi\` mismatches: **${report.denormalizedMismatchCounts.rashi}**
- \`sun_rashi\` mismatches: **${report.denormalizedMismatchCounts.sun_rashi}**
- \`nakshatra\` mismatches: **${report.denormalizedMismatchCounts.nakshatra}**
- \`nakshatra_pada\` mismatches: **${report.denormalizedMismatchCounts.nakshatra_pada}**
- \`lagna\` mismatches: **${report.denormalizedMismatchCounts.lagna}**
- \`lagna_deg\` mismatches: **${report.denormalizedMismatchCounts.lagna_deg}**
- \`ayanamsa\` mismatches: **${report.denormalizedMismatchCounts.ayanamsa}**
- **Total rows with any summary disagreement**: **${report.denormalizedMismatchCounts.totalRowsWithAnyMismatch}**
- **Stored summary disagrees with stored chart_data**: **${report.storedSummaryDisagreesWithChartCount}**
`;
}

export async function runAudit(): Promise<{ report: KundaliRecoveryAuditResult; manifest: KundaliIncidentManifest }> {
  const manifest = loadManifest();

  const NATIVE_ROOT = path.resolve(__dirname, '..');
  const BACKEND_ROOT = path.resolve(NATIVE_ROOT, '../Sanatan Sangam/Shoonaya');

  const envPath = path.join(BACKEND_ROOT, '.env.local');
  const envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || envContent.match(/NEXT_PUBLIC_SUPABASE_URL=["']?([^"'\n]+)/)?.[1]?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || envContent.match(/SUPABASE_SERVICE_ROLE_KEY=["']?([^"'\n]+)/)?.[1]?.trim();

  if (!url || !key) {
    throw new Error('Missing Supabase credentials.');
  }

  const db = createClient(url, key);
  const { deriveDenormalizedBirthProfileFields } = require(
    path.join(BACKEND_ROOT, 'src/lib/jyotish/astro-engine.ts')
  );

  const { data: rows, error } = await db.from('birth_profiles').select('*');
  if (error) {
    throw new Error(`Failed to read birth_profiles: ${error.message}`);
  }

  const report = evaluateRecoveryState(manifest, (rows ?? []) as BirthProfileRowForAudit[], deriveDenormalizedBirthProfileFields);
  return { report, manifest };
}

export function writeReportAtomically(report: KundaliRecoveryAuditResult, manifest: KundaliIncidentManifest): void {
  const mdContent = formatReportMarkdown(report, manifest);
  const jsonContent = JSON.stringify(report, null, 2);

  const mdPath = path.resolve(__dirname, '../audit-birth-profiles-report.md');
  const jsonPath = path.resolve(__dirname, '../audit-birth-profiles-report.json');

  const tmpMdPath = `${mdPath}.tmp-${Date.now()}`;
  const tmpJsonPath = `${jsonPath}.tmp-${Date.now()}`;

  fs.writeFileSync(tmpMdPath, mdContent, 'utf8');
  fs.writeFileSync(tmpJsonPath, jsonContent, 'utf8');

  fs.renameSync(tmpMdPath, mdPath);
  fs.renameSync(tmpJsonPath, jsonPath);
}

if (require.main === module) {
  runAudit()
    .then(({ report, manifest }) => {
      const md = formatReportMarkdown(report, manifest);
      console.log(md);
      writeReportAtomically(report, manifest);

      if (report.exitCode === 0) {
        console.log('\n[Auditor Result]: All expected authentic rows verified cleanly. Incident recovery verified.');
        process.exit(0);
      } else {
        console.error(
          `\n[Auditor Result]: Recovery incomplete or discrepancies present. Status: ${report.incidentStatus} (recoveryStatus: ${report.recoveryStatus}, unresolvedDeletedRows: ${report.unresolvedDeletedRowCount}, exitCode: ${report.exitCode})`
        );
        process.exit(report.exitCode);
      }
    })
    .catch((err) => {
      console.error('Audit execution error:', err);
      process.exit(1);
    });
}
