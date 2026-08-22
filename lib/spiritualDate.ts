/**
 * Safe timezone validation helper that falls back to device timezone
 * or 'Asia/Kolkata' without throwing on invalid/unsupported timezones.
 */
export function safeTimezone(timezone?: string | null): string {
  if (!timezone || typeof timezone !== 'string') {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return timezone;
  } catch {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    } catch {
      return 'Asia/Kolkata';
    }
  }
}

/**
 * Calculates the canonical spiritual date (YYYY-MM-DD) for a given timezone.
 * The spiritual day rolls over at 4:00 AM local time rather than midnight.
 *
 * Supports deterministic mocking via optional `now` parameter.
 */
export function spiritualDate(timezone?: string | null, now: Date = new Date()): string {
  const tz = safeTimezone(timezone);
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find((part) => part.type === 'year')?.value ?? '1970';
    const month = parts.find((part) => part.type === 'month')?.value ?? '01';
    const day = parts.find((part) => part.type === 'day')?.value ?? '01';
    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? '0');
    const baseDate = new Date(`${year}-${month}-${day}T12:00:00Z`);

    if (hour < 4) {
      baseDate.setUTCDate(baseDate.getUTCDate() - 1);
    }

    return baseDate.toISOString().slice(0, 10);
  } catch {
    const utcHours = now.getUTCHours();
    const d = new Date(now);
    if (utcHours < 4) {
      d.setUTCDate(d.getUTCDate() - 1);
    }
    return d.toISOString().slice(0, 10);
  }
}
