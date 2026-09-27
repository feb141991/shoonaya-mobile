/** Native-owned auth persistence; no React Native imports so failure paths are testable. */
export interface AuthKeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

interface ChunkReference { generation: string; count: number }
interface Manifest { version: 1; active?: ChunkReference; pending?: ChunkReference }

const INSTALL_KEY = 'auth_storage_v1.install';
const STATE_PREFIX = 'auth_storage_v1.state.';
const MAX_CHUNK_BYTES = 1500;
const MAX_CHUNKS = 256;

function encodedKey(key: string): string {
  // SecureStore permits only [A-Za-z0-9._-]; encoding also avoids key collisions.
  return Array.from(key, (character) => character.codePointAt(0)!.toString(16)).join('_');
}

function chunksOf(value: string): string[] {
  const chunks: string[] = [];
  let chunk = '';
  let bytes = 0;
  for (const character of value) {
    const code = character.codePointAt(0)!;
    const size = code < 0x80 ? 1 : code < 0x800 ? 2 : code < 0x10000 ? 3 : 4;
    if (bytes + size > MAX_CHUNK_BYTES) { chunks.push(chunk); chunk = ''; bytes = 0; }
    chunk += character;
    bytes += size;
  }
  chunks.push(chunk);
  if (chunks.length > MAX_CHUNKS) throw new Error('Auth storage value exceeds the supported size');
  return chunks;
}

function parseManifest(raw: string | null): Manifest {
  if (raw === null) return { version: 1 };
  try {
    const parsed = JSON.parse(raw) as Manifest;
    const validReference = (reference: ChunkReference | undefined) => reference === undefined || (
      typeof reference?.generation === 'string' && /^[a-zA-Z0-9-]{1,64}$/.test(reference.generation)
      && Number.isInteger(reference.count) && reference.count > 0 && reference.count <= MAX_CHUNKS
    );
    if (parsed?.version === 1 && validReference(parsed.active) && validReference(parsed.pending)) return parsed;
  } catch { /* Never fall back to an old plaintext session when secure data is corrupt. */ }
  throw new Error('Auth storage manifest is invalid');
}

