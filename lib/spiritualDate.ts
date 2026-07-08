// Extracted from two byte-identical copies (app/quiz.tsx and
// app/dharm-veer.tsx both had their own `spiritualDate`) into one shared
// source, rather than adding a third copy for app/shloka.tsx — the
// "spiritual day" boundary (rolls over at 4am local time, not midnight,
// matching how a lot of daily-practice apps treat "still tonight" vs
// "already tomorrow") is domain logic, not something that should silently
// drift between three independent copies.
export function spiritualDate(timezone: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
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
}
