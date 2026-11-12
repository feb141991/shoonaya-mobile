# Privacy implementation audit, 2026-11-12

Engineering evidence, not legal advice and not a statement that the product is or is not legally compliant. It compares what the
privacy policy and the app say with what the code and the production database do. Items marked NOT VERIFIED could not be checked:
the production database was restarting during this audit, so every live-database check below the "Checked in the database before the
restart" heading was made earlier in the session.

Sources: Native repo `shoonaya-mobile` (HEAD `02b3e9b`), backend repo `Shoonaya` (`6c922a3`), production Supabase project,
`src/lib/privacy-content.ts` (policy text), `docs/PRIVACY_SECURITY_BASELINE.md` (machine-generated inventory).

## 1. What is built as described (verified)

| Claim | Evidence |
|---|---|
| Optional measurement is off unless turned on | `consent_product_analytics`, `consent_notification_taps`, `consent_activity_personalization`, `consent_religious_data` are `NOT NULL DEFAULT false` |
| Consent is enforced by the database, not only the app | The functions that accept analytics events and notification taps check the consent themselves and refuse when off |
| Turning a consent off deletes what it collected | Triggers on `profiles` purge analytics events and notification taps on withdrawal; both installed and enabled |
| Retention periods match the policy | Active daily jobs: product analytics 90 d, notification taps 90 d, API and auth diagnostics 30 d, startup telemetry 30 d, client errors 30 d, resolver events 90 d, AI answer cache by expiry, Sanskāra retention and consent purge |
| Account deletion removes taps and telemetry | `notification_taps` and `native_startup_telemetry_summaries` cascade on user deletion |
| Row-level security | Enabled on every public table except PostGIS `spatial_ref_sys` (a reference table) |
| Web analytics and ads wait for consent | `WebConsentManager.tsx` loads Google Analytics, Vercel Analytics and Speed Insights only if analytics consent is on, and AdSense only if advertising consent is on; both default to false; withdrawing clears vendor state |
| Sign-in tokens in the device keychain | `lib/supabase.ts` uses `expo-secure-store` with `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` |
| No advertising or tracking SDKs in the app | No ad, attribution or analytics SDK in `package.json` apart from the two noted below; iOS manifest says tracking is false; no App Tracking Transparency prompt |
| Location is foreground only | iOS `WhenInUse` string only; Android fine and coarse location, no background location |
| Diagnostics do not identify people | API and auth diagnostics tables have no user id; startup telemetry is linked to the account and the policy says so and says 30 days |

## 2. Gaps, ranked

1. **Children (highest).** `age-guidance.ts` records `accountAccess: allowed_without_age_block`, `verifiedParentalConsentImplemented: false`
   and `legalReviewStatus: pending`. The policy says the same, honestly. India's DPDP Act requires verifiable parental consent for
   people under 18 and restricts tracking of them; the app has neither, and few accounts have a date of birth, so minors cannot be
   identified. Needs a counsel decision and probably a product decision.
2. **Data export is incomplete.** `/api/user/export` reads 10 tables. About 100 tables hold user-linked data. Missing include journal
   entries and reflections, Sankalpa, name stories, birth profiles, Mandali posts and comments, Kutumb data, Pathshala progress,
   Tirtha, vrat observations, push tokens, notifications and consent records. The policy says you can "download an export of your
   account data". Sanskāra has its own export by design.
3. **Deletion completeness needs re-verification.** Last verified 2026-10-07. Open then: 19 tables where user content is kept with the
   author set to null, and `pathshala_study_circles.created_by`. Tables added since (Sanskāra, tap tracking, consent ledgers) have
   not been re-checked. NOT VERIFIED today (database down).
4. **Proof of consent.** The four consents are booleans with one shared `consent_updated_at`: no per-consent time, wording version or
   screen. `legal_acceptances` (document, version, surface, time) and the e-mail consent ledger are the models to copy.
5. **Policy omissions.** The policy never names Google AdSense or advertising cookies, although the cookie banner offers an
   "advertising" category. Several processors in the engineering baseline are named only generically in the policy (AI provider
   Sarvam AI, Twilio, Razorpay). International transfers are not mentioned.
6. **Contact points.** The "Grievance Officer" and "Data Protection Representative" are one generic address (`info@shoonaya.com`) with
   no named person or postal address. DPDP and GDPR (Article 27 representative) expect more. Counsel question.
7. **iOS privacy manifest** (`app.json`): lists PreciseLocation for "Analytics" although location is not sent to analytics (an
   over-declaration); omits Diagnostics and Performance Data although the hourly summary is linked to the account; has no
   required-reason API list (libraries may supply their own). The App Store Connect privacy label must agree with it.
