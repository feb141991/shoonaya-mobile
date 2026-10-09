import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// The login is two steps (choose how to continue, then the email form). Only the layout changed:
// every sign-in handler must still exist and still be wired. Source-level guard, like the other
// contract tests. See AGENTS.md sections 12 and 13.
const source = readFileSync(resolve(__dirname, '../app/(auth)/login.tsx'), 'utf8');
// Comments that merely mention a handler must not count as wiring it.
const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('login: two steps', () => {
  it('starts on the choice screen and has an email step', () => {
    assert.match(source, /useState<'choose' \| 'email'>\('choose'\)/);
    assert.match(source, /\{step === 'choose' \? \(/);
  });

  it('keeps every sign-in handler and wires each to a control', () => {
    for (const handler of ['handleGoogle', 'handleApple', 'handleSignIn', 'handleSignUp', 'handleForgotPassword', 'handleAtithiMode']) {
      assert.match(source, new RegExp(`const ${handler} = async \\(`), `${handler} is defined`);
      // defined once, and referenced at least once more by a control
      const references = code.match(new RegExp(`\\b${handler}\\b`, 'g')) ?? [];
      assert.ok(references.length >= 2, `${handler} is used by a control`);
    }
  });

  it('offers Google, Apple (iOS only), email and a guest option on the first screen', () => {
    assert.match(source, /<GoogleAuthButton/);
    assert.match(source, /Platform\.OS === 'ios' && appleAvailable/);
    assert.match(source, /label="Continue with email"/);
    assert.match(source, /Explore as a guest \(Atithi\)/);
    assert.doesNotMatch(source, /Continue as Atithi/);
  });

  it('says only what is true about guest mode', () => {
    assert.match(source, /Your progress won't be saved\./);
    assert.doesNotMatch(source, /family and community spaces need an account/i);
  });

  it('uses the approved brand line, not the rejected generic positioning', () => {
    assert.match(source, /Find your infinite\./);
    assert.doesNotMatch(source, /Ancient wisdom\. Daily practice/);
  });

  it('shows the real password minimum, from one constant shared with the check', () => {
    assert.match(source, /const MIN_PASSWORD_LENGTH = 6;/);
    assert.match(source, /trimmedPassword\.length < MIN_PASSWORD_LENGTH/);
    assert.match(source, /Use at least \{MIN_PASSWORD_LENGTH\} characters\./);
  });

  it('lets the person see the password they are typing', () => {
    assert.match(source, /secureTextEntry=\{!showPassword\}/);
    assert.match(source, /'Hide password' : 'Show password'/);
  });

  it('keeps the page clear of the Android navigation bar and handles hardware Back', () => {
    assert.match(source, /paddingBottom:\s*Math\.max\(insets\.bottom,\s*16\)\s*\+\s*12/);
    assert.match(source, /BackHandler\.addEventListener\('hardwareBackPress'/);
  });

  it('puts support and social links behind "Need help?" instead of on the first screen', () => {
    assert.match(source, /Need help\?/);
    assert.match(source, /\{helpOpen \? \(/);
  });
});
