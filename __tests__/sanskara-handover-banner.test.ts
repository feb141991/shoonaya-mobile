import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { handoverStage } from '@/lib/sanskaraHandover';
import { acceptResultMessage, handoverBannerCopy } from '@/lib/sanskaraHandoverCopy';

const root = join(__dirname, '..');
const screen = readFileSync(join(root, 'app/kul/sanskara.tsx'), 'utf8');
const banner = readFileSync(join(root, 'components/sanskara/SanskaraHandoverBanner.tsx'), 'utf8');

const birth = '2010-07-15'; // 18th birthday 2028-07-15, window ends 2029-07-15
const copyOn = (today: string) => handoverBannerCopy('Aarav', handoverStage(birth, today));

describe('hand-over banner copy', () => {
  it('says nothing for a young child, after the window, and for a date it cannot read', () => {
    assert.equal(copyOn('2020-01-01'), null);
    assert.equal(copyOn('2029-07-15'), null);
    assert.equal(handoverBannerCopy('Aarav', { stage: 'unknown' }), null);
  });

  it('warns ahead of the 18th birthday without offering the hand-over yet (the server refuses it until then)', () => {
    const copy = copyOn('2028-05-01')!;
    assert.equal(copy.cta, null);
    assert.match(copy.title, /Aarav turns 18 on 15 Jul 2028/);
    assert.match(copy.body, /12 months/);
  });

  it('offers the hand-over from the 18th birthday, with the end date and the days left', () => {
    const copy = copyOn('2028-07-15')!;
    assert.equal(copy.cta, 'Hand over');
    assert.equal(copy.tone, 'info');
    assert.match(copy.body, /15 Jul 2029/);
    assert.match(copy.body, /365 days left/);
    assert.match(copy.body, /deleted/);
  });

  it('turns to a warning for the last 30 days and the last 7, and speaks of one day correctly', () => {
    assert.equal(copyOn('2029-06-14')!.tone, 'info'); // 31 days left
    assert.equal(copyOn('2029-06-15')!.tone, 'warning'); // 30
    assert.match(copyOn('2029-06-15')!.title, /30 days left/);
    assert.match(copyOn('2029-07-08')!.title, /Only 7 days left/);
    assert.equal(copyOn('2029-07-14')!.title, "Last day to hand over Aarav's timeline");
    for (const day of ['2029-06-15', '2029-07-08', '2029-07-14']) assert.match(copyOn(day)!.body, /15 Jul 2029/, day);
  });

  it('never claims more than the dates show: no promise of what the child will see, no pronoun guessed from the name', () => {
    for (const day of ['2028-05-01', '2028-07-15', '2029-06-15', '2029-07-10', '2029-07-14']) {
      const copy = copyOn(day)!;
      assert.doesNotMatch(`${copy.title} ${copy.body}`, /\b(he|she|his|her|him)\b/i, day);
    }
  });
});

describe('screen wiring', () => {
  it('offers the hand-over only on the days start_claim can succeed, not by can_manage', () => {
    assert.match(screen, /activeSubject\.kind === 'dependent' && activeHandover\.stage === 'open'/);
    assert.doesNotMatch(screen, /dependent\.can_manage \? \(/);
  });

  it('derives the stage from the birth date the server sent', () => {
    assert.match(screen, /handoverStage\(activeSubject\.dependent\.birth_date\)/);
  });

  it('shows the banner for a managed child and opens the existing start modal from it', () => {
    assert.match(screen, /<SanskaraHandoverBanner[\s\S]*?setHandoverMode\('start'\)/);
  });
});

describe('banner component', () => {
  it('keeps the touch targets at 44 and the title bounded inside its row', () => {
    assert.equal((banner.match(/minHeight: MIN_TOUCH_TARGET/g) ?? []).length, 2, 'the row and the button');
    assert.match(banner, /title: \{\s*flex: 1,/);
  });

  it('uses tokens only: no colour literal', () => {
    assert.doesNotMatch(banner, /#[0-9a-fA-F]{3,8}\b|rgba?\(/);
  });

  it('pairs multi-line text with a line height', () => {
    assert.match(banner, /title: \{[^}]*lineHeight/);
    assert.match(banner, /body: \{[^}]*lineHeight/);
  });

  it('is a collapsible row that reports its state to a screen reader', () => {
    assert.match(banner, /accessibilityState=\{\{ expanded \}\}/);
  });
});

describe('what the accepting person is told', () => {
  it('says how many were added, with the right singular and plural', () => {
    assert.equal(acceptResultMessage({ moved: 1, dropped_as_duplicates: 0 }), 'Done. 1 milestone was added to your timeline.');
    assert.equal(acceptResultMessage({ moved: 0, dropped_as_duplicates: 0 }), 'Done. 0 milestones were added to your timeline.');
    assert.equal(acceptResultMessage({ moved: 7, dropped_as_duplicates: 0 }), 'Done. 7 milestones were added to your timeline.');
  });

  it('always says so when a record was not added because the person already had one for that rite', () => {
    const one = acceptResultMessage({ moved: 3, dropped_as_duplicates: 1 });
    assert.match(one, /1 milestone was not added/);
    assert.match(one, /Your own record was kept/);
    const many = acceptResultMessage({ moved: 3, dropped_as_duplicates: 2 });
    assert.match(many, /2 milestones were not added/);
    assert.match(many, /Your own records were kept/);
  });

  it('is used by the modal instead of a hard-coded success line', () => {
    const modal = readFileSync(join(root, 'components/sanskara/SanskaraHandoverModal.tsx'), 'utf8');
    assert.match(modal, /setResultMessage\(acceptResultMessage\(result\)\)/);
    assert.doesNotMatch(modal, /sacred milestones were transferred/);
  });

  it('does not mention a dropped record when none was dropped, or when the count is not a positive number', () => {
    for (const bad of [0, -1, Number.NaN]) assert.doesNotMatch(acceptResultMessage({ moved: 2, dropped_as_duplicates: bad }), /not added/);
  });
});
