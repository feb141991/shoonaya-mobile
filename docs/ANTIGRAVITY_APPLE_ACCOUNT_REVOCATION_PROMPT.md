# Antigravity Prompt: Sign in with Apple Account-Deletion Revocation

Work across both repositories:

- Native: `/Users/Business(C)/shoonaya-mobile`
- Backend: `/Users/Business(C)/Sanatan Sangam/Shoonaya`

The backend owns the canonical deletion and Apple-token custody contract.

## Objective

Complete Sign in with Apple account deletion correctly. Shoonaya already lets
users schedule deletion and later purges their Supabase user. What is missing
is Apple authorization revocation: the native login currently sends only the
Apple identity token to Supabase and discards `authorizationCode`; the backend
therefore has no Apple refresh/access token to revoke at permanent deletion.

Follow Apple's current TN3194 and `/auth/revoke` documentation. Do not treat a
Supabase `auth.admin.deleteUser()` call as Apple authorization revocation.

## Phase 0: Ground-truth audit

Before editing, trace and print:

1. Native Apple login from `AppleAuthentication.signInAsync()` through
   `supabase.auth.signInWithIdToken()`.
2. Account deletion request, cancellation, scheduled purge and hard-delete
   paths in the backend.
3. Existing secrets/configuration for Apple Team ID, Key ID, App/Services ID,
   and signing key by **name/presence only**. Never print secret values or the
   `.p8` body.
4. Existing auth identity/provider metadata and whether historical Apple users
   have a revocable token. Use aggregate counts only; emit no PII.
5. Current Supabase and Apple documentation, including whether Supabase stores
   or exposes the provider refresh token for native `signInWithIdToken`.

Stop and report if the existing Supabase flow can provide a supported
server-side revocation operation without Shoonaya storing Apple refresh tokens.
Do not invent a duplicate token store if the provider already owns this.

## Required target architecture when Shoonaya must own revocation

1. Native Apple sign-in sends `authorizationCode` once, immediately after a
   successful Supabase session is established, to an authenticated backend
   endpoint. Do not persist it in AsyncStorage, logs, analytics or profile
   metadata.
2. The backend derives user identity from the authenticated session and
   exchanges that one-time code with Apple's `/auth/token` endpoint using a
   short-lived, server-generated client-secret JWT.
3. Store only the resulting Apple refresh token in a private, server-only
   table/schema or an established encrypted secret store. It must not be
   exposed through the Supabase Data API, client-generated database types,
   service logs, exports or admin UI.
4. The Apple private key remains only in encrypted server environment
   configuration. Never commit it, upload it to Native, or prefix it with
   `NEXT_PUBLIC_`/`EXPO_PUBLIC_`.
5. On permanent account purge, revoke the Apple refresh token through
   `POST https://appleid.apple.com/auth/revoke` **before** deleting the only
   token record. Make retry behavior idempotent and auditable without storing
   token values in events.
6. If revocation temporarily fails, do not falsely mark the full purge as
   successful. Define a bounded retry/dead-letter state that does not expose
   or indefinitely retain unrelated user data.
7. Deletion cancellation must not revoke Apple authorization.
8. Historical Apple users without stored tokens follow Apple's documented
   manual-revocation fallback. Add clear user-facing instructions and record
   the limitation honestly; do not fabricate recovery tokens.
9. Handle account recreation and repeated Apple login without duplicate token
   rows or authorization-code replay.

## Security and migration gates

- Create an additive migration with rollback guidance and RLS/privilege review.
- Prefer a private schema. If any table is in `public`, revoke all access from
  `anon` and `authenticated`, enable RLS as defense in depth, and prove direct
  REST access fails.
- Never store an Apple identity token as a substitute for a refresh token.
- Never return provider tokens to Native after exchange.
- Never log Apple codes, tokens, client secrets, authorization headers or PII.
- Validate request size, content type, authentication and one-time-code shape.
- Do not apply a production migration or add paid infrastructure without
  explicit founder approval.

## Tests

At minimum:

- Native transmits authorization code only after authenticated Apple login.
- Non-Apple and failed logins send nothing.
- Endpoint rejects anon, wrong user, malformed and replayed codes.
- Token exchange success is stored once.
- Token exchange and revocation logs contain no secret material.
- Deletion cancellation performs no revocation.
- Due purge revokes before deleting token/account.
- Apple `200` and already-revoked behavior are idempotent.
- Apple transient failure enters retry state and prevents a false completed
  audit result.
- Historical no-token path produces the documented manual-revocation result.

## Verification and delivery

Run both repositories' typechecks and relevant tests, `git diff --check`, and
report passed/failed/skipped counts. Test migrations only in a local/shadow
database. Report every touched file and all environment-variable **names**
required. Produce separate scoped commits per repository; do not push, deploy,
apply production migrations, or trigger builds.

