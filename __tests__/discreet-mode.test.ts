import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

import { DISCREET_MODE_COPY, readDiscreetMode, saveDiscreetMode } from '../lib/discreetMode';

test('only an available server returning a boolean enables the switch', async () => {
  for (const enabled of [true, false]) {
    const result = await readDiscreetMode(async (path) => {
      assert.equal(path, '/api/native/notification-discretion');
      return Response.json({ enabled });
    });
    assert.deepEqual(result, { state: 'ready', value: enabled });
  }
  assert.deepEqual(await readDiscreetMode(async () => new Response(null, { status: 404 })), { state: 'not_available' });
  for (const response of [new Response(null, { status: 503 }), Response.json({ enabled: 'false' }), new Response('bad JSON')]) {
    assert.deepEqual(await readDiscreetMode(async () => response), { state: 'load_failed' });
  }
});

test('a save must confirm the same boolean from the authenticated profile route', async () => {
  for (const value of [true, false]) {
    const result = await saveDiscreetMode(async (path, init) => {
      assert.equal(path, '/api/native/profile');
      assert.equal(init?.method, 'PATCH');
      assert.deepEqual(JSON.parse(init?.body as string), { notification_discreet_mode: value });
      return Response.json({ success: true, persisted: { notification_discreet_mode: value } });
    }, value);
    assert.equal(result, true);
  }

  for (const response of [
    Response.json({ success: true, persisted: {} }),
    Response.json({ success: true, persisted: { notification_discreet_mode: false } }),
    new Response(null, { status: 503 }),
  ]) assert.equal(await saveDiscreetMode(async () => response, true), false);
});

test('the Settings row only shows a confirmed value and checks ownership after requests', () => {
  const read = (file: string) => readFileSync(join(__dirname, '..', file), 'utf8');
  const row = read('components/settings/NotificationDiscretionSetting.tsx');
  assert.match(read('app/settings/detail-screen.tsx'), /<NotificationDiscretionSetting/);
  assert.match(row, /userId && result.state === 'ready'/);
  assert.match(row, /value=\{result.value\} disabled=\{saving\}/);
  assert.match(row, /expectedUserId: userId/);
  assert.match(row, /if \(lease.isCurrent\(\) && revision.current === version\) setResult\(next\)/);
  assert.match(row, /saved \? \{ state: 'ready', value \} : \{ state: 'load_failed' \}/);
  assert.doesNotMatch(row, /persistSettings|requestNotificationPermission|@\/lib\/supabase/);
  assert.match(DISCREET_MODE_COPY.subtitle, /New notifications/);
  assert.match(DISCREET_MODE_COPY.subtitle, /Security alerts keep their wording/);
});