8. **Dependencies.** `expo-insights` is installed but not imported or configured: remove it, or confirm it collects nothing.
   `@react-native-firebase/app` is present for Android sign-in and push configuration.
9. **Legacy table.** `device_tokens` still has OneSignal `player_id` and a `user_id`. OneSignal is retired: confirm the table is empty
   and drop it. NOT VERIFIED (database down).

## 3. Not checked

- The Supabase security advisor (timed out), grants on views and functions, `SECURITY DEFINER` exposure.
- The foreign-key and cascade matrix for every user table.
- The reporting floor of 20 accounts for product analytics (code and function not read).
- Terms and consent screens in Hindi and Punjabi, store data-safety forms, breach-notification process, data-processing agreements.

## 4. Suggested order

1. Counsel decision on minors (gap 1), then build what it requires.
2. Widen the export, or state in the policy exactly what it contains (gap 2).
3. Re-run the deletion foreign-key audit and add a guard test (gap 3).
4. Fix the policy text and the privacy manifest (gaps 5 to 7).
5. Remove `expo-insights` and the legacy table (gaps 8 and 9).

## 5. Status after the follow-up work (2026-11-12, later the same day)

Everything below is committed, none of it is pushed, and every database change is **unapplied**. Backend commits `76c95eb` to `f06bc68`,
Native `dbb3b4c` to `74e540e`.

| Gap | Status |
|---|---|
| 1 Children | Not built. A decision is needed (suggestion given in chat). The only sign-up message is `AgeGuidanceNotice` on the date-of-birth step: informational, no acknowledgement, no record, no change in behaviour for a minor. |
| 2 Export | Built (`726a457`): 72 more tables, paged, secrets redacted, `export_notes` lists what is left out and any table not read in full; a guard test forces every new user table to be exported or excluded with a reason. Not deployed. After the consent ledger is applied, add `consent_events` to the registry. |
| 3 Deletion | Migration `20261112130000` written and tested on scratch (unapplied): fixes the blocking foreign key on `kul_family_link_invitations`, the dangling `pathshala_study_circles.created_by`, push-token events that kept device tokens, missing 90-day retention on three notification logs, and orphaned family circles. `scripts/audit/account-deletion-foreign-keys.sql` reruns the check. **Still a decision:** content kept after its author leaves (thread messages, family records, place media and notes, Sanskara records, 9 Tirtha places). |
| 4 Proof of consent | Built (`f06bc68`, `74e540e`): append-only hash-chained ledger written by a trigger on every change, wording registry with SHA-256, context sent by every Native write path, cross-repo pinned checksums. Migration `20261112140000` unapplied. Existing consents will show as `before_ledger`. **Still a decision:** whether proof of consent outlives the account. |
| 5 Policy omissions | Done (`7d63dcf`), not deployed: AdSense and every processor named with what it receives, storage in Ireland, advertising choice explained. |
| 6 Contact | Prince Sharma named as Grievance Officer and data-protection contact. **Open for counsel:** a postal address, and whether an EU/UK representative under GDPR Article 27 must be named, which must be a person or company established in the UK or EU. |
| 7 iOS manifest | Done (`a5d3744`); needs a native iOS build, and the App Store Connect label must agree. |
| 8 `expo-insights` | Removed (`dbb3b4c`). |
| 9 `device_tokens` | Migration `20261112120000` written and tested on scratch (unapplied). |

### New findings from the live checks

## 6. Migration/deploy reconciliation (2026-11-12, later check)

The status sentence in section 5 is a historical snapshot, not the current
deployment state. A read-only `supabase migration list --linked` check against
the linked production project found the following:

| Migration | Production state | Native/backend impact |
|---|---|---|
| `20261110100000_profile_tradition_lock` | Applied | No pending dependency identified in this release set. |
| `20261110140000_one_nudge_a_day_cadence` | Applied | Notification cadence is live. |
| `20261111100000_notification_tap_tracking` | Applied | The Native tap route can use `record_notification_tap`. |
| `20261112100000_notification_reminders_default_on_except_brahma` | Applied | Reminder defaults are live. |
| `20261112110000_notification_brahma_opt_in_reset` | Applied | Brahma opt-in reset is live. |
| `20261112120000_drop_legacy_device_tokens` | Applied | Legacy device-token retirement is live. |
| `20261112130000_account_deletion_completeness_and_retention` | Applied | Database deletion cascades and retention jobs are live; backend route deployment still needs separate verification. |
| `20261112140000_consent_evidence_ledger` | Applied | Consent context is now captured by the database ledger. Existing pre-ledger consents remain explicitly marked `before_ledger`. |
| `20261112150000_drop_profiles_onesignal_player_id` | Applied | The final OneSignal profile-column retirement is live. |

