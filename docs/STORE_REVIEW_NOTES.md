# Shoonaya Store Review Notes

Replace every bracketed value before submission. Never submit placeholder
credentials.

## Review access

Shoonaya supports a guest experience, but account-specific functionality
requires the review account below.

- Sign-in method: Google (Sign in with Google) — no app-specific password
- Email: `phonetest1491@gmail.com`
- Password: enter the Google account password directly into the console's
  own reviewer-notes field (App Store Connect / Play Console); never commit
  it to this repository
- Account state: onboarding completed, Hindu tradition selected, calendar
  profile configured, sample practice history present, no deletion pending

The backend and account must remain active throughout review.

## Core app purpose

Shoonaya helps people maintain a daily spiritual practice and stay connected
with their tradition. It provides daily sadhana, Japa, sourced sacred reading,
Panchang and observance information, spiritual learning, nearby sacred places,
and an optional moderated community.

## Location

Foreground location is optional. It is used to calculate local Panchang and
observance timing and to find nearby sacred places. Users can decline location
permission and use manual location selection where available. Shoonaya does
not request background or always-on location.

## Religious-profile personalisation

Tradition, calendar profile, gotra and related spiritual preferences are
optional and used only to personalise relevant content and calendar results.
Non-Hindu profiles do not receive Hindu-only profile fields. Users may skip
optional onboarding questions and complete or change them later in Settings.

## Notifications

Shoonaya requests notification permission only after an explicit user choice.
Notifications provide opted-in practice and observance reminders. Preferences
remain disabled when operating-system permission is denied. Users can change
reminder preferences in Settings.

## Account deletion and export

Settings contains **Download your data** and **Delete account**. Deletion
starts a clearly disclosed 30-day cancellable period; the user can cancel from
the same screen before permanent purge. Public deletion information is at
https://www.shoonaya.com/data-deletion.

## User-generated content safety

Mandali contains user-generated posts and comments. Users can report content,
block or mute users, and hide content. Server-side reads enforce block/mute/
hide state. Provide any moderation test steps or credentials here if requested:
`[MODERATION_REVIEW_NOTES]`.

## Sign in with Apple

Sign in with Apple is available on iOS. Before submission, complete and verify
the provider-token revocation work tracked by
`docs/ANTIGRAVITY_APPLE_ACCOUNT_REVOCATION_PROMPT.md`, or document Apple's
manual-revocation fallback for historical accounts accurately.

## Non-obvious behavior

- Date-sensitive spiritual content uses the user's selected location,
  timezone and calendar profile.
- Unresolved or under-review calendar results are withheld rather than guessed.
- Live Darshan embeds third-party public streams which may occasionally be
  unavailable outside Shoonaya's control.
- Dharma Mitra is AI-assisted guidance and is not medical, legal or financial
  advice.

