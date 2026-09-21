/**
 * Auth Error Classification & Sanitization
 *
 * Rules:
 * 1. NEVER leak raw JSON, HTTP status codes, Supabase URLs, or stack traces to end users.
 * 2. Maintain non-enumeration security for credential checks (same message for wrong password / no account).
 * 3. Guide users with actionable instructions (e.g. if account already exists, prompt to tap "Sign in").
 * 4. Handle OAuth cancellations silently without showing an error banner.
 */

export function sanitizeRawError(raw: unknown): string {
  if (!raw) return 'An unexpected error occurred. Please try again.';
  const str = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : JSON.stringify(raw);
  const trimmed = str.trim();

  // If the message is a raw JSON payload, or contains status codes / URLs, sanitize it:
  if (
    trimmed.startsWith('{') ||
    trimmed.includes('"status":') ||
    trimmed.includes('status: 500') ||
    trimmed.includes('supabase.co') ||
    trimmed.includes('fetch failed') ||
    trimmed.includes('AuthRetryableFetchError')
  ) {
    return 'Authentication service is temporarily unavailable. Please check your connection and try again.';
  }

  return trimmed;
}

export function classifySignInErrorMessage(rawMessage: unknown): string {
  const sanitized = sanitizeRawError(rawMessage);
  const lower = sanitized.toLowerCase();

  if (lower.includes('invalid login') || lower.includes('invalid credentials')) {
    return 'Incorrect email or password. Try again, or reset your password below.';
  }

  // If sanitizeRawError intervened (e.g. raw JSON or status 500), return sanitized copy.
  // Otherwise, pass through clean plain messages (like 'Network request failed', 'Too many requests')
  return sanitized;
}

export function classifySignUpErrorMessage(rawMessage: unknown): string {
  const sanitized = sanitizeRawError(rawMessage);
  const lower = sanitized.toLowerCase();

  // Account already exists (or attempted duplicate registration)
  if (
    lower.includes('already registered') ||
    lower.includes('already in use') ||
    lower.includes('user already exists') ||
    lower.includes('email already taken')
  ) {
    return 'An account with this email already exists. Please tap "Sign in" above to log in.';
  }

  // Email sending / server error (e.g. SMTP 500 or confirmation email failure)
  if (
    lower.includes('confirmation email') ||
    lower.includes('error sending') ||
    lower.includes('temporarily unavailable')
  ) {
    return 'Unable to send verification email right now. If your account already exists, please tap "Sign in" above.';
  }

  if (lower.includes('at least 6 characters') || lower.includes('password')) {
    return 'Password must be at least 6 characters long.';
  }

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many signup attempts. Please wait a few moments before trying again.';
  }

  if (lower.includes('network request failed') || lower.includes('network error')) {
    return 'Could not connect to service. Please check your internet connection and try again.';
  }

  return sanitized;
}

export function classifyForgotPasswordErrorMessage(rawMessage: unknown): string {
  const sanitized = sanitizeRawError(rawMessage);
  const lower = sanitized.toLowerCase();

  if (lower.includes('rate limit') || lower.includes('too many')) {
    return 'Too many reset requests. Please wait a few minutes before trying again.';
  }
  if (lower.includes('network request failed') || lower.includes('network error') || lower.includes('temporarily unavailable')) {
    return 'Could not send reset link. Please check your internet connection and try again.';
  }

  return sanitized;
}

export function classifyOAuthErrorMessage(raw: unknown, provider: 'Google' | 'Apple'): string | null {
  if (!raw) return null;
  const str = typeof raw === 'string' ? raw : raw instanceof Error ? raw.message : String(raw);
  const lower = str.toLowerCase();

  // User canceled / dismissed the popup or sheet -> do not show any error alert
  if (
    lower.includes('canceled') ||
    lower.includes('cancelled') ||
    lower.includes('err_request_canceled') ||
    lower.includes('12501') || // Google SIGN_IN_CANCELLED
    lower.includes('dismissed')
  ) {
    return null;
  }

  // Network or service failure
  if (lower.includes('network') || lower.includes('offline') || lower.includes('temporarily unavailable')) {
    return `${provider} sign-in could not connect. Please check your connection and try again.`;
  }

  // Simulator note for Apple
  if (
    provider === 'Apple' &&
    (str.includes('AuthenticationServices.AuthorizationError') || str.includes('Apple authorization failed'))
  ) {
    return 'Apple sign-in could not start on this device. Use email or Google, or test Apple on a signed-in device.';
  }

  return `${provider} sign-in failed. Please try again or use email.`;
}
