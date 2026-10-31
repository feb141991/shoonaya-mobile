/** Only a terminal, explicit authentication rejection can end a session.
 * Transport failures and route-specific 401s must not sign anybody out.
 */
export async function endRejectedSession(
  response: Response,
  token: string | null,
  deps: {
    currentToken: () => Promise<string | null>;
    signOutLocal: () => Promise<unknown>;
  },
): Promise<void> {
  if (response.status !== 401 || !token) return;
  try {
    const body = await response.clone().json();
    if (body?.code !== 'AUTH_REQUIRED') return;
    // A delayed response for account A must never sign out account B.
    if (await deps.currentToken() !== token) return;
    await deps.signOutLocal();
  } catch {
    // An unreadable response or unavailable auth storage is not proof of
    // account deletion. Preserve the original response for the caller.
  }
}
