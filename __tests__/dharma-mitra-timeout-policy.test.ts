import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { AI_CHAT_TIMEOUT_MS, DEFAULT_API_TIMEOUT_MS } from '../lib/api-policy';

describe('Dharma Mitra timeout policy', () => {
  it('keeps ordinary API calls bounded while allowing model inference to finish', () => {
    assert.equal(DEFAULT_API_TIMEOUT_MS, 15_000);
    assert.equal(AI_CHAT_TIMEOUT_MS, 60_000);
    assert.ok(AI_CHAT_TIMEOUT_MS > DEFAULT_API_TIMEOUT_MS);
  });

  it('passes the AI-specific timeout to the production chat request', () => {
    const source = readFileSync(join(process.cwd(), 'hooks/useAiChat.ts'), 'utf8');
    assert.ok(source.includes("apiFetch('/api/ai/chat'"));
    assert.ok(source.includes('timeoutMs: AI_CHAT_TIMEOUT_MS'));
  });
});
