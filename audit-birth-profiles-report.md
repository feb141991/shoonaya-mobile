# Non-Destructive Birth Profiles Data-Integrity Audit Report

**Timestamp**: 2026-08-29T13:49:30.670Z
**Total Birth Profiles**: 4
**Integrity Status**: DISCREPANCIES DETECTED

---

## 1. Schema Version Distribution
- Schema v2: **4** rows

---

## 2. Birth Time Accuracy (`timeUnknown`) Distribution
- Known Birth Time (`timeUnknown=false`): **2**
- Unknown Birth Time (`timeUnknown=true`): **2**
- Missing / Malformed `timeUnknown`: **0**

---

## 3. Synthetic / Test-Row Indicators
- Identified synthetic or test-created rows: **4**

---

## 4. Denormalized Column Mismatch Summary
- `rashi` mismatches: **0**
- `sun_rashi` mismatches: **0**
- `nakshatra` mismatches: **0**
- `nakshatra_pada` mismatches: **2**
- `lagna` mismatches: **2**
- `lagna_deg` mismatches: **4**
- `ayanamsa` mismatches: **2**
- **Total rows with any mismatch**: **4**

---

## 5. Engine Agreement
- Stored summary disagrees with stored chart_data: **4**
