import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { DISCREET_MODE_COPY, readDiscreetMode } from '../lib/discreetMode';

const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8');
const screen = read('app/settings/detail-screen.tsx');

const answer = (result: { data?: unknown; error?: unknown }) => {
  const asked: string[] = [];
  const reader = async (columns: string) => { asked.push(columns); return { data: result.data ?? null, error: result.error ?? null }; };
  return { reader, asked };
};

// ── Reading the setting ──────────────────────────────────────────────────────────────────────

test('a real boolean is "ready", on or off, and only that one column is asked for', async () => {
  for (const value of [true, false]) {
    const { reader, asked } = answer({ data: { notification_discreet_mode: value } });
    assert.deepEqual(await readDiscreetMode(reader), { state: 'ready', value });
    assert.deepEqual(asked, ['notification_discreet_mode']);
  }
});

test('a server without the column is "not_available", not a failure', async () => {
  const { reader } = answer({ error: { code: '42703', message: 'column does not exist' } });
  assert.deepEqual(await readDiscreetMode(reader), { state: 'not_available' });
});

test('every other way a read can fail is "load_failed", never "off"', async () => {
  const failures: Array<{ data?: unknown; error?: unknown }> = [
    { error: { code: '57014', message: 'statement timeout' } },
    { error: { code: 'PGRST301', message: 'JWT expired' } },
    { error: { message: 'no code at all' } },
    { error: 'a bare string' },
    { data: null },
    { data: {} },
    { data: { notification_discreet_mode: null } },
    { data: { notification_discreet_mode: 'true' } },
    { data: { notification_discreet_mode: 1 } },
    { data: { notification_discreet_mode: 0 } },
  ];
  for (const failure of failures) {
    const { reader } = answer(failure);
    assert.deepEqual(await readDiscreetMode(reader), { state: 'load_failed' }, JSON.stringify(failure));
  }
  assert.deepEqual(await readDiscreetMode(async () => { throw new Error('network'); }), { state: 'load_failed' });
});

// ── The words on the switch ──────────────────────────────────────────────────────────────────

test('the English copy says what it does and what it does not', () => {
  assert.equal(DISCREET_MODE_COPY.label, 'Hide notification details');
  assert.match(DISCREET_MODE_COPY.subtitle, /only say that you have a new notification/);
  assert.match(DISCREET_MODE_COPY.subtitle, /appear when you open Shoonaya/);
  assert.match(DISCREET_MODE_COPY.subtitle, /new notifications/, 'it must not claim to change ones already shown');
  assert.doesNotMatch(DISCREET_MODE_COPY.subtitle, /secure|private forever|guarantee|encrypt/i, 'no promise it cannot keep');
});

test('a Hindi draft exists for the label and the explanation', () => {
  assert.ok(DISCREET_MODE_COPY.labelHi.length > 0 && DISCREET_MODE_COPY.subtitleHi.length > 0);
  assert.match(read('lib/discreetMode.ts'), /unreviewed draft/);
});

// ── How the screen wires it (source guards) ──────────────────────────────────────────────────

test('it is read separately from the long fallback cascade, so an older server keeps every other setting', () => {
  const cascadeColumns = screen.slice(screen.indexOf("const baseColumns = '"), screen.indexOf('const read = (columns: string)'));
  assert.doesNotMatch(cascadeColumns, /notification_discreet_mode/);
  assert.match(screen, /const discreetPromise = readDiscreetMode\(/);
  assert.match(screen, /discreetPromise,\s*\]\);/);
});

test('a failed or missing read never presents a value: the loaded value is used only when the read was ready', () => {
  assert.match(screen, /discreet\.state === 'ready' \? \{ \.\.\.remoteFromProfile, notification_discreet_mode: discreet\.value \} : remoteFromProfile/);
  assert.match(screen, /setDiscreetModeState\(discreet\.state\)/);
  assert.match(screen, /useState<DiscreetModeLoadState>\('not_available'\)/, 'starts disabled until the read says otherwise');
});

test('the switch is disabled for guests and unless the read succeeded', () => {
  const row = screen.slice(screen.indexOf('DISCREET_MODE_COPY.label'), screen.indexOf('DISCREET_MODE_COPY.label') + 2600);
  assert.match(row, /disabled=\{isGuest \|\| discreetModeState !== 'ready'\}/);
  assert.match(row, /if \(isGuest \|\| discreetModeState !== 'ready'\) return;/);
});

test('it is its own row: it is not in the reminder list, and switching it on never asks for notification permission', () => {
  const toggleList = screen.slice(screen.indexOf('const NOTIFICATION_TOGGLES'), screen.indexOf('];', screen.indexOf('const NOTIFICATION_TOGGLES')));
  assert.doesNotMatch(toggleList, /notification_discreet_mode/);
  const handler = screen.slice(screen.indexOf("if (isGuest || discreetModeState !== 'ready') return;"), screen.indexOf("if (isGuest || discreetModeState !== 'ready') return;") + 220);
  assert.match(handler, /persistSettings\(\{ \.\.\.settings, notification_discreet_mode: value \}\)/);
  assert.doesNotMatch(handler, /enableNotificationReminder|requestNotificationPermission/);
});

test('the setting is optional in the cache type and off by default, so an older cached envelope still loads', () => {
  assert.match(read('lib/settingsCache.ts'), /notification_discreet_mode\?: boolean;/);
  assert.match(screen, /notification_discreet_mode: false,/);
  assert.match(screen, /notification_discreet_mode: value\?\.notification_discreet_mode \?\? INITIAL_SETTINGS\.notification_discreet_mode/);
});
