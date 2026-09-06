/**
 * Non-enumerating sign-in error copy. Supabase returns the identical
 * "Invalid login credentials" message whether an email has no account at
 * all or the password for a real account is simply wrong -- surfacing
 * anything more specific than that (or varying the copy) would let an
 * attacker distinguish which emails are registered. Anything else
 * (network failure, rate limit, etc.) is not credential-shaped and is
 * safe -- and more helpful -- to show as-is.
 */
export function classifySignInErrorMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  const isCredentialError = lower.includes('invalid login') || lower.includes('invalid credentials');
  return isCredentialError
    ? 'Incorrect email or password. Try again, or reset your password below.'
    : rawMessage;
}
