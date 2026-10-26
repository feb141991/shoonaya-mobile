import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

const kulSource = fs.readFileSync(path.join(process.cwd(), 'app/kul.tsx'), 'utf8');

// The link must sit inside the top-level death_anniversary block, before
// the "Calendar type" chooser -- not nested inside the lunar-tithi branch,
// or a family entering a civil-date remembrance would never see it.
const deathAnniversaryBlock = kulSource.slice(
  kulSource.indexOf('{eventType === "death_anniversary" ? (\n                        <>'),
  kulSource.indexOf('Calendar type'),
);

test('the Pitru Paksha link sits in the death_anniversary block, before the calendar-type chooser', () => {
  assert.ok(deathAnniversaryBlock.length > 0, 'could not locate the death_anniversary block before "Calendar type"');
  assert.match(deathAnniversaryBlock, /router\.push\("\/festival\/pitru-paksha"\)/);
});

test('the link and its accessibility label name the Hindu tradition explicitly, not a wrong section name', () => {
  assert.match(deathAnniversaryBlock, /Hindu Pitru Paksha remembrance guidance/);
  // Regression guard for the specific wrong copy this replaced.
  assert.ok(!kulSource.includes('in Pathshala'), 'destination is /festival/pitru-paksha, not Pathshala');
});

test('the link is not nested inside the lunar-tithi-only branch', () => {
  const tithiOnlyBlock = kulSource.slice(
    kulSource.indexOf('eventDateSystem === "gregorian" ? ('),
    kulSource.indexOf('Lunar month'),
  );
  assert.ok(
    !tithiOnlyBlock.includes('/festival/pitru-paksha'),
    'the link must not be gated behind eventDateSystem !== "gregorian" -- a civil-date remembrance needs it too',
  );
});
