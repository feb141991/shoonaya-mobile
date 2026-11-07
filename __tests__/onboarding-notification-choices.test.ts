import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NOTIFICATION_CHOICE_KEYS, getNotificationPersistencePayload, DEFAULT_NOTIFICATION_CATEGORY_CHOICES } from '../lib/onboarding-contract';
import { ONBOARDING_NOTIFICATION_GROUPS, ONBOARDING_NOTIFICATION_ITEMS } from '../lib/onboardingNotificationCatalog';

/**
 * Onboarding shows EVERY notification a person can choose, one switch each, all off (AGENTS 19). These pins keep the screen, the
 * catalogue, the saved columns and Settings telling the same story, and keep the OS prompt tied to a real choice.
 */
const ROOT = join(__dirname, '..');
const read = (path: string) => readFileSync(join(ROOT, path), 'utf8');
const strip = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const onboarding = strip(read('app/(auth)/onboarding.tsx'));

type SettingsToggle = { key: string; label: string; labelHi: string; subtitle: string; subtitleHi: string };
function settingsToggles(): SettingsToggle[] {
  const source = read('app/settings/detail-screen.tsx');
  const pattern = /\{ key: '([a-z_]+)', label: '((?:[^'\\]|\\.)*)', labelHi: '((?:[^'\\]|\\.)*)', subtitle: '((?:[^'\\]|\\.)*)', subtitleHi: '((?:[^'\\]|\\.)*)'/g;
  return [...source.matchAll(pattern)].map((m) => ({
    key: m[1], label: m[2].replace(/\\'/g, "'"), labelHi: m[3].replace(/\\'/g, "'"), subtitle: m[4].replace(/\\'/g, "'"), subtitleHi: m[5].replace(/\\'/g, "'"),
  }));
}

describe('the catalogue of notifications shown in onboarding', () => {
  it('lists every notification exactly once, grouped', () => {
    assert.equal(ONBOARDING_NOTIFICATION_GROUPS.length, 6);
    const keys = ONBOARDING_NOTIFICATION_ITEMS.map((item) => item.key);
    assert.equal(keys.length, 17);
    assert.deepEqual([...keys].sort(), [...NOTIFICATION_CHOICE_KEYS].sort());
    assert.equal(new Set(keys).size, keys.length, 'no notification appears twice');
    for (const group of ONBOARDING_NOTIFICATION_GROUPS) {
      assert.ok(group.title.length > 2 && group.titleHi.length > 2 && group.items.length > 0, group.id);
    }
  });

  it('is exactly the set of notifications Settings lets a person control, in the same words', () => {
    const toggles = settingsToggles();
    assert.equal(toggles.length, 17, 'the scan found every Settings toggle (a scan that finds nothing would pass vacuously)');
    assert.deepEqual([...ONBOARDING_NOTIFICATION_ITEMS.map((i) => i.settingsKey)].sort(), [...toggles.map((t) => t.key)].sort());
    for (const toggle of toggles) {
      const item = ONBOARDING_NOTIFICATION_ITEMS.find((i) => i.settingsKey === toggle.key)!;
      assert.equal(item.title, toggle.label, `${toggle.key} title`);
      assert.equal(item.titleHi, toggle.labelHi, `${toggle.key} Hindi title`);
      assert.equal(item.description, toggle.subtitle, `${toggle.key} description`);
      assert.equal(item.descriptionHi, toggle.subtitleHi, `${toggle.key} Hindi description`);
    }
  });

  it('every switch saves to the column Settings uses for it, and to no other', () => {
    for (const item of ONBOARDING_NOTIFICATION_ITEMS) {
      const payload = getNotificationPersistencePayload({ ...DEFAULT_NOTIFICATION_CATEGORY_CHOICES, [item.key]: true }) as Record<string, unknown>;
      const on = Object.entries(payload).filter(([, value]) => value === true).map(([column]) => column);
      assert.deepEqual(on, [item.settingsKey], `${item.key} should switch on only ${item.settingsKey}`);
    }
  });

  it('names a real icon for every row', () => {
    const glyphs = JSON.parse(read('node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/glyphmaps/Feather.json')) as Record<string, number>;
    for (const item of ONBOARDING_NOTIFICATION_ITEMS) assert.ok(item.icon in glyphs, `${item.key}: ${item.icon}`);
  });

  it('describes the Brahma Muhurta reminder honestly: it arrives at night', () => {
    const brahma = ONBOARDING_NOTIFICATION_ITEMS.find((i) => i.key === 'brahmaMuhurta')!;
    assert.match(brahma.description, /arrives at night/);
    assert.match(brahma.descriptionHi, /रात में/);
  });
});

describe('the notifications step', () => {
  it('shows the catalogue grouped, one switch per notification, all reading their own value', () => {
    assert.match(onboarding, /ONBOARDING_NOTIFICATION_GROUPS\.map\(\(group\) => \(/);
    assert.match(onboarding, /group\.items\.map\(\(item\) => \{/);
    assert.match(onboarding, /accessibilityRole="header"/);
    assert.match(onboarding, /accessibilityRole="switch"/);
    assert.match(onboarding, /accessibilityState=\{\{ checked: notificationCategories\[item\.key\] \}\}/);
    // The pin must sit inside the notification rows: other switches on this step also use 56.
    const rows = onboarding.slice(onboarding.indexOf('group.items.map'), onboarding.indexOf('{notificationsDenied ? ('));
    assert.ok(rows.length > 300, 'found the rows');
    assert.match(rows, /minHeight: 56/);
  });

  it('keeps no bundled category key anywhere', () => {
    for (const name of ['festivalsAndVrats', 'dailySadhana', 'dailyQuiz', 'communityAndFamily']) {
      assert.equal(onboarding.includes(name), false, name);
      assert.equal(strip(read('lib/onboarding-contract.ts')).includes(name), false, name);
    }
  });

  it('says everything is off until turned on, and no longer claims "zero spam"', () => {
    const raw = read('app/(auth)/onboarding.tsx');
    assert.match(raw, /Everything is off until you turn it on/);
    assert.equal(/Zero spam/i.test(raw), false);
  });

  it('asks the OS for permission only when at least one notification is chosen', () => {
    const handler = onboarding.slice(onboarding.indexOf('const onPrimaryAction'), onboarding.indexOf('const secondaryActionLabel'));
    assert.ok(handler.length > 100, 'found the primary action');
    const none = handler.indexOf('!anyReminderChosen');
    const ask = handler.indexOf('handleAllowNotifications()');
    assert.ok(none !== -1 && ask !== -1 && none < ask, 'the "nothing chosen" branch comes before the OS request');
    assert.match(handler, /else if \(!anyReminderChosen\) handleNotNow\(\);/);
    assert.match(onboarding, /const anyReminderChosen = hasAnyNotificationChoice\(notificationCategories\);/);
    assert.match(read('app/(auth)/onboarding.tsx'), /Continue without reminders/);
  });

  it('"Not now" is not consent: it clears every switch', () => {
    const handler = onboarding.slice(onboarding.indexOf('const handleNotNow'), onboarding.indexOf('const handleAllowLocation = async'));
    assert.ok(handler.length > 100, 'found the handler');
    assert.match(handler, /setNotificationCategories\(DEFAULT_NOTIFICATION_CATEGORY_CHOICES\)/);
    assert.match(handler, /notificationCategories: DEFAULT_NOTIFICATION_CATEGORY_CHOICES/);
  });

  it('clearing the last switch withdraws the in-app choice, and the toggle keeps its state updates out of an updater function', () => {
    const toggle = onboarding.slice(onboarding.indexOf('const handleNotificationCategoryToggle'), onboarding.indexOf('const goBack'));
    assert.match(toggle, /if \(!hasAnyNotificationChoice\(next\)\) \{[\s\S]*?setNotificationChoice\('unset'\);[\s\S]*?setNotificationsDenied\(false\);/);
    assert.equal(/setNotificationCategories\(\(/.test(toggle), false, 'no state updater function');
  });

  it('restores a draft through readNotificationChoices, and a saved "enabled" with nothing chosen is not an opt-in', () => {
    assert.match(onboarding, /const restoredChoices = readNotificationChoices\(draft\.notificationCategories\);/);
    assert.match(onboarding, /draft\.notificationChoice === 'enabled' && !hasAnyNotificationChoice\(restoredChoices\) \? 'unset'/);
    assert.equal(/\.\.\.draft\.notificationCategories/.test(onboarding), false, 'a draft is never spread straight into the choices');
  });

  it('starts every switch off', () => {
    assert.match(onboarding, /useState<NotificationCategoryChoices>\(\s*DEFAULT_NOTIFICATION_CATEGORY_CHOICES\s*\)/);
  });
});
