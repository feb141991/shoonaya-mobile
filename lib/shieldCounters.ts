export type ShieldCounters = { latestStreakCount: number; totalJapaSessions: number };
type Fetcher = (path: string, options: { expectedUserId: string }) => Promise<Response>;

/** Older backends lack this route. Only a 404 permits the heavier compatibility read. */
export async function fetchShieldCounters(userId: string, fetcher: Fetcher): Promise<ShieldCounters> {
  let response = await fetcher('/api/native/progress/shields', { expectedUserId: userId });
  const legacy = response.status === 404;
  if (legacy) response = await fetcher('/api/native/progress', { expectedUserId: userId });
  if (!response.ok) throw new Error('Shield counters unavailable');
  const payload = await response.json();
  const count = payload.totalJapaSessions;
  let streak = payload.latestStreakCount;
  if (legacy) {
    if (!Array.isArray(payload.sadhana182d)) throw new Error('Invalid progress response');
    const rows = payload.sadhana182d as Array<{ date: string; streak_count: number | null }>;
    streak = [...rows].sort((a, b) => b.date.localeCompare(a.date))[0]?.streak_count ?? 0;
  }
  if (!Number.isInteger(streak) || streak < 0 || !Number.isInteger(count) || count < 0) {
    throw new Error('Invalid shield counters');
  }
  return { latestStreakCount: streak, totalJapaSessions: count };
}
