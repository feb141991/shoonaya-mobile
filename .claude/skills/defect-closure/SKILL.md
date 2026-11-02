---
name: defect-closure
description: Procedure for closing a defect found by a tester, a device or production in the Shoonaya Native app — confirm the cause, fix the class with a repo-wide sweep, prove a guard test red then green, and record the rule. Use when fixing any reported bug, not only the one instance.
---

# Defect closure procedure (`AGENTS.md` section 13)

A reported defect is not closed by fixing the instance. All of the following land in the same change.

## 1. Find the cause before naming it

Read the logs, the database rows or the server response that show it. Name the cause with that evidence. If you
could not see evidence, say the cause is unconfirmed.

## 2. Fix the class

Describe the defect as a pattern (for example "a Supabase read whose `error` is ignored", "a typed date sent as raw
text", "a `Text` in a row without `flex: 1`"). Search the whole repository for that pattern. For each hit:

- read the surrounding code before calling it a bug: a grep match is a candidate, not a confirmed defect;
- classify what its failure changes for a user (a wrong date, lost progress, a blank label);
- fix it, or record why it needs no change.

Report the sweep: the search used, every hit, and fixed / not a bug (with reason).

## 3. Guard test

Add or extend a test under `__tests__/` that fails without the fix. Prove it: revert the fix, run the test, show it
fail, restore the fix, show it pass.

```bash
npx tsx --test __tests__/<name>.test.ts
```

Assert what the result is (status, count, which rows), not only that something exists.

## 4. Record the rule

Add or amend a section of `AGENTS.md`: the rule, then "Why this rule exists" with the date, the symptom, the cause and
the guard test. If the defect touched a backend contract, do the same in the backend repository.

## 5. Report

- Changed files, and proof unrelated dirty files were not staged.
- Tests: passed / failed / skipped.
- What was and was not verified on a device (a green suite does not show a screen is usable).
