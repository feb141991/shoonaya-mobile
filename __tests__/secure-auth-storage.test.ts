import test from 'node:test';
import assert from 'node:assert/strict';
import { createSecureAuthStorage, type AuthKeyValueStore } from '../lib/secureAuthStorage';

class MemoryStore implements AuthKeyValueStore {
  values = new Map<string, string>();
  writes: Array<[string, string]> = [];
  failure?: (operation: 'get' | 'set' | 'remove', key: string, value?: string) => void;
  async getItem(key: string) { this.failure?.('get', key); return this.values.get(key) ?? null; }
  async setItem(key: string, value: string) {
    this.failure?.('set', key, value);
    this.writes.push([key, value]); this.values.set(key, value);
  }
  async removeItem(key: string) { this.failure?.('remove', key); this.values.delete(key); }
}

const SESSION = 'sb-project-auth-token';
function setup() {
  const legacy = new MemoryStore();
  const secure = new MemoryStore();
  let id = 0;
  let warnings = 0;
  const create = () => createSecureAuthStorage({ legacy, secure, randomId: () => `id-${++id}`, onDeferredCleanup: () => { warnings++; } });
  return { legacy, secure, create, storage: create(), warnings: () => warnings };
}

test('upgrade migrates existing session and PKCE verifier, then deletes only legacy auth values', async () => {
  const { storage, legacy, secure, create } = setup();
  legacy.values.set(SESSION, '{"access_token":"existing-session"}');
  legacy.values.set(`${SESSION}-code-verifier`, 'pkce-existing');
  legacy.values.set('profile-cache', 'unrelated');
  assert.equal(await storage.getItem(SESSION), '{"access_token":"existing-session"}');
  assert.equal(await storage.getItem(`${SESSION}-code-verifier`), 'pkce-existing');
  assert.equal(legacy.values.has(SESSION), false);
  assert.equal(legacy.values.has(`${SESSION}-code-verifier`), false);
  assert.equal(legacy.values.get('profile-cache'), 'unrelated');
  assert.ok(secure.values.size > 0);
  assert.equal(await create().getItem(SESSION), '{"access_token":"existing-session"}');
  assert.ok(legacy.writes.every(([key]) => key.startsWith('auth_storage_v1.')));
});

test('large Unicode sessions are split by bytes, verified and reconstructed exactly', async () => {
  const { storage, secure } = setup();
  const value = JSON.stringify({ token: 'a'.repeat(5000), name: '🙏 हिन्दी ਪੰਜਾਬੀ '.repeat(1000) });
  secure.failure = (operation, _key, content) => {
    if (operation === 'set' && Buffer.byteLength(content!) > 1500) throw new Error('native payload too large');
  };
  await storage.setItem(SESSION, value);
  assert.equal(await storage.getItem(SESSION), value);
  assert.ok(secure.writes.length > 10);
});

test('failed secure migration retains the existing session without writing credentials to plaintext', async () => {
  const { storage, legacy, secure, warnings } = setup();
  legacy.values.set(SESSION, 'existing-token');
  secure.failure = (operation) => { if (operation === 'set') throw new Error('Keychain unavailable'); };
  assert.equal(await storage.getItem(SESSION), 'existing-token');
  assert.equal(legacy.values.get(SESSION), 'existing-token');
  assert.ok(warnings() > 0);
  secure.failure = undefined;
  assert.equal(await storage.getItem(SESSION), 'existing-token');
  assert.equal(legacy.values.has(SESSION), false);
});

test('silent native write corruption is detected before deleting legacy credentials', async () => {
  const { storage, legacy, secure } = setup();
  legacy.values.set(SESSION, 'original');
  const originalSet = secure.setItem.bind(secure);
  secure.setItem = async (key, value) => originalSet(key, key.endsWith('.manifest') ? value : 'corrupt');
  assert.equal(await storage.getItem(SESSION), 'original');
  assert.equal(legacy.values.get(SESSION), 'original');
  assert.ok([...secure.values.entries()].filter(([key]) => key.endsWith('.manifest')).every(([, value]) => !JSON.parse(value).active));
});

test('interrupted refresh leaves prior committed session readable and retries recover pending chunks', async () => {
  const { storage, secure, create } = setup();
  await storage.setItem(SESSION, 'old-session');
  secure.failure = (operation, key) => {
    if (operation === 'set' && key.endsWith('.1')) throw new Error('simulated write interruption');
  };
  await assert.rejects(storage.setItem(SESSION, 'n'.repeat(4000)), /interruption/);
  assert.equal(await create().getItem(SESSION), 'old-session');
  secure.failure = undefined;
  await storage.setItem(SESSION, 'new-session');
  assert.equal(await create().getItem(SESSION), 'new-session');
  assert.equal([...secure.values.keys()].filter((key) => !key.endsWith('.manifest')).length, 1);
});

