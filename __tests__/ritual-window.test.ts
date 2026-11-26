import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { reasonLines, ritualWindowNote } from '../lib/ritualWindow';

// Origin: 2026-11-26. The backend Raksha Bandhan rule (founder-approved) can put the festival on Day 1 with
// Rakhi tied only after Bhadra ends (2029: Bhadra ends 13:31 UTC, 19:01 IST). The engine flags it with a
// diagnostic and the start instant; no screen showed it, so the date alone read as "any time that day".
const check = (branch: string, start: string | null) => ({
  code: 'raksha_bandhan_check',
  text: `Raksha Bandhan resolves to 2029-08-23 via '${branch}': MATCHED on 2029-08-23.`,
  details: { branch, ritualWindowStartUtc: start, bhadraEndUtc: '2029-08-23T13:31:37.982Z' },
});

describe('ritual window note', () => {
  it('says when Bhadra ends, in the observance timezone', () => {
    const note = ritualWindowNote({
      diagnostics: ['raksha_bandhan_after_bhadra'],
      reasons: [check('after_bhadra', '2029-08-23T13:31:37.982Z')],
    }, 'Asia/Kolkata');
    assert.equal(note?.kind, 'after_bhadra');
    assert.match(note!.text, /^Tie Rakhi after 7:01\s?pm IST, when Bhadra ends\.$/i);
  });

  it('names the Bhadra-puccha when Bhadra runs past midnight', () => {
    const note = ritualWindowNote({
      diagnostics: ['raksha_bandhan_bhadra_puccha'],
      reasons: [check('bhadra_puccha', '2029-08-23T17:00:00.000Z')],
    }, 'Asia/Kolkata');
    assert.equal(note?.kind, 'bhadra_puccha');
    assert.match(note!.text, /Bhadra-puccha\), from 10:30\s?pm IST\.$/i);
  });

  it('still warns about Bhadra when the time did not come through or is not a date', () => {
    for (const start of [null, 'not-a-date']) {
      const note = ritualWindowNote({ diagnostics: ['raksha_bandhan_after_bhadra'], reasons: [check('after_bhadra', start)] }, 'Asia/Kolkata');
      assert.equal(note?.text, 'Tie Rakhi only after Bhadra ends. The exact time is not available here.');
    }
    const noReasons = ritualWindowNote({ diagnostics: ['raksha_bandhan_after_bhadra'] }, 'Asia/Kolkata');
    assert.equal(noReasons?.startsAtUtc, null);
  });

  it('shows nothing for the morning and afternoon branches, other festivals or a missing flag', () => {
    for (const diagnostics of [['raksha_bandhan_udaya_three_muhurta'], ['raksha_bandhan_aparahna_no_bhadra'], ['holika_dahan_bhadra_puccha'], [], undefined]) {
      assert.equal(ritualWindowNote({ diagnostics, reasons: [check('after_bhadra', '2029-08-23T13:31:37.982Z')] }, 'Asia/Kolkata'), null);
    }
  });

  it('uses the timezone it is given', () => {
    const note = ritualWindowNote({ diagnostics: ['raksha_bandhan_after_bhadra'], reasons: [check('after_bhadra', '2029-08-23T13:31:37.982Z')] }, 'Europe/London');
    assert.match(note!.text, /2:31\s?pm/i);
  });
});

describe('calculation reasons', () => {
  it('reads the API shape (code, text) and the older one (label, description)', () => {
    assert.deepEqual(reasonLines({ code: 'raksha_bandhan_check', text: 'Resolves to 28 Aug.' }), { label: 'Raksha bandhan check', description: 'Resolves to 28 Aug.' });
    assert.deepEqual(reasonLines({ label: 'Tithi', description: 'Purnima' }), { label: 'Tithi', description: 'Purnima' });
    assert.equal(reasonLines({}), null);
    assert.equal(reasonLines(null), null);
  });
});
