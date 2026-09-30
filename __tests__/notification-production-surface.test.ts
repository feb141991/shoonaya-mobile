import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const notificationInbox = readFileSync(new URL('../app/notifications.tsx', import.meta.url), 'utf8');

describe('notification production surface', () => {
  it('does not expose a customer-facing test notification action', () => {
    assert.doesNotMatch(notificationInbox, /Send test notification/i);
    assert.doesNotMatch(notificationInbox, /api\/notifications\/test/);
  });

  it('keeps the inbox card content stretched before allocating width to its text', () => {
    const rowStart = notificationInbox.indexOf('const NotificationListRow =');
    const rowEnd = notificationInbox.indexOf('export default function', rowStart);
    assert.ok(rowStart >= 0 && rowEnd > rowStart);
    const rowSource = notificationInbox.slice(rowStart, rowEnd);
    const surface = rowSource.match(/<PressableSurface[\s\S]*?style=\{\{([\s\S]*?)\}\}/);
    assert.ok(surface, 'notification row must keep its pressable surface');
    // PressableSurface has another content View inside it. A row on the
    // outer surface lets that View shrink-wrap; its flexible descendants
    // can then receive zero width. Keep the outer column's default stretch
    // and lay out icon/text inside an explicit row instead.
    assert.doesNotMatch(surface[1], /flexDirection:\s*'row'/);
    assert.match(rowSource, /<View style=\{\{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 \}\}>/);
    assert.match(rowSource, /<View style=\{\{ flex: 1, minWidth: 0 \}\}>[\s\S]*?\{row\.title\}/);
    assert.doesNotMatch(rowSource, /<Text\s+style=\{\{\s*flex:\s*1,/);
    assert.match(rowSource, /\{row\.body\}/);
    assert.match(rowSource, /formatNotificationDate\(row\.created_at\)/);
  });
});