The Native privacy commits are local-only (`f93427b` is 13 commits ahead of
`origin/main`), and the backend is local-only (`5fccf67` is 9 commits ahead of
`origin/main`). No migration or deployment was performed for this
reconciliation. The remaining release order is: deploy and verify the reviewed
backend routes/code for export, deletion and consent-ledger export support,
then release the Native build with the privacy manifest and perform device
verification. The consent UI and database ledger are now active; existing
consents remain explicitly classified as `before_ledger`.

The migrations are now applied, but the schema state must not be confused with
backend release state. The consent ledger requires generated-type/export
follow-up in the deployed backend, and the deletion/export routes still need a
release verification against the applied schema. The repository rule against
`supabase db push` still applies.

This reconciliation did not change files in the backend, apply a migration,
push a branch, or modify production data.

- **Mandali posts are readable by anyone with the app's public key.** The select policies on `posts`, `post_comments`, `forum_threads`,
  `forum_replies`, `post_upvotes`, `comment_upvotes` and `event_rsvps` are `USING (true)` for everyone, including signed-out callers. On
  2026-11-12 the public key could count 44 posts and 7 post upvotes (with user ids). Private tables (journal, mood, notifications, profiles,
  Kutumb members) were correctly closed. The app's membership, block and hidden-content rules are enforced in API routes, not by these policies.
  Needs a decision on who may read a post, then a migration after auditing every reader.
- **Auth:** leaked-password protection is disabled (Supabase Auth setting).
- **Advisor:** 56 `SECURITY DEFINER` functions are executable by signed-in users; the ones I read derive the user from `auth.uid()`.
  `st_estimatedextent` (PostGIS) is executable by anonymous callers. `pgtap` and its views sit in `public`.
- **Generated types were stale** (missing `notification_taps`); regenerated in `f44d8c0`.

Verified by a direct production read later the same day (2026-11-12): migrations `20261112120000` to `20261112150000` are applied. `device_tokens`
and `profiles.onesignal_player_id` are gone, `consent_events` holds 17 rows and every chain verifies, `consent_wording` has its 7 wordings, and
the four new retention jobs are scheduled. `20261112160000` (voter identities) is **not** applied.

## 7. Services review and Mandali guest read (2026-11-12, later)

**Retired (committed in the backend, not yet deployed):** WhatsApp sending and login (Twilio and Meta): the OTP routes and page, the login button,
the unscheduled daily WhatsApp route, the provider, the `twilio` package and the WhatsApp step of the retired web onboarding. Evidence it was unused:
0 stored WhatsApp numbers, 0 phone sign-ins, 0 WhatsApp dispatches, no Native caller. Marketing keeps the channel for drafts and dry runs; a live
dispatch is refused everywhere. The Gemini label, the OneSignal admin option and comments, and the `maps.mail.ru` Overpass mirror are removed (a test
now fails if a map host outside the reviewed three is added). The OneSignal column drop is applied.

**Policy now names:** Supabase (Ireland), Vercel, Expo, Firebase Cloud Messaging, Sarvam AI, Bhashini, Resend, Geoapify, OpenStreetMap Nominatim and
Overpass, Slack (report alerts carry the content kind, reason category and a report reference, never the reporter's text), YouTube, Google Analytics
and AdSense (website, with consent). A test fails if a retired service is named or a named one disappears.

**Still to confirm outside the code:** whether `NEXT_PUBLIC_GA_MEASUREMENT_ID` and `NEXT_PUBLIC_ADSENSE_CLIENT` are set in Vercel (the live homepage
contains neither id, so GA and AdSense appear not to be configured); whether `BHASHINI_API_KEY` is set; Twilio and Meta account and key cleanup in
the vendors' dashboards and Vercel environment variables (the code no longer reads them). Historic `notification_deliveries` rows with provider
`onesignal` (301) age out through the 90-day job.

**Children:** founder decision, no parent verification and no limited mode: the existing notice and the opt-in toggles stay. Residual risk accepted
pending counsel: DPDP expects verifiable parental consent for people under 18.

**Mandali, founder decision:** a signed-out person may read posts; everything else needs an account.
- Built, not deployed: `GET /api/mandali/public-feed` (posts, public username and avatar, counts; no account or Mandali ids, no who-reacted, no comments,
  poll votes, RSVPs or members; banned and deleting accounts excluded; rate limited; cached 30 s) and the app's `GuestMandaliFeed` with sign-in prompts
  on react, comment, share, post menu and profile.
- Written, **unapplied**: `20261112160000` limits who-upvoted and who-RSVP'd to signed-in users. Posts and comments keep their public SELECT.
- **Order:** deploy the backend route before the app update, and apply `…160000` any time after the route is live (nothing the app does reads those
  tables as a signed-out user).
