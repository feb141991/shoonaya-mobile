import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

/**
 * A screen must never put an error's own message, a status code or a database detail in front of a person. Our own
 * code throws developer messages ("Request failed (status 500)"), the server's `error` strings are written for
 * developers ("Invalid request body", "Missing entry id"), and the runtime adds its own ("Network request failed").
 * Screens use `describeFailure(error, 'their own sentence')` from lib/user-facing-error.ts instead.
 *
 * This reads every screen and component and fails on the old patterns. See AGENTS.md section 12.
 */
const ROOT = join(__dirname, '..');
const SCAN_DIRS = ['app', 'components'];

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('.') || name === 'graphify-out') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (full.endsWith('.tsx')) out.push(full);
  }
  return out;
}

/** Comments are removed first: a rule written in a comment, or a call quoted in one, is not a violation. */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
}

type Rule = { name: string; pattern: RegExp; why: string };
const RULES: Rule[] = [
  {
    name: 'an error\'s own message',
    pattern: /\b(?:error|err|e|failure|exception|ex|reason|cause)\??\.message\b/,
    why: 'Use describeFailure(error, fallback). The message is written for developers and can carry table or column detail.',
  },
  {
    name: 'a status code in text a person reads',
    pattern: /(?:HTTP\s*\$\{|\(status\s*\$\{|Server error \()/,
    why: 'A person cannot act on a status number. describeFailure says what happened; the status goes to the log.',
  },
];

/**
 * The few places an error's message is read for a reason other than showing it, each with why it is safe.
 * An entry must match one line exactly (trimmed); the list only ever shrinks.
 */
const ALLOWED: Array<{ file: string; line: RegExp; why: string }> = [
  { file: 'app/(auth)/login.tsx', line: /classify(?:SignIn|SignUp|ForgotPassword)ErrorMessage\((?:error|err)\??\.message\)/,
    why: 'the raw text is mapped to curated sign-in wording before it is shown (lib/authErrorMessages.ts)' },
  { file: 'app/dyuta.tsx', line: /error\.message\.includes\('slots are full'\)/,
    why: 'inspected to choose between two fixed sentences; the message itself is never shown' },
];

export function findViolations(file: string, source: string): string[] {
  const found: string[] = [];
  const lines = stripComments(source).split('\n');
  lines.forEach((line, i) => {
    // Writing to the console is how developers see the real message; it never reaches a person.
    if (/\bconsole\.(?:log|warn|error|info|debug)\(/.test(line)) return;
    for (const rule of RULES) {
      if (!rule.pattern.test(line)) continue;
      if (ALLOWED.some((a) => a.file === file && a.line.test(line.trim()))) continue;
      found.push(`${file}:${i + 1}  ${rule.name}: ${line.trim().slice(0, 140)}\n      ${rule.why}`);
    }
  });
  return found;
}

describe('no screen shows raw error text', () => {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));

  it('scans the screens and components (a guard that scans nothing guards nothing)', () => {
    assert.ok(files.length > 150, `only ${files.length} files scanned`);
    assert.ok(files.some((f) => f.endsWith(join('app', '(tabs)', 'japa.tsx'))));
    assert.ok(files.some((f) => f.endsWith(join('components', 'ui', 'ErrorBoundary.tsx'))));
  });

  it('finds no error message, status code or database detail on its way to a screen', () => {
    const violations = files.flatMap((f) => findViolations(relative(ROOT, f), readFileSync(f, 'utf8')));
    assert.deepEqual(violations, [], `\n${violations.join('\n')}\n`);
  });

  it('every allowed exception is still needed (the list only shrinks)', () => {
    for (const a of ALLOWED) {
      const source = readFileSync(join(ROOT, a.file), 'utf8');
      assert.ok(stripComments(source).split('\n').some((l) => a.line.test(l.trim())), `${a.file}: ${a.why} is gone; delete the entry`);
    }
  });
});

describe('the guard itself', () => {
  const bad = (code: string) => findViolations('app/x.tsx', code);

  it('catches every old pattern', () => {
    assert.equal(bad("Alert.alert('t', err instanceof Error ? err.message : 'x');").length, 1);
    assert.equal(bad("setError(e?.message || 'x');").length, 1);
    assert.equal(bad("const message = error.message;\nAlert.alert('t', message);").length, 1);
    assert.equal(bad("setErrorMessage(`Unable to load chart (HTTP ${res.status}).`);").length, 1);
    assert.equal(bad("throw new Error(`x`); setNotice(`Server error (${s})`);").length, 1);
  });

  it('leaves the new pattern, other fields called message, and comments alone', () => {
    assert.deepEqual(bad("Alert.alert('t', describeFailure(error, 'Could not save. Please try again.'));"), []);
    assert.deepEqual(bad('<Text>{toast.message}</Text>'), []);
    assert.deepEqual(bad('Share.share({ message: active.story.shareTemplate.message });'), []);
    assert.deepEqual(bad("setError(openError.message);"), []);
    assert.deepEqual(bad("// never show error.message here\nconst x = 1;"), []);
    assert.deepEqual(bad("console.warn('[x] failed', error.message);"), []);
    assert.deepEqual(bad("/* old: err instanceof Error ? err.message : y */ const x = 1;"), []);
  });
});
