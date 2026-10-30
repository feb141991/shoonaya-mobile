/** Request coalescing only: no settled calendar data is retained without a server day/profile/content version. */
export function createQuizRequestSharing() {
  let generation = 0;
  const pending = new Map<string, Promise<unknown>>();
  return {
    run<T>(key: string, load: () => Promise<T>): Promise<T> {
      const current = pending.get(key);
      if (current) return current as Promise<T>;
      const started = generation;
      const request = Promise.resolve().then(load).then((value) => {
        if (started !== generation) throw new Error('Quiz request invalidated');
        return value;
      }).finally(() => {
        if (pending.get(key) === request) pending.delete(key);
      });
      pending.set(key, request);
      return request;
    },
    clear() { generation += 1; pending.clear(); },
  };
}

export const quizRequestSharing = createQuizRequestSharing();
export const clearQuizRequests = () => quizRequestSharing.clear();

export function dailyQuizRequestKey(scope: {
  identity: string; identityRevision: number; tradition: string; timezone: string; date: string; language: string;
}): string {
  return JSON.stringify(['daily-quiz-response-v1', scope.identity, scope.identityRevision,
    scope.tradition, scope.timezone, scope.date, scope.language]);
}

/** Server owns calendar profile/day and content revision; sharing ends as soon as this request settles. */
export function festivalQuizRequestKey(scope: { userId: string; identityRevision: number; language: string }): string {
  return JSON.stringify(['festival-quiz-seasons-v1', scope.userId, scope.identityRevision, scope.language]);
}

export type FestivalQuizDay = {
  daySequence: number;
  title: string;
  civilDate: string | null;
  unlocked: boolean;
  answered: { isCorrect: boolean; chosenOptionIdx: number } | null;
  question: { text: string; options: string[]; explanation: string | null; source: string | null } | null;
};
export type FestivalQuizSeason = {
  definitionKey: string;
  title: string;
  status: string;
  currentDay: number | null;
  totalDays: number | null;
  daysUntilStart: number | null;
  year: number;
  days: FestivalQuizDay[];
};
