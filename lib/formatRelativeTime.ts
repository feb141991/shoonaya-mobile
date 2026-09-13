/**
 * Formats a timestamp into a compact, human-readable relative time string
 * (e.g. 'just now', '5m ago', '2h ago', '3d ago', '13 Sep').
 * Matches PWA src/lib/utils.ts formatRelativeTime with clock-skew guard.
 */
export function formatRelativeTime(date: string | Date, now = new Date()): string {
  const then = new Date(date);
  const diffMs = Math.max(0, now.getTime() - then.getTime());
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return then.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}
