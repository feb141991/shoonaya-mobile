# Profile Wiring Acceptance

Validated against the native and backend production paths on 2026-08-22.

## Contract Matrix

| Field | Storage | Onboarding write | Later edit | Current consumer | Skip/null behavior | Later reminder |
| --- | --- | --- | --- | --- | --- | --- |
| Tradition | `profiles.tradition` | Early preference save and final onboarding payload | Locked after onboarding | Home, Nitya, calendar and content filters | Required before onboarding continues | Not applicable |
| App language | `profiles.app_language` | Early preference save and final payload | Settings and Profile | Native content and AI language routing | Required; `en`, `hi`, `pa` accepted after onboarding | Not applicable |
| Meaning language | `profiles.meaning_language` | Set to the selected onboarding language | Settings | Reader and AI meaning selection | Independent after onboarding | Not applicable |
| Transliteration language | `profiles.transliteration_language` | Existing database/default value | Settings | Reader transliteration selection | Independent and nullable/defaulted by existing profile data | Not applicable |
| Full name | `profiles.full_name` | Final onboarding payload | Profile | Greeting and profile identity | Falls back to authenticated account identity during onboarding | Core-profile suggestion/state |
| Date of birth | `profiles.date_of_birth` | Final onboarding payload | Personal details | Birth-profile and age-aware surfaces | Optional, persisted as null | Profile suggestion routes to Personal details when relevant |
| Gender context | `profiles.gender_context` | `female`, `general`, or null | Personal details | Nitya practice variants | Optional; no inference from stored `general` | Personal details remains available |
| Life stage | `profiles.life_stage` | Final onboarding payload | Personal details and Nitya Ashrama | Nitya/Ashrama duties | Optional, persisted as null | Profile suggestion routes to Personal details |
| Rashi | `profiles.rashi` | Hindu onboarding only | Personalisation and Panchang picker | Rashiphala and Panchang | Cleared/hidden for non-Hindu profiles | Profile suggestion plus one-session Panchang prompt |
| Nakshatra | `profiles.nakshatra` | Hindu onboarding only | Personalisation | Stored birth-star personalisation | Cleared/hidden for non-Hindu profiles | Profile suggestion routes to Personalisation |
| Gotra | `profiles.gotra` | Hindu onboarding only | Personalisation | Family/Kul profile data | Trimmed; blank becomes null; hidden for non-Hindu profiles | Profile suggestion routes to Personalisation |
| Calendar profile | `profiles.calendar_profile` | Hindu onboarding only | Personalisation | Calendar API requests | Optional; hidden for non-Hindu profiles | Profile suggestion plus one-session Vrat prompt |
| Calendar scope | `profiles.calendar_scope` | Hindu onboarding only | Personalisation | Calendar API filtering | Optional; hidden for non-Hindu profiles | Profile suggestion plus one-session Vrat prompt |
| Goals | `profiles.onboarding_goal` | Final onboarding payload | Personalisation | Personalisation metadata | Optional and does not affect core completion | Suggested only after meaningful practice history |
| Notification preferences | `profiles.wants_*` | Enabled only when user intent and live OS permission both allow it | Settings toggles | Notification cron audience selection | Denial/not-now persists false and never reduces profile completion | Enabling later rechecks OS permission before saving true |

## Acceptance Outcomes

- Core completion uses only name, tradition, and app language. Optional or sensitive fields never reduce it.
- Hindu-only editors and contextual prompts fail closed until a persisted Hindu tradition is loaded.
- Sikh, Buddhist, and Jain profiles receive no Hindu-only suggestions from the progress API.
- Profile suggestions provide the universal post-onboarding recovery path for skipped optional data. Contextual prompts are intentionally limited to the two flows with a complete inline or settings destination: Panchang Rashi and Vrat calendar setup.
- A contextual prompt is claimed once per signed-in user per JavaScript session. Dismissals are stored per user for 30 days.
- Progressive-profile analytics include only prompt key and action. They never include birth data, lineage, astrology values, location, or free text.
- Punjabi remains supported for profile and readable-content preferences. Full first-run onboarding remains English/Hindi because complete reviewed Punjabi onboarding copy and device screenshots do not yet exist.
- Kundali does not currently write derived Rashi/Nakshatra back to the main profile. No prompt claims that it does.

## Verification Scope

- Native typecheck and Node contract tests.
- Backend typecheck and targeted native-profile/progress-summary route tests.
- Lockfile consistency and `git diff --check`.
- No database migration or new dependency.
- Physical-device visual and haptic behavior was not re-verified in this acceptance pass.
