import assert from 'node:assert/strict';
import test from 'node:test';
import { ACCOUNT_DELETION_COPY, accountDeletionCopy, deletionReasonLabel } from '../lib/accountDeletionCopy';

// Backend DELETION_REASONS ids (Shoonaya src/lib/account-deletion-reasons.ts).
const SERVER_REASON_IDS = ['taking_break', 'too_many_notifications', 'privacy_concerns', 'not_useful', 'technical_issues', 'other'];

const languages = Object.keys(ACCOUNT_DELETION_COPY) as Array<keyof typeof ACCOUNT_DELETION_COPY>;

test('en, hi and pa are all present', () => {
  assert.deepEqual(languages.sort(), ['en', 'hi', 'pa']);
});

test('every language defines every key with non-empty text', () => {
  const keys = Object.keys(ACCOUNT_DELETION_COPY.en).sort();
  for (const lang of languages) {
    const copy = ACCOUNT_DELETION_COPY[lang];
    assert.deepEqual(Object.keys(copy).sort(), keys, `${lang} key set`);
    for (const [key, value] of Object.entries(copy)) {
      if (typeof value === 'string') assert.ok(value.trim().length > 0, `${lang}.${key} is empty`);
    }
    assert.equal(copy.todayBullets.length, 3, `${lang}.todayBullets`);
    assert.equal(copy.graceBullets.length, 2, `${lang}.graceBullets`);
  }
});

test('every language translates exactly the server reason ids', () => {
  for (const lang of languages) {
    assert.deepEqual(Object.keys(ACCOUNT_DELETION_COPY[lang].reasonLabels).sort(), [...SERVER_REASON_IDS].sort(), lang);
  }
});

test('an unknown reason id falls back to the server label; unknown language falls back to English', () => {
  assert.equal(deletionReasonLabel(accountDeletionCopy('hi'), 'new_server_reason', 'Server label'), 'Server label');
  assert.equal(accountDeletionCopy(null), ACCOUNT_DELETION_COPY.en);
});

test('copy makes none of the claims the backend does not honour', () => {
  for (const lang of languages) {
    const all = JSON.stringify(ACCOUNT_DELETION_COPY[lang]) + ACCOUNT_DELETION_COPY[lang].restoreBody(5);
    for (const banned of ['100%', 'for 30 days instead', 'frozen', 'without penalties', 'transfer']) {
      assert.ok(!all.includes(banned), `${lang} contains "${banned}"`);
    }
  }
});