export function createSecureAuthStorage(dependencies: {
  secure: AuthKeyValueStore;
  legacy: AuthKeyValueStore;
  randomId: () => string;
  onDeferredCleanup?: () => void;
}): AuthKeyValueStore {
  const { secure, legacy, randomId, onDeferredCleanup } = dependencies;
  const queues = new Map<string, Promise<unknown>>();
  let installation: Promise<string> | undefined;

  function serialize<T>(key: string, work: () => Promise<T>): Promise<T> {
    const running = (queues.get(key) ?? Promise.resolve()).catch(() => undefined).then(work);
    queues.set(key, running);
    void running.finally(() => { if (queues.get(key) === running) queues.delete(key); }).catch(() => undefined);
    return running;
  }

  function getInstallation(): Promise<string> {
    if (!installation) {
      installation = (async () => {
        const stored = await legacy.getItem(INSTALL_KEY);
        if (stored !== null) {
          if (!/^[a-zA-Z0-9-]{1,64}$/.test(stored)) throw new Error('Auth installation marker is invalid');
          return stored;
        }
        const id = randomId();
        await legacy.setItem(INSTALL_KEY, id);
        if (await legacy.getItem(INSTALL_KEY) !== id) throw new Error('Auth installation marker was not persisted');
        return id;
      })();
      void installation.catch(() => { installation = undefined; });
    }
    return installation;
  }

  async function location(key: string) {
    const encoded = encodedKey(key);
    return {
      base: `auth.${await getInstallation()}.${encoded}`,
      stateKey: `${STATE_PREFIX}${encoded}`,
    };
  }

  async function eraseChunks(base: string, reference?: ChunkReference) {
    if (!reference) return;
    for (let index = 0; index < reference.count; index++) {
      await secure.removeItem(`${base}.${reference.generation}.${index}`);
    }
  }

  async function readActive(base: string, manifest: Manifest): Promise<string | null> {
    if (!manifest.active) return null;
    const chunks: string[] = [];
    for (let index = 0; index < manifest.active.count; index++) {
      const chunk = await secure.getItem(`${base}.${manifest.active.generation}.${index}`);
      if (chunk === null) throw new Error('Auth storage is incomplete');
      chunks.push(chunk);
    }
    return chunks.join('');
  }

  async function writeSecure(base: string, value: string) {
    const chunks = chunksOf(value);
    const manifestKey = `${base}.manifest`;
    const previous = parseManifest(await secure.getItem(manifestKey));
    // The pending reference tracks interrupted writes / deferred old-generation cleanup.
    // A crash never makes partially written chunks the active session.
    await eraseChunks(base, previous.pending);
    const next = { generation: randomId(), count: chunks.length };
    await secure.setItem(manifestKey, JSON.stringify({ version: 1, active: previous.active, pending: next }));
    for (let index = 0; index < chunks.length; index++) {
      const key = `${base}.${next.generation}.${index}`;
      await secure.setItem(key, chunks[index]);
      if (await secure.getItem(key) !== chunks[index]) throw new Error('Auth storage verification failed');
    }
    const committed = JSON.stringify({ version: 1, active: next, pending: previous.active });
    await secure.setItem(manifestKey, committed);
    if (await secure.getItem(manifestKey) !== committed) throw new Error('Auth storage commit was not persisted');
    try {
      await eraseChunks(base, previous.active);
      await secure.setItem(manifestKey, JSON.stringify({ version: 1, active: next }));
    } catch { onDeferredCleanup?.(); }
  }

  async function finishMigration(key: string, stateKey: string) {
    // A permanent nonsecret marker prevents plaintext fallback after secure logout,
    // missing keys after device restore, or an interrupted legacy deletion.
    await legacy.setItem(stateKey, 'secure-pending-cleanup');
    if (await legacy.getItem(stateKey) !== 'secure-pending-cleanup') throw new Error('Auth migration marker was not persisted');
    try {
      await legacy.removeItem(key);
      await legacy.setItem(stateKey, 'secure');
    } catch { onDeferredCleanup?.(); }
  }

  return {
    getItem: (key) => serialize(key, async () => {
      const { base, stateKey } = await location(key);
      const state = await legacy.getItem(stateKey);
      if (state === 'deleted') return null;
      if (state !== null && state !== 'secure' && state !== 'secure-pending-cleanup') throw new Error('Auth migration state is invalid');
      const manifest = parseManifest(await secure.getItem(`${base}.manifest`));
      const stored = await readActive(base, manifest);
      if (stored !== null) {
        if (state !== 'secure') await finishMigration(key, stateKey);
        return stored;
      }
      if (state === 'secure' || state === 'secure-pending-cleanup') return null;
      const oldValue = await legacy.getItem(key);
      if (oldValue === null) return null;
      try {
        await writeSecure(base, oldValue);
        await finishMigration(key, stateKey);
      } catch {
        // Upgrade failure may use the EXISTING legacy value for this launch;
        // never write new credentials to plaintext. Retry migration next read.
        onDeferredCleanup?.();
      }
      return oldValue;
    }),
    setItem: (key, value) => serialize(key, async () => {
      const { base, stateKey } = await location(key);
      await writeSecure(base, value);
      await finishMigration(key, stateKey);
    }),
    removeItem: (key) => serialize(key, async () => {
      const { base, stateKey } = await location(key);
      // Persist/verify the tombstone BEFORE deleting either store. Even a locked
      // Keychain or interrupted cleanup cannot revive a logged-out session.
      await legacy.setItem(stateKey, 'deleted');
      if (await legacy.getItem(stateKey) !== 'deleted') throw new Error('Auth logout marker was not persisted');
      try { await legacy.removeItem(key); } catch { onDeferredCleanup?.(); }
      try {
        const manifest = parseManifest(await secure.getItem(`${base}.manifest`));
        await eraseChunks(base, manifest.active);
        await eraseChunks(base, manifest.pending);
        await secure.removeItem(`${base}.manifest`);
      } catch { onDeferredCleanup?.(); }
    }),
  };
}
