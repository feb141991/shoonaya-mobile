import { Platform } from 'react-native';

import { APP_VERSION } from '@/lib/appVersion';
import {
  attachConsentContext,
  buildConsentContext,
  type ConsentContext,
  type ConsentKey,
  type ConsentSurface,
} from '@/lib/consentWording';

const environment = () => ({ platform: Platform.OS, appVersion: APP_VERSION });

/** The context to send with a consent change on a screen (see lib/consentWording.ts). */
export function consentContext(surface: ConsentSurface, keys: ConsentKey[]): ConsentContext {
  return buildConsentContext(surface, keys, environment());
}

/** For direct profile writes: adds consent_context_in when a consent column is in the payload. */
export function withConsentContext<T extends Record<string, unknown>>(payload: T, surface: ConsentSurface) {
  return attachConsentContext(payload, surface, environment());
}
