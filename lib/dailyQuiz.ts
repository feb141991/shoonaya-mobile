import { apiFetch } from './api';
import { supabase } from './supabase';
import { dailyQuizRequestKey, quizRequestSharing } from './quizRequests';
import type { DailyQuiz, QuizCacheIdentity, TodayQuizResponse } from './quizCache';
import type { AppLanguage } from './language-runtime';

export function loadDailyQuiz(scope: {
  identity: QuizCacheIdentity; identityRevision: number; tradition: string;
  timezone: string; date: string; language: AppLanguage;
}): Promise<{ quiz: DailyQuiz | null; todayResponse: TodayQuizResponse | null }> {
  const identity = scope.identity;
  const key = dailyQuizRequestKey({ ...scope, identity: identity.kind === 'guest' ? 'guest' : `user:${identity.userId}` });
  return quizRequestSharing.run(key, async () => {
    const [response, saved] = await Promise.all([
      apiFetch(`/api/quiz/daily?tradition=${encodeURIComponent(scope.tradition)}&date=${scope.date}&language=${scope.language}`,
        identity.kind === 'guest' ? { expectedGuest: true } : { expectedUserId: identity.userId }),
      identity.kind === 'authenticated' ? supabase.from('quiz_responses')
        .select('chosen_index, correct_index, is_correct, explanation, question, date')
        .eq('user_id', identity.userId).eq('date', scope.date).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);
    if (saved.error) throw saved.error;
    if (!response.ok && response.status !== 404) throw new Error('Daily quiz unavailable');
    const quiz = response.ok ? await response.json() as DailyQuiz : null;
    return { quiz, todayResponse: saved.data as TodayQuizResponse | null };
  });
}
