import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'crypto';
import {
  evaluateRecoveryState as evaluateRecoveryStateProduction,
  validateManifest,
  type KundaliIncidentManifest,
  type BirthProfileRowForAudit,
} from '../lib/kundali-recovery-evaluator';

describe('Pure Kundali Recovery Evaluator & Governance Invariants', () => {
  const mockDerive = (chart: any) => ({
    rashi: chart?.moonRashi ?? 'Mesha',
    sun_rashi: chart?.sunRashi ?? 'Mesha',
    nakshatra: chart?.nakshatra ?? 'Ashwini',
    nakshatra_pada: chart?.pada ?? 1,
    lagna: chart?.lagnaRashi ?? 'Vrishabha',
    lagna_deg: chart?.lagnaDeg ?? 15.5,
    ayanamsa: chart?.ayanamsa ?? 24.1,
  });

  const baseManifest: KundaliIncidentManifest = {
    schemaVersion: 1,
    incidentId: 'KUNDALI-DATA-INCIDENT-2026-08-29',
    incidentStatus: 'containment_complete_recovery_pending',
    expectedDeletedAuthenticRowCount: 20,
    knownSyntheticIdHashes: [
      '72d82562a35c5b7bc7293035490a675e29f076eb2cb292c773daafec9fec5847',
      'e0e7e0d775b923c89f9d63703bfff27f801b4bac2bc75a3a05840b69951f871a',
      'e4a33610b4bcf296016b33125d900fbc9673ef36ef21c3b4fc74b53c97dc510e',
      'b4700c0019ccaa0f18b79edb4a5e2c2ea63116cab202e2a3b881042ae0a653b4',
    ],
    recoveryManifestStatus: 'pending_backup_restore',
    recoveredAuthenticIdHashes: [],
    approvedUnexpectedIdHashes: [],
    manifestSource: 'incident_record',
    decisionRecordRef: null,
    reviewedAt: null,
    reviewedByRole: null,
  };

  const evaluateRecoveryState = (
    manifest: KundaliIncidentManifest,
    rows: BirthProfileRowForAudit[],
    derive: typeof mockDerive
  ) => evaluateRecoveryStateProduction(manifest, rows, derive, () => true);

  const verifiedManifest = (
    hashes: string[],
    expectedDeletedAuthenticRowCount = 20
  ): KundaliIncidentManifest => ({
    ...baseManifest,
    expectedDeletedAuthenticRowCount,
    recoveryManifestStatus: 'verified',
    recoveredAuthenticIdHashes: hashes,
    manifestSource: 'verified_backup_reconciliation',
    reviewedAt: '2026-08-29T16:00:00Z',
    reviewedByRole: 'Recovery reviewer',
  });

  const hashesFor = (count: number, prefix = 'auth') =>
    Array.from({ length: count }, (_, i) =>
      crypto.createHash('sha256').update(`${prefix}-${i}`).digest('hex')
    );

  const createValidRow = (id: string, ownerId: string = 'user-1', isPrimary: boolean = false): BirthProfileRowForAudit => ({
    id,
    owner_id: ownerId,
    is_primary: isPrimary,
    rashi: 'Mesha',
    sun_rashi: 'Mesha',
    nakshatra: 'Ashwini',
    nakshatra_pada: 1,
    lagna: 'Vrishabha',
    lagna_deg: 15.5,
    ayanamsa: 24.1,
    chart_data: {
      schemaVersion: 2,
      timeUnknown: false,
      moonRashi: 'Mesha',
      sunRashi: 'Mesha',
      nakshatra: 'Ashwini',
      pada: 1,
      lagnaRashi: 'Vrishabha',
      lagnaDeg: 15.5,
      ayanamsa: 24.1,
    },
  });

  it('1. Empty table + 20 unresolved -> pending, nonzero exitCode', () => {
    const result = evaluateRecoveryState(baseManifest, [], mockDerive);

    assert.equal(result.syntheticContainmentStatus, 'complete');
    assert.equal(result.recoveryStatus, 'pending');
    assert.equal(result.expectedRecoverableRowCount, 20);
    assert.equal(result.recoveredAuthenticRowCount, 0);
    assert.equal(result.unresolvedDeletedRowCount, 20);
    assert.equal(result.cardinalityStatus, 'pending_manifest');
    assert.equal(result.chartIntegrityStatus, 'pending_recovery');
    assert.equal(result.incidentStatus, 'containment_complete_recovery_pending');
    assert.equal(result.hasDiscrepancies, true);
    assert.equal(result.exitCode, 1);
  });

  it('2. Four known synthetic rows -> containment incomplete, nonzero exitCode', () => {
    // Generate IDs matching synthetic hashes in baseManifest
    const syntheticHash1 = baseManifest.knownSyntheticIdHashes[0];
    const syntheticId1 = 'synth-row-1';
    const manifestWithId: KundaliIncidentManifest = {
      ...baseManifest,
      knownSyntheticIdHashes: [crypto.createHash('sha256').update(syntheticId1).digest('hex')],
    };
    const rows = [createValidRow(syntheticId1, 'user-s')];
    const result = evaluateRecoveryState(manifestWithId, rows, mockDerive);

    assert.equal(result.syntheticContainmentStatus, 'incomplete');
    assert.equal(result.verifiedSyntheticRowCount, 1);
    assert.equal(result.incidentStatus, 'containment_incomplete');
    assert.equal(result.exitCode, 1);
  });

  it('3. Zero synthetic rows but no verified backup manifest -> pending, nonzero exitCode', () => {
    const rows = Array.from({ length: 20 }, (_, i) => createValidRow(`row-${i}`, `user-${i}`));
    const result = evaluateRecoveryState(baseManifest, rows, mockDerive);

    assert.equal(result.syntheticContainmentStatus, 'complete');
    assert.equal(result.recoveryStatus, 'pending');
    assert.equal(result.incidentStatus, 'containment_complete_recovery_pending');
    assert.equal(result.exitCode, 1);
  });

  it('4. One verified authentic row of 20 -> partial, nonzero exitCode', () => {
    const row0 = createValidRow('auth-0', 'user-0');
    const hash0 = crypto.createHash('sha256').update('auth-0').digest('hex');
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryState(manifest, [row0], mockDerive);

    assert.equal(result.recoveredAuthenticRowCount, 1);
    assert.equal(result.unresolvedDeletedRowCount, 19);
    assert.equal(result.recoveryStatus, 'partial');
    assert.equal(result.cardinalityStatus, 'short');
    assert.equal(result.incidentStatus, 'recovery_partial');
    assert.equal(result.exitCode, 1);
  });

  it('5. Nineteen verified authentic rows -> partial, nonzero exitCode', () => {
    const rows = Array.from({ length: 19 }, (_, i) => createValidRow(`auth-${i}`, `user-${i}`));
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryState(manifest, rows, mockDerive);

    assert.equal(result.recoveredAuthenticRowCount, 19);
    assert.equal(result.unresolvedDeletedRowCount, 1);
    assert.equal(result.recoveryStatus, 'partial');
    assert.equal(result.cardinalityStatus, 'short');
    assert.equal(result.incidentStatus, 'recovery_partial');
    assert.equal(result.exitCode, 1);
  });

  it('6. Exactly 20 verified authentic rows -> eligible for integrity checks (cardinality exact)', () => {
    const rows = Array.from({ length: 20 }, (_, i) => createValidRow(`auth-${i}`, `user-${i}`));
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryState(manifest, rows, mockDerive);

    assert.equal(result.recoveredAuthenticRowCount, 20);
    assert.equal(result.unresolvedDeletedRowCount, 0);
    assert.equal(result.cardinalityStatus, 'exact');
    assert.equal(result.chartIntegrityStatus, 'clean');
  });

  it('7. Exactly 20 rows with one unknown fingerprint -> conflicting, nonzero exitCode', () => {
    const rows = Array.from({ length: 20 }, (_, i) =>
      createValidRow(i === 19 ? 'unknown-row' : `auth-${i}`, `user-${i}`)
    );
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryState(manifest, rows, mockDerive);

    assert.equal(result.unexpectedRowCount, 1);
    assert.equal(result.cardinalityStatus, 'conflicting');
    assert.equal(result.exitCode, 1);
  });

  it('8. Twenty-one rows -> excess, nonzero exitCode', () => {
    const rows = Array.from({ length: 21 }, (_, i) => createValidRow(`auth-${i}`, `user-${i}`));
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryState(manifest, rows, mockDerive);

    assert.equal(result.cardinalityStatus, 'excess');
    assert.equal(result.exitCode, 1);
  });

  it('9. Duplicate fingerprint/primary-key representation -> conflicting, nonzero exitCode', () => {
    const rows = [
      createValidRow('dup-id', 'user-1'),
      createValidRow('dup-id', 'user-2'),
    ];
    const hash = crypto.createHash('sha256').update('dup-id').digest('hex');
    const secondHash = crypto.createHash('sha256').update('missing-id').digest('hex');
    const manifest = verifiedManifest([hash, secondHash], 2);
    const result = evaluateRecoveryState(manifest, rows, mockDerive);

    assert.ok(result.duplicatePrimaryKeyCount > 0);
    assert.equal(result.cardinalityStatus, 'conflicting');
    assert.equal(result.exitCode, 1);
  });

  it('10. Duplicate or invalid ownership aggregate -> nonzero exitCode', () => {
    const row1 = createValidRow('row-1', 'user-same', true);
    const row2 = createValidRow('row-2', 'user-same', true); // Two primary charts for same owner
    const hashes = [
      crypto.createHash('sha256').update('row-1').digest('hex'),
      crypto.createHash('sha256').update('row-2').digest('hex'),
    ];
    const manifest = verifiedManifest(hashes, 2);
    const result = evaluateRecoveryState(manifest, [row1, row2], mockDerive);

    assert.equal(result.duplicateOwnershipCount, 1);
    assert.equal(result.chartIntegrityStatus, 'discrepancies');
    assert.equal(result.exitCode, 1);
  });

  it('11. Valid cardinality but chart mismatch -> recovered_pending_integrity, nonzero exitCode', () => {
    const rows = Array.from({ length: 20 }, (_, i) => createValidRow(`auth-${i}`, `user-${i}`));
    rows[0].rashi = 'MismatchedRashi'; // Corrupt denormalized summary
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryState(manifest, rows, mockDerive);

    assert.equal(result.cardinalityStatus, 'exact');
    assert.equal(result.chartIntegrityStatus, 'discrepancies');
    assert.equal(result.incidentStatus, 'recovered_pending_integrity');
    assert.equal(result.exitCode, 1);
  });

  it('12. Complete verified recovery with clean integrity -> closed_verified, zero exitCode', () => {
    const rows = Array.from({ length: 20 }, (_, i) => createValidRow(`auth-${i}`, `user-${i}`, true));
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryState(manifest, rows, mockDerive);

    assert.equal(result.cardinalityStatus, 'exact');
    assert.equal(result.chartIntegrityStatus, 'clean');
    assert.equal(result.recoveryStatus, 'recovered');
    assert.equal(result.incidentStatus, 'closed_verified');
    assert.equal(result.hasDiscrepancies, false);
    assert.equal(result.exitCode, 0);
  });

  it('13. Missing or malformed manifest fails closed with error', () => {
    assert.throws(() => validateManifest(null), /Invalid manifest/);
    assert.throws(() => validateManifest({ schemaVersion: 2 }), /Unsupported manifest schemaVersion/);
    assert.throws(() => validateManifest({ schemaVersion: 1, incidentId: '' }), /missing incidentId/);
    assert.throws(
      () => evaluateRecoveryState({} as any, [], mockDerive),
      /Unsupported manifest schemaVersion/
    );
  });

  it('14. Unreviewed unrecoverable claim is rejected; requires explicit decision record and review fields', () => {
    const unreviewedManifest: KundaliIncidentManifest = {
      ...baseManifest,
      incidentStatus: 'unrecoverable_with_approval',
      decisionRecordRef: null, // Missing decision record ref
      reviewedAt: null,
      reviewedByRole: null,
    };
    assert.throws(
      () => evaluateRecoveryState(unreviewedManifest, [], mockDerive),
      /Invalid unrecoverable decision/
    );

    const reviewedManifest: KundaliIncidentManifest = {
      ...baseManifest,
      incidentStatus: 'unrecoverable_with_approval',
      decisionRecordRef: 'docs/remediation/decision-records/KUNDALI-LOSS-ADJUDICATION.md',
      reviewedAt: '2026-08-29T16:00:00Z',
      reviewedByRole: 'Founder / Legal Counsel',
    };
    const reviewedResult = evaluateRecoveryState(reviewedManifest, [], mockDerive);
    assert.equal(reviewedResult.incidentStatus, 'unrecoverable_with_approval');
    assert.equal(reviewedResult.recoveryStatus, 'unrecoverable_with_approval');
  });

  it('15. Verified recovery cannot be self-declared without backup provenance and review metadata', () => {
    const hashes = hashesFor(20);
    assert.throws(
      () => validateManifest({
        ...baseManifest,
        recoveryManifestStatus: 'verified',
        recoveredAuthenticIdHashes: hashes,
      }),
      /source must be verified_backup_reconciliation/
    );
    assert.throws(
      () => validateManifest({
        ...verifiedManifest(hashes),
        reviewedAt: null,
      }),
      /review metadata is required/
    );
    assert.throws(
      () => validateManifest(verifiedManifest(hashes.slice(0, 19))),
      /authentic hash count must match expected recovery count/
    );
  });

  it('16. Hash ledgers reject malformed, duplicate, and synthetic-overlapping fingerprints', () => {
    assert.throws(
      () => validateManifest({ ...baseManifest, knownSyntheticIdHashes: ['not-a-sha'] }),
      /lowercase SHA-256 hashes/
    );
    const duplicate = hashesFor(1)[0];
    assert.throws(
      () => validateManifest({ ...baseManifest, knownSyntheticIdHashes: [duplicate, duplicate] }),
      /duplicate hashes/
    );
    const synthetic = baseManifest.knownSyntheticIdHashes[0];
    assert.throws(
      () => validateManifest(verifiedManifest([synthetic, ...hashesFor(19)])),
      /hash ledgers overlap/
    );
  });

  it('17. Guest ownership uses the persisted session_token column, not chart payload metadata', () => {
    const withDatabaseToken = createValidRow('guest-db-token', null as any);
    withDatabaseToken.session_token = 'guest-session';
    const accepted = evaluateRecoveryState(baseManifest, [withDatabaseToken], mockDerive);
    assert.equal(accepted.invalidOwnershipCount, 0);

    const withPayloadToken = createValidRow('guest-payload-token', null as any);
    withPayloadToken.chart_data.sessionToken = 'not-the-database-column';
    const rejected = evaluateRecoveryState(baseManifest, [withPayloadToken], mockDerive);
    assert.equal(rejected.invalidOwnershipCount, 1);
  });

  it('18. Default evaluation invokes the production AstroChart contract validator', () => {
    const rows = Array.from({ length: 20 }, (_, i) => createValidRow(`auth-${i}`, `user-${i}`));
    const manifest = verifiedManifest(hashesFor(20));
    const result = evaluateRecoveryStateProduction(manifest, rows, mockDerive);

    assert.equal(result.cardinalityStatus, 'exact');
    assert.equal(result.chartIntegrityStatus, 'discrepancies');
    assert.equal(result.incidentStatus, 'recovered_pending_integrity');
    assert.equal(result.exitCode, 1);
  });

  it('19. Unrecoverable approval rejects malformed review timestamps', () => {
    assert.throws(
      () => validateManifest({
        ...baseManifest,
        incidentStatus: 'unrecoverable_with_approval',
        decisionRecordRef: 'docs/remediation/decision.md',
        reviewedAt: 'not-a-date',
        reviewedByRole: 'Founder',
      }),
      /Invalid unrecoverable decision/
    );
  });
});
