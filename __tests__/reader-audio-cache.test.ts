import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { createReaderAudioCacheIdentity } from '../lib/readerAudioCache';

describe('reader TTS repeat cache', () => {
  it('reuses an identity for the same text and synthesis settings', () => {
    const first = createReaderAudioCacheIdentity('ॐ नमः शिवाय', { quality: 'pandit', language: 'sa-IN', rate: 0.75 });
    const second = createReaderAudioCacheIdentity('ॐ नमः शिवाय', { quality: 'pandit', language: 'sa-IN', rate: 0.75 });
    assert.deepEqual(second, first);
  });

  it('separates cache identities when text or speech settings differ', () => {
    const base = createReaderAudioCacheIdentity('Verse', { quality: 'pandit', language: 'hi-IN' });
    assert.notEqual(createReaderAudioCacheIdentity('Different verse', { quality: 'pandit', language: 'hi-IN' }).key, base.key);
    assert.notEqual(createReaderAudioCacheIdentity('Verse', { quality: 'standard', language: 'hi-IN' }).key, base.key);
    assert.notEqual(createReaderAudioCacheIdentity('Verse', { quality: 'pandit', language: 'pa-IN' }).key, base.key);
  });

  it('keeps generated audio session-local and bounds retained entries', () => {
    const hook = fs.readFileSync(path.join(process.cwd(), 'hooks/useReaderControls.ts'), 'utf8');
    assert.match(hook, /generatedAudioCacheRef = useRef\(new Map/);
    assert.match(hook, /if \(!audioUri\) \{/);
    assert.match(hook, /cache\.size >= 256/);
    assert.match(hook, /FileSystem\.deleteAsync\(uri, \{ idempotent: true \}\)/);
    assert.match(hook, /void FileSystem\.deleteAsync\(oldest\[1\]\.uri/);
  });
});
