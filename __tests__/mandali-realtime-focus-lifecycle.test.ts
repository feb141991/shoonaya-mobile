import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const mandali = readFileSync(new URL('../app/(tabs)/mandali.tsx', import.meta.url), 'utf8');

// F11 (docs/PERFORMANCE_RESEARCH_AND_EXECUTION_PLAN.md): the realtime
// subscription and connection-request polling were tied to mounted/profile
// state, not focus. React Navigation's native-stack keeps a tab screen
// mounted (with its profile state intact) when another tab is active, so
// both kept running indefinitely -- receiving and processing Postgres
// realtime events, polling for pending connection requests -- for a screen
// the user was not looking at.
describe('Mandali realtime subscription and connection-request polling pause when unfocused', () => {
  it('imports useFocusEffect/useIsFocused and derives an isFocused flag', () => {
    assert.match(mandali, /import \{ useRouter, useFocusEffect, useIsFocused \} from 'expo-router';/);
    assert.match(mandali, /const isFocused = useIsFocused\(\);/);
  });

  it('gates the realtime subscription on focus, not just on having a mandaliId', () => {
    assert.doesNotMatch(mandali, /if \(!profile\?\.mandaliId\) return;\s*\n\s*\n\s*const channelBuilder/);
    assert.match(mandali, /if \(!profile\?\.mandaliId \|\| !isFocused\) return;/);
    assert.match(mandali, /\}, \[profile\?\.mandaliId, isFocused, visiblePostIdsKey,/);
  });

  it('gates connection-request polling on focus', () => {
    assert.match(mandali, /if \(!isFocused\) return;\s*\n\s*const cleanup = loadPendingRequests\(\);/);
    assert.match(mandali, /\}, \[loadPendingRequests, isFocused\]\);/);
  });

  it('refreshes once on returning to focus after being blurred, not on the first mount', () => {
    assert.match(mandali, /const hasBeenBlurredRef = useRef\(false\);/);
    assert.match(mandali, /if \(hasBeenBlurredRef\.current\)\s*\{\s*\n\s*void loadMandali\(\);/);
    assert.match(mandali, /hasBeenBlurredRef\.current = true;/);
  });
});
