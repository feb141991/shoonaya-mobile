// Chosen-display-name precedence, matching the backend's own
// getDisplayName/getFirstName in
// src/app/api/native/home-summary/route.ts (Sanatan Sangam/Shoonaya):
// the user's own chosen name wins, blank/whitespace falls through to
// username, and both are trimmed before comparison. Home already sends
// its own precomputed `firstName`; this is for screens (e.g. Mandali's
// /api/mandali/feed) whose DTO carries the raw full_name/username fields
// instead of a precomputed display name.
export function resolveDisplayName(
  fullName: string | null | undefined,
  username: string | null | undefined,
  fallback = 'Seeker'
): string {
  const trimmedFullName = fullName?.trim();
  if (trimmedFullName) return trimmedFullName;
  const trimmedUsername = username?.trim();
  if (trimmedUsername) return trimmedUsername;
  return fallback;
}
