import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const notificationInbox = readFileSync(new URL('../app/notifications.tsx', import.meta.url), 'utf8');

describe('notification production surface', () => {
  it('does not expose a customer-facing test notification action', () => {
    assert.doesNotMatch(notificationInbox, /Send test notification/i);
    assert.doesNotMatch(notificationInbox, /api\/notifications\/test/);
  });
});
