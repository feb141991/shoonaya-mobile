import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  afterNotNow,
  afterYes,
  newTapPromptState,
  parseTapPromptState,
  shouldShowTapPrompt,
  TAP_PROMPT_DELAY_MS,
  TAP_PROMPT_REASK_MS,
} from '../lib/notificationTapPrompt';

const read = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8');
const DAY = 24 * 60 * 60 * 1000;
const T0 = 1_800_000_000_000;

// ── When the one-time card may appear ───────────────────────────────────────

test('nothing is shown in the first week, whatever the server says', () => {
  const s = newTapPromptState(T0);
  assert.equal(shouldShowTapPrompt(s, T0, 'off'), false);
  assert.equal(shouldShowTapPrompt(s, T0 + TAP_PROMPT_DELAY_MS - 1, 'off'), false);
  assert.equal(shouldShowTapPrompt(s, T0 + TAP_PROMPT_DELAY_MS, 'off'), true);
});

test('the card needs a CONFIRMED off: an unreadable or already-on choice shows nothing', () => {
  const s = newTapPromptState(T0);
  const later = T0 + 8 * DAY;
  assert.equal(shouldShowTapPrompt(s, later, 'unavailable'), false, 'a failed read is not "off"');
  assert.equal(shouldShowTapPrompt(s, later, 'on'), false);
  assert.equal(shouldShowTapPrompt(s, later, 'off'), true);
});

test('"Not now" is remembered: asked again once after 30 days, then never', () => {
  let s = newTapPromptState(T0);
  const first = T0 + 8 * DAY;
  s = afterNotNow(s, first);
  assert.equal(shouldShowTapPrompt(s, first + 1, 'off'), false);
  assert.equal(shouldShowTapPrompt(s, first + TAP_PROMPT_REASK_MS - 1, 'off'), false);
  assert.equal(shouldShowTapPrompt(s, first + TAP_PROMPT_REASK_MS, 'off'), true);
  s = afterNotNow(s, first + TAP_PROMPT_REASK_MS);
  assert.equal(shouldShowTapPrompt(s, first + 400 * DAY, 'off'), false, 'two refusals end the asking');
});

test('an answer of Yes ends the asking', () => {
  const s = afterYes(newTapPromptState(T0), T0 + 9 * DAY);
  assert.equal(shouldShowTapPrompt(s, T0 + 400 * DAY, 'off'), false);
});

test('malformed or hostile stored state never shows the card early or forever', () => {
  const now = T0 + 100 * DAY;
  for (const raw of ['', '{', 'null', '[]', '{"v":2}', '{"v":1}', '{"v":1,"firstSeenAt":"x"}', '{"v":1,"firstSeenAt":NaN}']) {
    const s = parseTapPromptState(raw || null, now);
    assert.equal(shouldShowTapPrompt(s, now, 'off'), false, `${raw}: restarts the one-week wait`);
  }
  const future = parseTapPromptState(JSON.stringify({ v: 1, firstSeenAt: now + 50 * DAY, asks: 0, lastAskedAt: null, answeredAt: null }), now);
  assert.equal(future.firstSeenAt, now, 'a clock in the future cannot skip the wait');
  const noAsks = parseTapPromptState(JSON.stringify({ v: 1, firstSeenAt: T0, asks: -1 }), now);
  assert.equal(shouldShowTapPrompt(noAsks, now, 'off'), false, 'a nonsense ask count fails closed');
});

// ── Wiring that must not drift ──────────────────────────────────────────────

test('the consent is its own switch: off by default, never inferred, closed before reopened, per account', () => {
  const consent = read('lib/notificationTapConsent.ts');
  assert.match(consent, /let enabled = false;/);
  const init = consent.slice(consent.indexOf('export async function initializeNotificationTapConsent'), consent.indexOf('/** Called once the server value'));
  assert.ok(init.indexOf('enabled = false') >= 0 && init.indexOf('enabled = false') < init.indexOf('readUserScoped'), 'the gate closes before another account is read');
  assert.match(init, /enabled = stored === 'true'/);
  assert.doesNotMatch(consent, /consent_product_analytics|consent_religious_data|AsyncStorage/);
  assert.match(consent, /return 'unavailable'/);
  assert.match(read('lib/userScopedStorage.ts'), /notificationTapConsent: 'notification_tap_consent_v1'/);
  assert.match(read('lib/userScopedStorage.ts'), /notificationTapPrompt: 'notification_tap_prompt_v1'/);
});

test('Settings: a switch that is off by default, hidden until a successful read, and withdrawal empties the queue', () => {
  const src = read('app/settings/detail-screen.tsx');
  assert.match(src, /consent_notification_taps: false,/);
  assert.match(src, /label="Help improve reminders"/);
  assert.match(src, /disabled=\{isGuest \|\| !tapConsentReady\}/);
  assert.match(src, /setTapConsentReady\(tapConsent !== 'unavailable'\)/);
  assert.match(src, /if \(tapConsent !== 'unavailable'\) \{\s*await applyNotificationTapConsent/);
  assert.match(src, /changedFields\.consent_notification_taps === false\) \{\s*void revokeNotificationTapConsent\(identity\.userId\)/);
  assert.match(src, /'consent_notification_taps' in persistedSettings/);
});

test('onboarding: unticked, not kept in the draft, written only after the profile saved, and a failure cannot fail onboarding', () => {
  const src = read('app/(auth)/onboarding.tsx');
  assert.match(src, /const \[tapConsentOptIn, setTapConsentOptIn\] = useState\(false\)/);
  assert.match(src, /if \(tapConsentOptIn\) \{\s*void saveNotificationTapConsent\(user\.id, true, 'onboarding'\)/);
  assert.match(src, /\.catch\(\(\) => undefined\)/);
  assert.doesNotMatch(read('lib/onboarding-contract.ts'), /consent_notification_taps/, 'never part of the profile payload that can fail the save');
  assert.doesNotMatch(read('lib/onboardingDraft.ts'), /tapConsent/, 'a resumed draft never starts from a remembered yes');
});

test('the card lives in the notifications inbox, not on Home, and nothing is chosen without a press', () => {
  assert.match(read('app/notifications.tsx'), /<TapConsentCard /);
  for (const file of ['app/(tabs)/index.tsx', 'app/(tabs)/_layout.tsx']) {
    try { assert.doesNotMatch(read(file), /TapConsentCard/); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
  const card = read('components/notifications/TapConsentCard.tsx');
  assert.match(card, /saveNotificationTapConsent\(userId, true, 'inbox_card'\)/);
  assert.match(card, /label=\{t\('Not now'/);
  assert.match(card, /label=\{t\('Yes, help'/);
  assert.equal((card.match(/saveNotificationTapConsent\(/g) ?? []).length, 1, 'only the Yes button writes consent');
});

test('the tap queue reads the dedicated consent, and a start-up initialises it before the first flush', () => {
  assert.match(read('lib/notificationTapTracking.ts'), /analytics: isNotificationTapConsentEnabled\(\)/);
  assert.match(read('app/_layout.tsx'), /initializeNotificationTapConsent\(userId\)\]\)\.then/);
});
