import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const home = readFileSync(join(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

describe('Home screen child sheets use namespaced keys', () => {
  it('namespaces MoodPulseSheet and DharmaMitraChatSheet keys to prevent sibling key collision', () => {
    // Both sheets unmount/remount on identity changes, but as direct siblings
    // under SafeAreaView, unnamespaced userId/guest keys collided and logged
    // React Fabric duplicate key errors: "Encountered two children with the same key".
    assert.match(
      home,
      /<MoodPulseSheet[\s\S]*?key=\{`mood-pulse-\$\{moodPulseUserId \?\? 'guest'\}`\}/,
      'MoodPulseSheet must have a prefixed key',
    );
    assert.match(
      home,
      /<DharmaMitraChatSheet[\s\S]*?key=\{`dharma-chat-\$\{appIdentity\.kind === 'authenticated' \? appIdentity\.userId : appIdentity\.kind\}`\}/,
      'DharmaMitraChatSheet must have a prefixed key',
    );
    assert.doesNotMatch(
      home,
      /<MoodPulseSheet[\s\S]*?key=\{moodPulseUserId \?\? 'guest'\}/,
      'MoodPulseSheet must not use raw unnamespaced key',
    );
    assert.doesNotMatch(
      home,
      /<DharmaMitraChatSheet[\s\S]*?key=\{appIdentity\.kind === 'authenticated' \? appIdentity\.userId : appIdentity\.kind\}/,
      'DharmaMitraChatSheet must not use raw unnamespaced key',
    );
  });
});
