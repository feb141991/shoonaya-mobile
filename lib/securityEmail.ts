import * as Crypto from 'expo-crypto';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { captureAppIdentity } from '@/lib/appIdentity';
import { apiFetch } from '@/lib/api';

const INSTALLATION_ID_KEY = 'shoonaya.security.installation_id.v1';
let installationIdFlight: Promise<string> | null = null;

async function getInstallationId(): Promise<string> {
  if (!installationIdFlight) {
    installationIdFlight = (async () => {
      const existing = await SecureStore.getItemAsync(INSTALLATION_ID_KEY);
      if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) {
        return existing;
      }
      const created = Crypto.randomUUID();
      await SecureStore.setItemAsync(INSTALLATION_ID_KEY, created);
      return created;
    })().catch((error) => {
      installationIdFlight = null;
      throw error;
    });
  }
  return installationIdFlight;
}

/**
 * Best-effort report after an explicit successful sign-in. The server stores
 * only a keyed device digest and queues one alert per account/installation.
 * A failed report never blocks auth routing or sign-in.
 */
export async function reportNewDeviceSignIn(userId: string): Promise<void> {
  const identityLease = captureAppIdentity();
  if (identityLease.identity.kind !== 'authenticated' || identityLease.identity.userId !== userId) return;

  try {
    const installationId = await getInstallationId();
    if (!identityLease.isCurrent()) return;
    await apiFetch('/api/native/security/new-device', {
      method: 'POST',
      expectedUserId: userId,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        installationId,
        platform: Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'other',
      }),
    });
  } catch {
    // Sign-in notification is ancillary and must never fail or delay auth.
  }
}
