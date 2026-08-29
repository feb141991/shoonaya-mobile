# Kundali Data Incident — 2026-08-29

## Confirmed Impact

A service-role reset script deleted 20 existing rows from `birth_profiles` and inserted four deterministic synthetic rows. The reset script was subsequently deleted from the codebase.

## Current State & Status

**Status**: **Containment completed; authentic-data recovery pending.**

### Verified Facts:
1. **20 pre-incident authentic rows** were deleted by the legacy reset script.
2. **4 synthetic rows** were subsequently removed via scoped, non-reversible SHA-256 fingerprint matching.
3. **Production currently contains zero `birth_profiles` rows** (18 user profiles and 20 auth users exist).
4. **Synthetic containment is complete** (0 synthetic rows remain in production).
5. **Authentic-data recovery is NOT complete** (0 of 20 authentic rows have been restored).

---

## Recovery Protocol & Mandatory Gates

1. **Authentic Source Requirement**: Authentic user data may only be recovered from a verified Supabase backup or Point-in-Time Recovery (PITR) snapshot predating the incident. Synthetic reconstruction, manual guessing, screenshots, or client-side caches are strictly prohibited as recovery sources.
2. **Isolated Environment Rule**: Restoration must take place in an isolated database/branch. Never restore or test restoration directly against the production database. Do not execute direct deletion or quarantine SQL against production without reviewed transaction plans and isolated verification.
3. **Founder Authorization**: Creation of any paid Supabase branch, project, or infrastructure requires explicit founder approval.
4. **Zero PII Guarantee**: All audit manifests, reconciliation records, reports, fixtures, and execution scripts must identify rows strictly via immutable primary keys and SHA-256 fingerprints. No names, DOBs, birth times, coordinates, emails, user IDs, or chart payloads may be emitted or stored.
5. **Incident Closure Gate**: This incident will remain **OPEN** until all 20 authentic rows are restored and verified against canonical AstroChart schema v2 with derived summary agreement, or formally declared unrecoverable via founder/legal approval.
