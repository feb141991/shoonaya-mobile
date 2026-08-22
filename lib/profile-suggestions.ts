export type ProfileSuggestion = {
  key: string;
  label: string;
  reason: string;
  route: string;
  priority: number;
  context: 'personal_details' | 'personalisation' | 'general';
};

export function getVisibleProfileSuggestions(
  suggestions: readonly ProfileSuggestion[] | null | undefined,
  limit = 2,
): ProfileSuggestion[] {
  if (!suggestions || limit <= 0) return [];
  return [...suggestions]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}
