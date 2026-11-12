// The lint gate's rules, kept free of any I/O so they can be tested (see scripts/check-lint-ratchet.ts and
// AGENTS.md, "Lint is a gate, and its warnings only ratchet down").
//
// An ESLint ERROR fails the gate outright. A WARNING is a check the repo already breaks somewhere: its count per
// rule is recorded in lint-baseline.json and may only go down, so existing debt is visible and cannot grow.

export type RuleCounts = Record<string, number>;

export type EslintMessage = { ruleId: string | null; severity: number; line?: number; message: string };
export type EslintFileResult = { filePath: string; messages: EslintMessage[] };

// A baseline entry this far above the real count is slack someone could grow back into.
export const BASELINE_SLACK = 25;

// ESLint reports a stale "eslint-disable" comment as a warning with no rule id.
export const UNUSED_DISABLE_KEY = 'unused-eslint-disable-directive';

export function summarise(results: EslintFileResult[], root = ''): { errors: string[]; warnings: RuleCounts } {
  const errors: string[] = [];
  const warnings: RuleCounts = {};
  for (const file of results) {
    for (const message of file.messages) {
      const where = `${root && file.filePath.startsWith(root) ? file.filePath.slice(root.length).replace(/^\//, '') : file.filePath}:${message.line ?? 0}`;
      if (message.severity >= 2) {
        errors.push(`${where}  ${message.ruleId ?? 'parse error'}: ${message.message.split('\n')[0]}`);
      } else {
        const key = message.ruleId ?? UNUSED_DISABLE_KEY;
        warnings[key] = (warnings[key] ?? 0) + 1;
      }
    }
  }
  return { errors, warnings };
}

export function compareToBaseline(warnings: RuleCounts, baseline: RuleCounts): string[] {
  const problems: string[] = [];
  const rules = new Set([...Object.keys(warnings), ...Object.keys(baseline)]);
  for (const rule of [...rules].sort()) {
    const count = warnings[rule] ?? 0;
    const allowed = baseline[rule];
    if (allowed === undefined) {
      if (count > 0) problems.push(`${rule}: ${count} warning(s), and the rule is not in lint-baseline.json. Fix them; do not add the rule to the baseline.`);
    } else if (count > allowed) {
      problems.push(`${rule}: ${count} warnings, over the baseline of ${allowed}. Fix the new ones; never raise the baseline.`);
    } else if (allowed - count > BASELINE_SLACK) {
      problems.push(`${rule}: down to ${count} warnings but the baseline is still ${allowed}. Run \`npm run check:lint -- --update\` to lower it so it cannot grow back.`);
    }
  }
  return problems;
}

// The baseline after a fix: every rule's recorded count drops to its real count, rules that reached zero are removed,
// and nothing is ever raised or added. Returns null if the counts are not an improvement on the baseline.
export function lowerBaseline(warnings: RuleCounts, baseline: RuleCounts): RuleCounts | null {
  const next: RuleCounts = {};
  for (const [rule, allowed] of Object.entries(baseline)) {
    const count = warnings[rule] ?? 0;
    if (count > allowed) return null;
    if (count > 0) next[rule] = count;
  }
  for (const [rule, count] of Object.entries(warnings)) {
    if (count > 0 && baseline[rule] === undefined) return null;
  }
  return next;
}
