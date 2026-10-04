import type { AppLanguage } from '@/lib/language-runtime';

/**
 * Format the server's spiritual-day ISO date without allowing the device's
 * local timezone to shift it to the previous or next civil date.
 */
export function formatRashiphalaSpiritualDate(dateIso: string, language: AppLanguage): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return dateIso;

  const stableDate = new Date(`${dateIso}T12:00:00.000Z`);
  if (Number.isNaN(stableDate.getTime()) || stableDate.toISOString().slice(0, 10) !== dateIso) {
    return dateIso;
  }

  const locale = language === 'hi' ? 'hi-IN' : language === 'pa' ? 'pa-IN' : 'en-IN';
  return stableDate.toLocaleDateString(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
