# iOS push review — 2026-09-10

## Findings

Read-only `eas credentials -p ios`, production profile, without Apple portal login, shows:

- Project @rds-ventures/shoonaya; bundle com.shoonaya.app.
- Push key developer portal ID 99ZQD3AK85, team 3K78ST7PG3, updated approximately one month ago.
- eas.json separately references 5WWDG75K97 as ascApiKeyId for App Store Connect submission.

This proves a push credential is stored in Expo. It does not prove Apple has not revoked it or prove a delivery. No keys were read, uploaded, rotated or revoked.

The installed expo-constants source/types do not expose isDevice. lib/notifications.ts tested `Platform.OS === 'ios' && !Constants.isDevice` before its try/diagnostic block, silently skipping token registration on physical iPhones. Six permission fallbacks also used this unavailable property and could misreport permission in development.

Live read-only query:

```sql
select platform, count(*) as tokens, max(last_seen_at) as last_seen
from public.push_tokens group by platform;
```

At review time only Android appeared (one token); no iOS token was registered. The last Android observation was 2026-09-08 01:37:14.894956 UTC. Recent token-event aggregation likewise showed Android registrations, with no iOS registration evidence. This is consistent with the early return; it is not a device delivery test.

## Changes

- lib/notifications.ts: remove obsolete device guard, letting expo-notifications report platform/native errors through existing diagnostics. Permission fallback returns false rather than assuming permission in development. No new native dependencies.
- __tests__/ios-push-registration.test.ts: execute the production module against a current-style Expo Constants mock without isDevice. Cover iOS registration + deduplication, permission denial, and APNs failure diagnostics.

## Verification and rollout

Targeted command: `npx tsx --test __tests__/ios-push-registration.test.ts __tests__/notification-permission-prompt.test.ts __tests__/notification-production-surface.test.ts` — 6 passed, 0 failed, 0 skipped.

`npm run typecheck` passed. Scoped diff whitespace check passed. Existing unrelated quiz whitespace is outside this change. Native graph refresh unavailable because the AGENTS.md-listed scripts/graphify-update-source.sh is absent.

Not pushed, deployed, built or installed by this review. Release through the app's compatible update channel or next mobile build, then launch a signed-in physical iPhone with notification permission enabled, confirm an iOS token row, and run an explicitly authorized targeted test with ticket/receipt inspection. Expo credential metadata alone cannot establish delivery or validate the key against Apple.

Credential flow reference: https://docs.expo.dev/push-notifications/sending-notifications/ — Expo issues its Expo push token and forwards delivery through APNs; Apple does not issue an ExponentPushToken.
