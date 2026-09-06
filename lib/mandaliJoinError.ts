const SAFE_JOIN_ERRORS = new Set([
  'Multiple Mandalis match this city. Select a specific Mandali.',
  'City name matches a different location. Select a specific Mandali.',
  'Account is suspended',
  'Profile not found',
  'Invalid coordinates',
  'Membership was not confirmed. Please refresh and try again.',
]);

export function mandaliJoinErrorMessage(error: unknown): string {
  const message = error && typeof error === 'object' && 'message' in error ? error.message : null;
  return typeof message === 'string' && SAFE_JOIN_ERRORS.has(message)
    ? message
    : 'Could not join your Mandali right now. Please try again.';
}
