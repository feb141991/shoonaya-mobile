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
