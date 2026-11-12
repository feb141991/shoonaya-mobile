# Counsel brief: "Help improve reminders" (notification tap recording)

Prepared 2026-11-12 for review by a qualified privacy lawyer. This is a fact sheet and a question list, not legal
advice and not a legal opinion. Nothing here has been reviewed by counsel. The product owner decides what to ship.

## 1. What the feature does

When a person turns on **Help improve reminders**, the app records that they tapped a notification Shoonaya sent.
This lets the team judge whether reminders are useful or unwelcome (for example, whether a reminder to do japa or a
quiz is opened).

**Stored per tap** (table `notification_taps`, row-level security enabled and forced):
- the notification's internal reference and its type (for example `quiz`);
- the time of the tap;
- whether the app was already open;
- the app version and platform;
- the account it is linked to.

**Never stored:** the notification text, the screen it opened, anything the person read or wrote.

**Rules built into the system (verified in the database on 2026-11-12):**
- Off by default. The column `profiles.consent_notification_taps` is `NOT NULL DEFAULT false`. Never pre-ticked.
- Separate from "Share product usage data" and "Tradition-aware personalization". Neither one turns it on.
- The database function that records a tap checks the consent itself, so a client cannot bypass it.
- Turning it off deletes that person's stored taps (database trigger) and empties the phone's queue.
- Entries expire after 90 days (daily purge job). Deleting the account deletes them.
- Internal reports show counts per notification type only, and hide any count from fewer than 5 accounts.
- On 2026-11-12, 1 of 32 accounts has it on. It is the owner's own test account.

## 2. Where a person is asked (the exact wording)

**A. Settings → Privacy & Data (English)**
> Help improve reminders. Optional. When on, we record when you tap a reminder we sent (which reminder, when, and your
> app version), linked to your account, for up to 90 days. This includes practice reminders such as japa, quiz and
> festivals, which can reflect your religious practice. We never record the text or what you read or wrote. Turning it
> off deletes these records.

**B. Onboarding, last notifications step (unticked switch, English)**
> Optional. Lets us see which reminders you tap (which one, when, your app version) so we can send fewer that do not
> help. This includes practice reminders, which can reflect your religious practice. We never record what you read or
> wrote. Turn it off any time in Settings and these records are deleted.

**C. One-time card at the top of the notifications inbox**
Heading "Help improve reminders?", buttons "Not now" and "Yes, help" with equal weight. Shown only after a week of use,
only while the server confirms the switch is off, and at most twice ("Not now" is remembered). Body text begins:
"If you say yes, we record which reminder you tap, when, and your app version, linked to your account, for up to 90 days
..." (same content as A).

**D. Privacy policy paragraph** (`src/lib/privacy-content.ts` in the backend repository), "Notification taps: off unless
you turn on 'Help improve reminders' in Settings ..." The full paragraph, including the retention period, deletion on
withdrawal and the reporting floor, is in that file. The export paragraph also lists "notification taps".

**E. Hindi.** All three in-app texts have Hindi versions. They were written by the engineering assistant and have **not**
been reviewed by a native speaker or by counsel. Punjabi is offered only to Sikh profiles and these texts have no
Punjabi version (what a Punjabi-language user sees instead has not been checked).

## 3. Questions for counsel

1. **Is explicit opt-in enough, and is the wording sufficient?** Under GDPR a tap on a japa or festival reminder may
   reveal religious practice (special-category data, explicit consent). Under India's DPDP Act, is the notice
   (purpose, data, retention, withdrawal) adequate in this short form? Must the notice be available in other
   languages (DPDP allows the person to ask for it in an Eighth Schedule language)?
2. **Children and under-18 users.** DPDP Act section 9 restricts tracking and behavioural monitoring of children and needs
   verifiable parental consent. The product holds a profile date of birth for few accounts (3 of 32 on 2026-11-07) and a
   Sanskāra feature manages data about children. Does this feature need an age gate, and what do we do for accounts with
   no date of birth?
3. **Proof of consent.** Today only a yes/no flag exists, plus a single `consent_updated_at` timestamp on the profile.
   There is no per-consent record of when consent was given, which wording version was shown, or on which screen
   (the e-mail consent feature has a proper ledger). Do you require one for this feature? If so, engineering will add it.
4. **Withdrawal.** Is "off in Settings, with stored taps deleted straight away" sufficient as easy withdrawal? Does a
   person also need to be able to withdraw from the notification itself or by e-mail?
5. **Retention and reports.** Are 90 days of retention and a reporting floor of 5 accounts reasonable and proportionate?
   Is the stated purpose ("tell whether reminders are useful") specific enough, and is any other use (for example
   sending fewer reminders to individuals) a new purpose needing fresh consent?
6. **Roles and transfers.** Backend data is held in Supabase. Taps are sent through the app's own backend. Should the
   privacy notice name the processor and any cross-border transfer?
7. **Staff access.** The policy says a small number of authorised staff can read the underlying records. Is that enough?
8. **The other consents on the same screen.** "Tradition-aware personalization" (14 of 32 on) gates AI answers,
   personalised suggestions and practice analytics events. It does not gate calendar dates or reminder scheduling,
   which still use the person's stored tradition. Does that match what the toggle's text says, and is the stored
   tradition itself special-category data needing its own consent at signup?
9. **Hindi text.** Does the Hindi need review by a qualified translator before release?

## 4. Open facts you should know

- The feature is deployed in the app code and the database, but no over-the-air update or new build has been published,
  so installed apps do not have it yet.
- It has been exercised only in the iOS Simulator on the owner's account. No notification tap has been recorded yet
  (0 rows), and withdrawal has therefore not been proven end to end with real stored taps.
- The Android build and a real device have not been tested.

## 5. Where the code lives

- Native: `lib/notificationTapConsent.ts`, `lib/notificationTapPrompt.ts`, `lib/notificationTapQueue.ts`,
  `lib/notificationTapTracking.ts`, `components/notifications/TapConsentCard.tsx`, `app/settings/detail-screen.tsx`,
  `app/(auth)/onboarding.tsx`, AGENTS.md section 28.
- Backend: migration `supabase/migrations/20261111100000_notification_tap_tracking.sql`, route
  `src/app/api/native/profile/route.ts`, policy text `src/lib/privacy-content.ts`,
  `docs/notifications/NOTIFICATION_TAP_TRACKING.md`.
