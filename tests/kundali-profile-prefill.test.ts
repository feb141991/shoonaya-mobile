import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const screen = readFileSync(new URL('../app/kundali.tsx', import.meta.url), 'utf8');

test('Kundali profile autofill reads only name and date of birth', () => {
  assert.match(screen, /\.select\('full_name, date_of_birth'\)/);
  assert.doesNotMatch(screen, /\.select\('full_name, date_of_birth, city, country'\)/);
  assert.doesNotMatch(screen, /from\('birth_profiles'\)/);
});

test('Kundali remounts account-scoped state on identity changes', () => {
  const identityBoundary = screen.match(
    /export default function KundaliScreen\(\) \{([\s\S]*?)\n\}\n\nfunction KundaliScreenForIdentity/,
  )?.[1];

  assert.ok(identityBoundary, 'identity boundary should wrap the stateful screen');
  assert.match(identityBoundary, /const appIdentity = useAppIdentity\(\)/);
  assert.match(identityBoundary, /appIdentity\.kind === 'authenticated'[\s\S]*appIdentity\.userId/);
  assert.match(identityBoundary, /key=\{identityKey\}/);
  assert.match(identityBoundary, /appIdentity=\{appIdentity\}/);
});

test('Kundali self autofill leaves birth time and birthplace for explicit user entry', () => {
  const selfPrefillEffect = screen.match(
    /\/\/ Pre-fill form with self account details when available([\s\S]*?)\n  const handleSelectRelation/,
  )?.[1];

  assert.ok(selfPrefillEffect, 'self-prefill effect should be present');
  assert.match(selfPrefillEffect, /fullName: selfAccount\.fullName/);
  assert.match(selfPrefillEffect, /dateOfBirth: selfAccount\.dateOfBirth/);
  assert.doesNotMatch(selfPrefillEffect, /timeOfBirth:|cityQuery:|setGeocodeResult/);

  const selectSelfBranch = screen.match(/if \(newRelation === 'self'\) \{([\s\S]*?)\n    \} else \{/ )?.[1];
  assert.ok(selectSelfBranch, 'self relation branch should be present');
  assert.match(selectSelfBranch, /timeOfBirth: ''/);
  assert.match(selectSelfBranch, /cityQuery: ''/);
  assert.match(selectSelfBranch, /setGeocodeResult\(null\)/);
});
