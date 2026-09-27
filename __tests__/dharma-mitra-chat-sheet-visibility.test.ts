import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const useAiChat = readFileSync(join(process.cwd(), 'hooks/useAiChat.ts'), 'utf8');
const chatSheet = readFileSync(join(process.cwd(), 'components/home/DharmaMitraChatSheet.tsx'), 'utf8');
const home = readFileSync(join(process.cwd(), 'app/(tabs)/index.tsx'), 'utf8');

// Home keeps DharmaMitraChatSheet mounted at all times (so its conversation
// state survives close/reopen) and useAiChat's profile-loading effect used
// to depend on the onUnauthenticated/onClose callback it was given. A fresh
// inline `() => setChatSheetVisible(false)` closure on every Home render
// therefore retriggered that effect -- supabase.auth.getUser() and
// /api/ai/chat/usage -- even while the sheet was closed and the user never
// touched it.
describe('Dharma Mitra chat sheet does not fetch while closed', () => {
  it('useAiChat gates its auth/profile/usage effect on visible, defaulting to true for full-screen callers', () => {
    assert.match(useAiChat, /visible\?: boolean/);
    assert.match(useAiChat, /visible = true \} = options;/);
    assert.match(useAiChat, /if \(!visible\) return;\s*\n\s*const lease = captureAppIdentity\(\);/);
  });

  it('guards the async profile write with the identity lease, not just the loading flag', () => {
    assert.match(useAiChat, /import \{ captureAppIdentity \} from '@\/lib\/appIdentity';/);
    // Two checks: after auth.getUser() resolves, and after the profile row fetch resolves.
    const leaseChecks = useAiChat.match(/if \(!lease\.isCurrent\(\)\) return;/g) ?? [];
    assert.ok(leaseChecks.length >= 2, `expected at least 2 lease.isCurrent() guards, found ${leaseChecks.length}`);
  });

  it('DharmaMitraChatSheet threads its own visible prop into useAiChat', () => {
    assert.match(chatSheet, /useAiChat\(\{ onUnauthenticated: onClose, visible \}\)/);
  });

  it('Home passes a stable (useCallback, empty-deps) onClose to the chat sheet, not a fresh inline closure', () => {
    assert.match(home, /const handleCloseChatSheet = useCallback\(\(\) => setChatSheetVisible\(false\), \[\]\);/);
    assert.match(home, /onClose=\{handleCloseChatSheet\}/);
    // The old bug pattern must not reappear on the chat sheet specifically.
    assert.doesNotMatch(home, /<DharmaMitraChatSheet[\s\S]*?onClose=\{\(\) => setChatSheetVisible\(false\)\}/);
  });
});
