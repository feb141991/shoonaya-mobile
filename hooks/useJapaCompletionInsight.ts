import { useEffect, useState } from 'react';

import { apiFetch } from '@/lib/api';
import { getSpiritualTimeWindow } from '@/lib/japaPresentation';

export type JapaCompletionStats = {
  rounds: number;
  beads: number;
  durationSecs: number;
  mantraName: string;
};

export function useJapaCompletionInsight(
  visible: boolean,
  stats: JapaCompletionStats | null,
  tradition: string | null,
) {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!visible || !stats) {
      setInsight(null);
      setLoading(false);
      return;
    }
    setInsight(null);
    setLoading(true);

    apiFetch('/api/japa/completion-insight', {
      method: 'POST',
      body: JSON.stringify({
        tradition,
        mantraName: stats.mantraName,
        rounds: stats.rounds,
        totalBeads: stats.beads,
        durationMinutes: Math.max(1, Math.round(stats.durationSecs / 60)),
        timeOfDay: getSpiritualTimeWindow(),
      }),
    })
      .then((response) => response.ok ? response.json() : null)
      .then((data: { insight?: string } | null) => {
        if (data?.insight) setInsight(data.insight);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [stats, tradition, visible]);

  return { insight, loading };
}
