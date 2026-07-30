import { apiFetch } from '@/lib/api';

export type ReaderAnalyticsEvent = 
  | 'reader_opened'
  | 'language_toggled'
  | 'transliteration_toggled'
  | 'tts_requested'
  | 'explain_requested'
  | 'content_shared'
  | 'content_copied';

export interface ReaderAnalyticsContext {
  content_type?: string;
  source?: string;
  tradition?: string;
  language?: string;
  has_transliteration?: boolean;
  has_meaning?: boolean;
}

/**
 * Emit a reader analytics event.
 * Non-blocking; fails silently if endpoint unavailable.
 */
export function trackReaderEvent(
  event: ReaderAnalyticsEvent,
  context?: ReaderAnalyticsContext
): void {
  try {
    // Fire-and-forget: don't await or handle errors
    apiFetch('/api/analytics/reader', {
      method: 'POST',
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        context,
        userAgent: 'native-app',
      })
    }).catch(() => {
      // Silent failure is acceptable for analytics
    });
  } catch {
    // Ignore any errors
  }
}

/**
 * Batch-emit multiple reader events.
 * Useful when several toggles happen in quick succession.
 */
export function trackReaderEvents(
  events: Array<{ event: ReaderAnalyticsEvent; context?: ReaderAnalyticsContext }>
): void {
  try {
    apiFetch('/api/analytics/reader/batch', {
      method: 'POST',
      body: JSON.stringify({
        events: events.map(e => ({
          ...e,
          timestamp: new Date().toISOString(),
        })),
        userAgent: 'native-app',
      })
    }).catch(() => {});
  } catch {
    // Ignore
  }
}
