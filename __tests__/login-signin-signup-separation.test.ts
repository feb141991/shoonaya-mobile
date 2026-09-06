import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * Confirmed bug this guards against regressing: the previous single
 * "Continue with email" handler called signInWithPassword, and on any
 * "invalid credentials"-shaped failure fell through into signUp with the
 * same credentials -- so a simple wrong-password typo on an existing
 * account silently attempted to create a new one. Sign In and Create
 * Account must stay two structurally separate functions that never call
 * into each other's underlying Supabase method.
 */
describe('login.tsx -- Sign In and Create Account stay structurally separate', () => {
  const source = fs.readFileSync(
    path.join(process.cwd(), 'app/(auth)/login.tsx'),
    'utf8'
  );

  function extractFunctionBody(name: string): string {
    const start = source.indexOf(`const ${name} = async () => {`);
    assert.notEqual(start, -1, `expected to find "${name}" in login.tsx`);
    // Bounded scan for the matching closing brace of this arrow function,
    // tracking nesting depth -- good enough for this file's formatting
    // without a full parser.
    let depth = 0;
    let i = source.indexOf('{', start);
    const bodyStart = i;
    for (; i < source.length; i++) {
      if (source[i] === '{') depth++;
      else if (source[i] === '}') {
        depth--;
        if (depth === 0) break;
      }
    }
    return source.slice(bodyStart, i + 1);
  }

  it('handleSignIn never calls signUp', () => {
    const body = extractFunctionBody('handleSignIn');
    assert.doesNotMatch(body, /\.signUp\(/);
    assert.match(body, /\.signInWithPassword\(/);
  });

  it('handleSignUp never calls signInWithPassword', () => {
    const body = extractFunctionBody('handleSignUp');
    assert.doesNotMatch(body, /\.signInWithPassword\(/);
    assert.match(body, /\.signUp\(/);
  });

  it('neither handler navigates directly -- _layout.tsx is the sole navigator once a session exists', () => {
    for (const name of ['handleSignIn', 'handleSignUp']) {
      const body = extractFunctionBody(name);
      assert.doesNotMatch(body, /router\.(replace|push)\(/, `${name} must not navigate itself`);
    }
  });
});
