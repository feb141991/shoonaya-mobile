# Synthetic Data Containment Procedure & Verification Record

**Incident ID**: `KUNDALI-DATA-INCIDENT-2026-08-29`  
**Record Type**: Containment Verification Record  
**Incident Status**: **`OPEN`** (`containment_complete_recovery_pending`)  

---

## 1. Evidentiary Scope & Distinctions

This document records the reproducible containment procedure and live verification outcome for the removal of four synthetic rows from `birth_profiles`.

To maintain strict evidentiary integrity, the following distinctions apply:
1. **Procedure Reconstructed in Repository**: The atomic transaction procedure below was designed and verified to isolate and delete only the four verified synthetic IDs without touching authentic records.
2. **Live Aggregate Outcome Verified**: Independent execution of the read-only aggregate auditor confirmed that 0 synthetic fingerprints remain in production.
3. **Execution Metadata Unavailable**: Direct database request/transaction identifiers, engine WAL offsets, and pre/post query execution timestamps were **not captured** by the database connection at execution time.
4. **Target Hash Manifest**: The SHA-256 fingerprints below represent the audited target IDs identified from the legacy reset script, not captured database telemetry receipts.

---

## 2. Audited Target Synthetic Fingerprints (SHA-256)

1. `72d82562a35c5b7bc7293035490a675e29f076eb2cb292c773daafec9fec5847`
2. `e0e7e0d775b923c89f9d63703bfff27f801b4bac2bc75a3a05840b69951f871a`
3. `e4a33610b4bcf296016b33125d900fbc9673ef36ef21c3b4fc74b53c97dc510e`
4. `b4700c0019ccaa0f18b79edb4a5e2c2ea63116cab202e2a3b881042ae0a653b4`

---

## 3. Reproducible Containment Transaction SQL

```sql
BEGIN;

-- 1. Create a transient staging table within session scope (no public exposure)
CREATE TEMP TABLE _synthetic_quarantine (
  id uuid PRIMARY KEY,
  id_sha256 text NOT NULL,
  quarantined_at timestamptz DEFAULT now()
) ON COMMIT DROP;

-- 2. Stage verified synthetic rows matching the exact audited SHA-256 fingerprints
INSERT INTO _synthetic_quarantine (id, id_sha256)
SELECT id, encode(digest(id::text, 'sha256'), 'hex')
FROM birth_profiles
WHERE encode(digest(id::text, 'sha256'), 'hex') IN (
  '72d82562a35c5b7bc7293035490a675e29f076eb2cb292c773daafec9fec5847',
  'e0e7e0d775b923c89f9d63703bfff27f801b4bac2bc75a3a05840b69951f871a',
  'e4a33610b4bcf296016b33125d900fbc9673ef36ef21c3b4fc74b53c97dc510e',
  'b4700c0019ccaa0f18b79edb4a5e2c2ea63116cab202e2a3b881042ae0a653b4'
);

-- 3. Assert exact staged cardinality (Must equal exactly 4 rows)
DO $$
DECLARE
  v_staged_count integer;
BEGIN
  SELECT count(*) INTO v_staged_count FROM _synthetic_quarantine;
  IF v_staged_count <> 4 THEN
    RAISE EXCEPTION 'Safety Assertion Failed: Staged synthetic count (%) does not match expected (4). Aborting.', v_staged_count;
  END IF;
END $$;

-- 4. Safely remove synthetic rows from birth_profiles
DELETE FROM birth_profiles
WHERE id IN (SELECT id FROM _synthetic_quarantine);

-- 5. Final assertion: verify zero synthetic rows remain
DO $$
DECLARE
  v_remaining_synthetic integer;
BEGIN
  SELECT count(*) INTO v_remaining_synthetic
  FROM birth_profiles
  WHERE encode(digest(id::text, 'sha256'), 'hex') IN (
    '72d82562a35c5b7bc7293035490a675e29f076eb2cb292c773daafec9fec5847',
    'e0e7e0d775b923c89f9d63703bfff27f801b4bac2bc75a3a05840b69951f871a',
    'e4a33610b4bcf296016b33125d900fbc9673ef36ef21c3b4fc74b53c97dc510e',
    'b4700c0019ccaa0f18b79edb4a5e2c2ea63116cab202e2a3b881042ae0a653b4'
  );
  IF v_remaining_synthetic <> 0 THEN
    RAISE EXCEPTION 'Safety Assertion Failed: Synthetic rows still present (%). Aborting.', v_remaining_synthetic;
  END IF;
END $$;

COMMIT;
```

---

## 4. Rollback & Recovery Limitations

* **Rollback Scope**: A deletion rollback or script cannot recreate authentic user data.
* **Authentic Recovery Requirement**: The original 20 authentic rows remain deleted. Recovery of authentic data requires restoring from a verified pre-incident Supabase backup or Point-in-Time Recovery (PITR) snapshot into an isolated project/branch, reconciling the data, and staging reviewed recovery SQL.
