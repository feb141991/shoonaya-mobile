import * as Crypto from 'expo-crypto';
import { apiFetch } from '@/lib/api';
import { createSanskaraCache } from './sanskaraCache';
import { describeFailure, requestErrorFromResponse } from '@/lib/user-facing-error';
import {
  SanskaraError,
  buildSanskaraPayload,
  guardSanskaraRead,
  guardSanskaraWrite,
  type SanskaraAccess,
  type SanskaraDependent,
  type SanskaraExport,
  type SanskaraOverview,
  type SanskaraReads,
  type SanskaraRecord,
  type SanskaraReminder,
  type SanskaraSharedRecord,
  type SanskaraTimeline,
  type SanskaraWriteResult,
  type SanskaraWrites,
  SANSKARA_REMINDERS_LIVE,
  SANSKARA_SCHEMA_VERSION,
} from './sanskaraContract';

export * from './sanskaraContract';

export class SanskaraConsentRequiredError extends Error {
  constructor(message = 'Religious-data consent is needed before this can be used.') {
    super(message);
    this.name = 'SanskaraConsentRequiredError';
  }
}

export function generateSanskaraUuid(): string {
  return Crypto.randomUUID().toLowerCase();
}

const overviewCache = createSanskaraCache<SanskaraOverview>();

export function clearSanskaraCache(userId?: string): void {
  overviewCache.clear(userId);
}

async function handleReadResponse<K extends keyof SanskaraReads>(
  action: K,
  response: Response,
  userId: string,
): Promise<SanskaraReads[K]> {
  const payload: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 403 && typeof payload === 'object' && payload !== null && (payload as { code?: string }).code === 'sanskara_consent_required') {
      throw new SanskaraConsentRequiredError();
    }
    throw await requestErrorFromResponse(response, { parsedBody: payload, trustServerMessage: true });
  }

  if (!guardSanskaraRead(action, payload)) {
    throw new SanskaraError(500, 'sanskara_incomplete_response');
  }

  return payload;
}

export async function fetchSanskaraOverview(userId: string, forceRefresh = false): Promise<SanskaraOverview> {
  if (!forceRefresh) {
    const cached = overviewCache.get(userId);
    if (cached) return cached;
  }

  const ticket = overviewCache.ticket();
  const [timelineRes, dependentsRes, sharedRes] = await Promise.all([
    apiFetch('/api/native/sanskara/timeline', { expectedUserId: userId }),
    apiFetch('/api/native/sanskara/dependents', { expectedUserId: userId }),
    apiFetch('/api/native/sanskara/shared-with-me', { expectedUserId: userId }),
  ]);

  const [timeline, dependents, shared] = await Promise.all([
    handleReadResponse('timeline', timelineRes, userId),
    handleReadResponse('dependents', dependentsRes, userId),
    handleReadResponse('shared-with-me', sharedRes, userId),
  ]);

  const overview: SanskaraOverview = {
    timeline,
    dependents,
    shared,
  };

  overviewCache.set(userId, overview, ticket);
  return overview;
}

export async function fetchSanskaraAccess(userId: string, subjectId: string): Promise<SanskaraAccess[]> {
  const response = await apiFetch(`/api/native/sanskara/access?subject=${encodeURIComponent(subjectId)}`, {
    expectedUserId: userId,
  });
  return handleReadResponse('access', response, userId);
}

export async function fetchSanskaraReminders(userId: string): Promise<SanskaraReminder[]> {
  const response = await apiFetch('/api/native/sanskara/reminders', {
    expectedUserId: userId,
  });
  return handleReadResponse('reminders', response, userId);
}

export async function executeSanskaraWrite<K extends keyof SanskaraWrites>(
  userId: string,
  action: K,
  input: SanskaraWrites[K],
  customRequestId?: string,
): Promise<SanskaraWriteResult<K>> {
  const requestId = customRequestId ?? generateSanskaraUuid();
  const payload = buildSanskaraPayload(action, input, requestId);

  const response = await apiFetch(`/api/native/sanskara/${action}`, {
    method: 'POST',
    body: JSON.stringify(payload),
    expectedUserId: userId,
  });

  const body: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 403 && typeof body === 'object' && body !== null && (body as { code?: string }).code === 'sanskara_consent_required') {
      throw new SanskaraConsentRequiredError();
    }
    throw await requestErrorFromResponse(response, { parsedBody: body, trustServerMessage: true });
  }

  if (!guardSanskaraWrite(action, body)) {
    throw new SanskaraError(500, 'sanskara_invalid_write_result');
  }

  // Clear cache for this user since data mutated
  clearSanskaraCache(userId);

  return body;
}

export function describeSanskaraFailure(error: unknown, fallbackMessage = 'Unable to complete milestone update. Please try again.'): string {
  if (error instanceof SanskaraConsentRequiredError) {
    return 'Religious-data consent is required before using the Sanskāra tracker. Please update your privacy preferences.';
  }
  return describeFailure(error, fallbackMessage);
}

