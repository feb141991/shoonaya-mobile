# Native Store Privacy Evidence

Generated from `app.json`, installed dependencies and the backend data
inventory; release review updated on 2026-10-12. This is an engineering worksheet, not a submitted
store declaration or legal approval.

## App Store

| Data type | Linked | Tracking | Purpose/evidence |
|---|---:|---:|---|
| Name and email | Yes | No | Account creation and authentication |
| Precise location | Yes | No | Nearby places/community and location-aware calendar |
| Sensitive information | Yes | No | Optional religious/spiritual personalization |
| Photos/videos | Yes | No | Optional profile/community images |
| Other user content | Yes | No | Community posts, comments, reflections and journals |
| User ID | Yes | No | Account and authorization |
| Device ID | Yes | No | Expo/FCM push token delivery |
| Product interaction | Yes, only after separate opt-in | No | Coarse first-party product measurement; no route or content details |
| App diagnostics | Yes | No | Separate reliability telemetry: route labels, timings, cache outcomes and request/auth failure metadata |

`@react-native-firebase/analytics` is absent. Firebase Core remains for app
registration/FCM. Native product analytics is first-party and default-off. It
records at most one allowlisted event per signed-in account/event/UTC day; it
never sends route names, content, prompt keys, mood, location, tradition, or
profile fields. The account-linked table is service-role-only and rows cascade
on account deletion. Users can revoke consent and delete retained events from
Privacy & Data settings. ATT is not added because no cross-company tracking
path is used. Separately, the reliability system uploads account-linked
startup summaries and identity-free request/auth diagnostics without
product-analytics consent. These are restricted operational diagnostics with
30-day server retention, not product-usage events. The operational monitoring
dashboard can show recent startup summaries for troubleshooting; the 20-account
suppression applies to the separate product-measurement report, not this
diagnostic view. Confirm this separate collection, access and purpose with the
privacy owner and store-console reviewer before final store declarations.
`ios.privacyManifests` in `app.json` is the durable Expo source.

## Google Play

Use the following as the engineering mapping in the Data Safety form. Console
wording may change; answer based on the behavior of the submitted build.

| Google category | Collected | Required | Shared | Purpose/evidence |
|---|---:|---:|---:|---|
| Name | Yes | Optional | No* | Account/profile functionality |
| Email address | Yes | Account-dependent | No* | Authentication and support |
| User IDs | Yes | Account-dependent | No* | Authentication and authorization |
| Date of birth | Yes | Optional | No* | Kundali and optional personalisation |
| Precise location | Yes | Optional | No* | Local Panchang and nearby sacred places |
| Photos | Yes | Optional | No* | Profile/community uploads |
| Other user-generated content | Yes | Optional | No* | Mandali, reflections and AI prompts |
| Religious or philosophical beliefs | Yes | Optional | No* | Tradition/profile personalisation |
| Health information | Review conservatively | Optional | No* | Mood/reflection data may fall in this category |
| App interactions | Yes, only after separate opt-in | Optional | No* | Coarse first-party product measurement; account-linked and user-deletable |
| App diagnostics | Yes | Optional | No* | Separate reliability telemetry including route labels/timing and failure metadata; 30-day server retention |
| Device or other IDs | Yes | Optional | No* | Expo/FCM push delivery |

`No*` means no sale or advertising sharing was identified. Before selecting
"not shared," confirm each processor qualifies for Google's service-provider
exception and that contracts/DPAs cover the processing. In particular verify
Supabase, Vercel, Expo/FCM and Sarvam AI handling. AI prompts are user content
sent to a processor to provide Dharma Mitra responses.

Security/deletion answers:

- Data encrypted in transit: **Yes**, subject to final endpoint/TLS check.
- Users can request deletion: **Yes**, in app and at
  https://www.shoonaya.com/data-deletion.
- Account creation: **Yes**.
- Independent security review: answer only if a qualifying review has actually
  been completed; repository tests are not a store-certified security review.
- Data sale: **No** based on current Native architecture.
- Advertising: **No** in the current Native build.

## Apple App Privacy console mapping

Match the console to `expo.ios.privacyManifests.NSPrivacyCollectedDataTypes` in
`app.json`:

- Contact Info: Name, Email Address — linked, not tracking, App Functionality.
- Location: Precise Location — linked, not tracking, App Functionality and
  Product Personalization.
- Sensitive Info — linked, not tracking, Product Personalization.
- User Content: Photos or Videos, Other User Content — linked, not tracking,
  App Functionality.
- Identifiers: User ID, Device ID — linked, not tracking, App Functionality.
- Usage Data: Product Interaction — linked, not tracking, App Functionality and
  Product Personalization.

Before submission, explicitly decide whether optional mood data requires an
additional Apple Health/Fitness or Other Data disclosure. Do not characterize
Shoonaya as providing medical diagnosis or treatment. `NSPrivacyTracking` is
false and no ATT prompt should be declared unless tracking is actually added.

## Manual unknowns

- Final store questionnaire wording and policy-lawful basis.
- Provider backup retention and deletion limitations.
- Whether any future advertising SDK is added; current Native graph has none.
- Confirm final store declarations for account-linked operational diagnostics separately from consent-gated product analytics.
- Store-console answers have not been submitted by this repository change.
