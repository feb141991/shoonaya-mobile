import assert from 'node:assert/strict';
import test from 'node:test';

import { isLifeStageLocked, nextLifeStageAfterDobChange, suggestedLifeStage } from '../lib/profile-constants';

test('isLifeStageLocked is true only when a date of birth is actually present', () => {
  assert.equal(isLifeStageLocked('1990-01-01'), true);
  assert.equal(isLifeStageLocked(''), false);
  assert.equal(isLifeStageLocked('   '), false);
});

test('nextLifeStageAfterDobChange always follows a given date of birth, even over a prior manual pick', () => {
  // Regression: this used to respect an "isManualLifeStage" override and leave a hand-picked
  // stage in place even after a date of birth was entered -- age is a fact, so a date must
  // always win over whatever was selected before it existed.
  const dob = '1960-01-01'; // -> vanaprastha
  assert.equal(
    nextLifeStageAfterDobChange('brahmacharya', dob),
    suggestedLifeStage(dob)
  );
  assert.equal(suggestedLifeStage(dob), 'vanaprastha');
});

test('nextLifeStageAfterDobChange leaves the previous stage untouched when the date is cleared', () => {
  assert.equal(nextLifeStageAfterDobChange('sannyasa', ''), 'sannyasa');
  assert.equal(nextLifeStageAfterDobChange(null, ''), null);
});

test('nextLifeStageAfterDobChange updates live as the date of birth is edited', () => {
  assert.equal(nextLifeStageAfterDobChange('grihastha', '2015-01-01'), 'brahmacharya');
  assert.equal(nextLifeStageAfterDobChange('brahmacharya', '1940-01-01'), 'sannyasa');
});