test('secure corruption never revives an old plaintext token', async () => {
  const { storage, legacy, secure } = setup();
  await storage.setItem(SESSION, 'new-session');
  legacy.values.set(SESSION, 'old-session');
  const chunkKey = [...secure.values.keys()].find((key) => !key.endsWith('.manifest'))!;
  secure.values.delete(chunkKey);
  await assert.rejects(storage.getItem(SESSION), /incomplete/);
});

test('logout tombstone survives both deletion failures and a process restart', async () => {
  const { storage, legacy, secure, create } = setup();
  await storage.setItem(SESSION, 'new-session');
  legacy.values.set(SESSION, 'old-session');
  legacy.failure = (operation, key) => { if (operation === 'remove' && key === SESSION) throw new Error('disk'); };
  secure.failure = () => { throw new Error('locked Keychain'); };
  await storage.removeItem(SESSION);
  secure.failure = undefined;
  legacy.failure = undefined;
  assert.equal(await create().getItem(SESSION), null);
  assert.equal(await storage.getItem(SESSION), null);
  // A later deliberate successful sign-in can replace the tombstone.
  await storage.setItem(SESSION, 'signed-in-again');
  assert.equal(await create().getItem(SESSION), 'signed-in-again');
  assert.equal(legacy.values.has(SESSION), false);
});

test('migration immediately followed by logout is serialized and cannot repopulate either store', async () => {
  const { storage, legacy, secure, create } = setup();
  legacy.values.set(SESSION, 'existing-token');
  const read = storage.getItem(SESSION);
  const logout = storage.removeItem(SESSION);
  await Promise.all([read, logout]);
  assert.equal(await create().getItem(SESSION), null);
  assert.equal(legacy.values.has(SESSION), false);
  assert.equal(secure.values.size, 0);
});

test('writes and logout called concurrently retain call order', async () => {
  const { storage, secure } = setup();
  await Promise.all([storage.setItem(SESSION, 'a'), storage.setItem(SESSION, 'b'), storage.removeItem(SESSION)]);
  assert.equal(await storage.getItem(SESSION), null);
  assert.equal(secure.values.size, 0);
});

test('reinstall with empty AsyncStorage cannot restore credentials left in iOS Keychain', async () => {
  const { storage, legacy, secure, create } = setup();
  await storage.setItem(SESSION, 'previous-install');
  legacy.values.clear();
  assert.ok(secure.values.size > 0);
  assert.equal(await create().getItem(SESSION), null);
});

test('ordinary secure reads perform no writes and no plaintext token reads', async () => {
  const { storage, legacy, secure } = setup();
  await storage.setItem(SESSION, 'session');
  const writes = legacy.writes.length + secure.writes.length;
  legacy.failure = (operation, key) => { if (operation === 'get' && key === SESSION) throw new Error('plaintext auth read'); };
  assert.equal(await storage.getItem(SESSION), 'session');
  assert.equal(legacy.writes.length + secure.writes.length, writes);
});

test('cleanup failure cannot cause plaintext fallback if secure values disappear later', async () => {
  const { storage, legacy, secure, create } = setup();
  legacy.values.set(SESSION, 'existing-session');
  legacy.failure = (operation, key) => { if (operation === 'remove' && key === SESSION) throw new Error('disk'); };
  assert.equal(await storage.getItem(SESSION), 'existing-session');
  secure.values.clear();
  assert.equal(await create().getItem(SESSION), null);
});

test('new-session persistence rejects secure failures rather than writing plaintext', async () => {
  const { storage, legacy, secure } = setup();
  secure.failure = (operation) => { if (operation === 'set') throw new Error('secure write failed'); };
  await assert.rejects(storage.setItem(SESSION, 'new-token'), /secure write failed/);
  assert.equal(legacy.values.has(SESSION), false);
  assert.ok(legacy.writes.every(([, value]) => value !== 'new-token'));
});

test('logout cannot report success when the durable tombstone was not persisted', async () => {
  const { storage, legacy } = setup();
  await storage.setItem(SESSION, 'session');
  legacy.failure = (operation, _key, value) => { if (operation === 'set' && value === 'deleted') throw new Error('disk full'); };
  await assert.rejects(storage.removeItem(SESSION), /disk full/);
});
