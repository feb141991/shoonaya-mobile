# Non-Destructive Birth Profiles Incident Recovery Audit Report

**Timestamp**: 2026-08-29T16:50:37.488Z
**Incident ID**: `KUNDALI-DATA-INCIDENT-2026-08-29`
**Overall Incident Status**: **`containment_complete_recovery_pending`**
**Process Exit Code**: **1**

---

## 1. Governance & Recovery Ledgers

| Ledger | Status / Value | Invariant Description |
| :--- | :--- | :--- |
| **Synthetic Containment** | **`COMPLETE`** | Verified 0 synthetic fingerprints in production |
| **Authentic Data Recovery** | **`PENDING`** | Pre-incident authentic row restoration state |
| **Cardinality Status** | **`pending_manifest`** | Expected (20) vs Recovered (0) |
| **Chart Data Integrity** | **`PENDING_RECOVERY`** | Production AstroChart contract and summary agreement; pending until rows are restored |

---

## 2. Row Cardinality Accounting

- **Expected Recoverable Authentic Rows**: **20**
- **Recovered Authentic Rows**: **0**
- **Unresolved Deleted Rows**: **20**
- **Unexpected / Unclassified Rows**: **0**
- **Verified Synthetic Rows Present**: **0**
- **Duplicate Primary Keys**: **0**
- **Duplicate Owner Primary Profiles**: **0**
- **Invalid Ownership Rows**: **0**

---

## 3. Schema Version & Accuracy Distribution

- **Schema Version Distribution**:
  - *(None — table currently empty pending pre-incident backup restoration)*
- **Birth Time Accuracy (`timeUnknown`)**:
  - Known Birth Time (`timeUnknown=false`): **0**
  - Unknown Birth Time (`timeUnknown=true`): **0**
  - Missing / Malformed `timeUnknown`: **0**

---

## 4. Denormalized Column Mismatch Summary

- `rashi` mismatches: **0**
- `sun_rashi` mismatches: **0**
- `nakshatra` mismatches: **0**
- `nakshatra_pada` mismatches: **0**
- `lagna` mismatches: **0**
- `lagna_deg` mismatches: **0**
- `ayanamsa` mismatches: **0**
- **Total rows with any summary disagreement**: **0**
- **Stored summary disagrees with stored chart_data**: **0**
