---
name: migration-preflight
description: Procedure for preparing a Supabase migration that a Native change depends on — writing it with its rollback, running the mandatory root-cause and risk pre-flight, auditing callers in both repositories, and asking for approval. Use whenever a change needs a new or altered table, column, function, policy or grant.
---

# Migration pre-flight procedure

Migrations live in the backend repository (`../Sanatan Sangam/Shoonaya`). Section 1 of `AGENTS.md`: a Native change
that touches a backend contract is audited in both repositories.

**Never** run `supabase db push` (production has history drift; it would apply every unapplied migration). Never
apply anything without the founder's explicit approval for that specific migration.

## 1. Write it

- `supabase/migrations/<YYYYMMDDHHMMSS>_<name>.sql`, and in the same change
  `supabase/rollbacks/<same timestamp>_<name>_rollback.sql`.
- Redefining a function with any change to argument names, types, defaults or order: add
  `DROP FUNCTION IF EXISTS <old exact signature>;` in the same migration (PostgREST `PGRST203` otherwise).
- New tables: RLS enabled, policies from `auth.uid()`, explicit grants, `SECURITY DEFINER` functions with
  `SET search_path`.
- Private writes: idempotent and protected by a unique or check constraint, not only application code.
- No blanket updates that overwrite opt-outs (`WHERE col = false OR col IS NULL`). Backfills only touch rows that
  have never had a value set, and need pre-flight counts first.
- Large live tables: `CREATE INDEX CONCURRENTLY` (in its own migration, outside a transaction), no
  `ADD COLUMN ... NOT NULL` without a default.

## 2. Callers

- `rg` this repository for every object touched; installed Native builds keep calling the old shape until they
  update, and an OTA update cannot help a build that is not updated.
- `rg` the backend for routes, cron jobs and edge functions.
- Regenerate types in the backend and update any Native type that mirrors them.

## 3. Pre-flight review

Run the `shoonaya-migration-preflight-reviewer` agent on the migration. Fix every FAIL before asking.

## 4. Verify in the backend (local only)

```bash
cd "../Sanatan Sangam/Shoonaya"
npm run test:migration-drift
npm run verify:migrations:linked
```

Test against a Supabase branch or shadow database before production when the migration touches calendar data
(section 2).

## 5. Ask for approval

Present the reviewer's report (all five checks), the rollback file, the pre-flight count query, and which environments
have and have not got it applied. Then wait.

## 6. After the founder applies it

Record the applied migration id and time, rerun `verify:migrations:linked`, and report applied vs unapplied
environments. Committing the migration file is not applying it.
