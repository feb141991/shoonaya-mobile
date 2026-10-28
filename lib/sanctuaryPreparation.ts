import type { CachedHomeRenderModel } from './homeCache';
import type { Href } from 'expo-router';
import { sanitizeForHomeCache, validateHomeSummaryPayload } from './homeCache';

export type SanctuaryPreparation = {
  userId: string;
  displayName: string;
  tradition: 'hindu' | 'sikh' | 'buddhist' | 'jain' | 'none';
  language: 'en' | 'hi';
  destination: Href;
  isCurrent: () => boolean;
};

// Ephemeral handoff, never route parameters or persisted personal data. A deep
// link/restart without this handoff goes through normal authenticated Home.
let preparation: SanctuaryPreparation | null = null;
export function beginSanctuaryPreparation(value: SanctuaryPreparation): void { preparation = value; }
export function getSanctuaryPreparation(): SanctuaryPreparation | null { return preparation; }
export function clearSanctuaryPreparation(value: SanctuaryPreparation): void {
  if (preparation === value) preparation = null;
}

export function sanctuaryFirstName(name: string, language: 'en' | 'hi'): string {
  return name.trim().split(/\s+/)[0] || (language === 'hi' ? 'साधक' : 'Seeker');
}

/** One bounded warm-up, not another calendar fetch/retry system. Cancelled or
 * stale-account responses must never seed Home. No date is computed here. */
export async function prepareSanctuaryHome(deps: {
  fetchSummary: (signal: AbortSignal) => Promise<Response>;
  cacheHome: (payload: CachedHomeRenderModel) => Promise<void>;
  isCurrent: () => boolean;
  signal: AbortSignal;
  timeoutMs?: number;
}): Promise<'ready' | 'deferred' | 'cancelled'> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let cancel: () => void = () => {};
  const cancelled = new Promise<'cancelled'>(resolve => {
    cancel = () => { controller.abort(); resolve('cancelled'); };
    deps.signal.addEventListener('abort', cancel, { once: true });
    if (deps.signal.aborted) cancel();
  });
  const work = (async (): Promise<'ready' | 'deferred' | 'cancelled'> => {
    if (controller.signal.aborted || !deps.isCurrent()) return 'cancelled';
    const response = await deps.fetchSummary(controller.signal);
    if (controller.signal.aborted || !deps.isCurrent()) return 'cancelled';
    if (!response.ok || response.headers.get('X-Shoonaya-Degraded-Sections')?.split(',').some(s => s.trim() === 'profile')) return 'deferred';
    const raw: unknown = await response.json();
    if (!validateHomeSummaryPayload(raw)) return 'deferred';
    const fields = raw as { date: { iso?: unknown; timezone?: unknown }; profile: { tradition?: unknown } };
    if (typeof fields.date.iso !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(fields.date.iso)
      || typeof fields.date.timezone !== 'string' || !fields.date.timezone
      || typeof fields.profile.tradition !== 'string' || !fields.profile.tradition) return 'deferred';
    const payload = sanitizeForHomeCache(raw);
    if (controller.signal.aborted || !deps.isCurrent()) return 'cancelled';
    await deps.cacheHome(payload);
    return controller.signal.aborted || !deps.isCurrent() ? 'cancelled' : 'ready';
  })().catch(() => controller.signal.aborted || !deps.isCurrent() ? 'cancelled' as const : 'deferred' as const);
  const deadline = new Promise<'deferred'>(resolve => {
    timer = setTimeout(() => { controller.abort(); resolve('deferred'); }, deps.timeoutMs ?? 8000);
  });
  try { return await Promise.race([work, cancelled, deadline]); }
  finally {
    if (timer) clearTimeout(timer);
    deps.signal.removeEventListener('abort', cancel);
  }
}
