import AsyncStorage from '@react-native-async-storage/async-storage';
import { AESEncryptionKey, AESSealedData, aesDecryptAsync, aesEncryptAsync } from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';

import { createCacheStorageBarrier } from './cacheStorageBarrier';
import type { KulSnapshot } from './kul';
import {
  isUsableKulSnapshotCacheEnvelope,
  KUL_SNAPSHOT_CACHE_SCHEMA_VERSION,
  removeKulInviteCodeFromCachedSnapshot,
  type KulSnapshotCacheEnvelope,
} from './kulSnapshotCachePolicy';

const USER_KEY_PREFIX = 'shoonaya_kul_snapshot_v1_user_';
const ENCRYPTION_KEY_NAME = 'shoonaya_kul_cache_aes_key_v1';
const cacheStorage = createCacheStorageBarrier((key) => key.startsWith(USER_KEY_PREFIX));
let encryptionKeyFlight: Promise<AESEncryptionKey> | null = null;

function cacheKey(userId: string): string {
  return `${USER_KEY_PREFIX}${userId}`;
}

function utf8ToBytes(value: string): Uint8Array {
  const encoded = encodeURIComponent(value);
  const bytes: number[] = [];
  for (let index = 0; index < encoded.length; index += 1) {
    if (encoded[index] === '%') {
      bytes.push(Number.parseInt(encoded.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(encoded.charCodeAt(index));
    }
  }
  return new Uint8Array(bytes);
}

function bytesToUtf8(bytes: Uint8Array): string {
  const encoded = Array.from(bytes, (byte) => `%${byte.toString(16).padStart(2, '0')}`).join('');
  return decodeURIComponent(encoded);
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function bytesToBase64(bytes: Uint8Array): string {
  let result = '';
  for (let index = 0; index < bytes.length; index += 3) {
    const first = bytes[index];
    const second = bytes[index + 1];
    const third = bytes[index + 2];
    result += BASE64[first >> 2];
    result += BASE64[((first & 3) << 4) | ((second ?? 0) >> 4)];
    result += second === undefined ? '=' : BASE64[((second & 15) << 2) | ((third ?? 0) >> 6)];
    result += third === undefined ? '=' : BASE64[third & 63];
  }
  return result;
}

function base64ToBytes(value: string): Uint8Array | null {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) return null;
  const output: number[] = [];
  for (let index = 0; index < value.length; index += 4) {
    const a = BASE64.indexOf(value[index]);
    const b = BASE64.indexOf(value[index + 1]);
    const c = value[index + 2] === '=' ? 0 : BASE64.indexOf(value[index + 2]);
    const d = value[index + 3] === '=' ? 0 : BASE64.indexOf(value[index + 3]);
    output.push((a << 2) | (b >> 4));
    if (value[index + 2] !== '=') output.push(((b & 15) << 4) | (c >> 2));
    if (value[index + 3] !== '=') output.push(((c & 3) << 6) | d);
  }
  return new Uint8Array(output);
}

function getEncryptionKey(): Promise<AESEncryptionKey> {
  if (!encryptionKeyFlight) {
    encryptionKeyFlight = (async () => {
      const storedKey = await SecureStore.getItemAsync(ENCRYPTION_KEY_NAME);
      if (storedKey) return AESEncryptionKey.import(storedKey, 'hex');

      const key = await AESEncryptionKey.generate();
      await SecureStore.setItemAsync(ENCRYPTION_KEY_NAME, await key.encoded('hex'));
      return key;
    })().catch((error: unknown) => {
      encryptionKeyFlight = null;
      throw error;
    });
  }
  return encryptionKeyFlight;
}

function additionalData(userId: string): Uint8Array {
  return utf8ToBytes(`shoonaya:kul-snapshot:v${KUL_SNAPSHOT_CACHE_SCHEMA_VERSION}:${userId}`);
}

async function encryptEnvelope(envelope: KulSnapshotCacheEnvelope, userId: string): Promise<string> {
  const key = await getEncryptionKey();
  const sealed = await aesEncryptAsync(utf8ToBytes(JSON.stringify(envelope)), key, {
    additionalData: additionalData(userId),
  });
  const combined = await sealed.combined();
  return JSON.stringify({ schemaVersion: KUL_SNAPSHOT_CACHE_SCHEMA_VERSION, ciphertext: bytesToBase64(combined) });
}

async function decryptEnvelope(value: string, userId: string): Promise<unknown> {
  const outer: unknown = JSON.parse(value);
  if (!outer || typeof outer !== 'object' || Array.isArray(outer)) return null;
  const record = outer as Record<string, unknown>;
  if (record.schemaVersion !== KUL_SNAPSHOT_CACHE_SCHEMA_VERSION || typeof record.ciphertext !== 'string') return null;
  const ciphertext = base64ToBytes(record.ciphertext);
  if (!ciphertext) return null;
  const key = await getEncryptionKey();
  const plaintext = await aesDecryptAsync(
    AESSealedData.fromCombined(ciphertext),
    key,
    { additionalData: additionalData(userId), output: 'bytes' },
  );
  if (typeof plaintext === 'string') return JSON.parse(plaintext);
  return JSON.parse(bytesToUtf8(plaintext));
}

export async function readKulSnapshotCache(
  userId: string,
  now = Date.now(),
): Promise<{ snapshot: KulSnapshot; savedAt: number } | null> {
  const key = cacheKey(userId);
  let stored: Awaited<ReturnType<typeof cacheStorage.read>> = null;
  try {
    stored = await cacheStorage.read(key);
    if (!stored) return null;
    const envelope = await decryptEnvelope(stored.value, userId);
    if (!isUsableKulSnapshotCacheEnvelope(envelope, userId, now)) {
      await stored.discard().catch(() => {});
      return null;
    }
    return { snapshot: envelope.snapshot, savedAt: envelope.savedAt };
  } catch {
    await stored?.discard().catch(() => {});
    // Local cache failure must never block the authoritative API request.
    return null;
  }
}

export async function writeKulSnapshotCache(snapshot: KulSnapshot, now = Date.now()): Promise<void> {
  try {
    const cacheSafeSnapshot = removeKulInviteCodeFromCachedSnapshot(snapshot);
    const envelope: KulSnapshotCacheEnvelope = {
      schemaVersion: KUL_SNAPSHOT_CACHE_SCHEMA_VERSION,
      userId: snapshot.userId,
      savedAt: now,
      snapshot: cacheSafeSnapshot,
    };
    await cacheStorage.setItem(cacheKey(snapshot.userId), await encryptEnvelope(envelope, snapshot.userId));
  } catch {
    // Best-effort cache writes never change the live request or mutation result.
  }
}

export async function clearKulSnapshotCache(userId: string): Promise<void> {
  await cacheStorage.removeItem(cacheKey(userId)).catch(() => {});
}

export async function clearAllKulSnapshotCaches(): Promise<void> {
  await cacheStorage.clearAll().catch(() => {});
}
