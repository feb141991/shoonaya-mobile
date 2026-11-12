# Notification study plan (one page), 2026-11-07

Status: direction agreed with the founder on 2026-11-07. **No user has been contacted or recruited.** Evidence so far: `NOTIFICATION_EVIDENCE_REVIEW.md`.

**Goal (confirmed):** people sustain their practice without feeling nagged. Success is practice days per week over four weeks, with opt-outs, revoked
permissions and "felt nagged" as tripwires. Taps alone are never the goal.

**Decisions this should inform:** how many nudges a day by default; Brahma Muhurta delivery (night, silent or not); wording of Japa, shloka, mood, festival and
quiz messages; streak and return language; lock-screen discretion; whether the daily digest stays.

## Order (agreed)
1. **Consent reset.** All reminders default off and are shown one by one in onboarding (built, unmerged). The 32 existing profiles are still unchanged and
   await the founder's choice of option A, B or C. Studying people who never chose their reminders would blur every answer, so this comes first.
2. **Tap tracking.** Today nothing records that a notification was tapped, and every in-app "read" is 0%. Without it nothing below can be measured.
   *Status 2026-11-10: built on branches (backend `notif-tap-tracking`, Native `notif-tap-tracking`), nothing applied or shipped. It is consent-gated and so records nothing until people opt in to product usage data (0 of 32 had on 2026-11-10); that decision, and the privacy wording, are the founder's. See the backend `docs/notifications/NOTIFICATION_TAP_TRACKING.md`.*
3. **Studies**, small first.

## Track 1: closest-domain evidence (done)
Finding: no trial of push notifications in a devotional app exists; short-term lift is real in health-app trials; long-term benefit and frequency effects are
untested. See the review for sources and what was not verified.

## Track 2: conversations with our own users (not started)
- **Who:** 8 to 12 existing users, chosen to cover Hindu, Sikh, Buddhist and no-tradition users, Hindi-first users, and Android and iPhone. **The founder invites
  them personally**, because an in-app invitation would itself be a notification. Taking part is voluntary and can be withdrawn at any time. The AI contacts no one.
- **How:** a 20-minute conversation or a seven-day diary, the person's choice. Notes by the founder; recorded only with permission; nothing personal kept in the
  repository; any recording deleted after the themes are written (assumed 30 days; the founder to confirm).
- **Exact questions:**
  1. When does a Shoonaya reminder feel like an invitation, and when like a nag? Ask for a recent example of each.
  2. For each kind (practice, festivals and vrats, learning, community, family), how many a day feels right, and at what point is it too many?
  3. Show six pairs of message texts (plain versus commanding; with and without a streak line). Which feels more respectful, and why? **All wording stays a draft
     marked unreviewed; no tradition-specific or Hindi wording ships until a reviewer is named.**
  4. What would you not want to appear on a locked screen, or on a phone someone else can see?
  5. What do you do when you miss a day of practice, and what message on your return would feel kind?
  6. For the pre-dawn reminder: do you want it, would you want it silent, and what time?
- **Not asked:** anything about grief, fasting observance or health; no leading questions; no persuasion.

## Track 3: measured comparisons (later)
Within-person comparisons (each person is their own control, two wordings or two times in random order across weeks). With 23 reachable people this gives
descriptions, not conclusions. Revisit when there are a few hundred reachable users (rough figure, to be set with proper sizing). Needs Track 2's
wording and step 2 above.

## Tap-tracking specification (step 2)
One row per tap: account, notification key, type, time, whether the app was already open. **No message text.** Kept 90 days, disclosed in the privacy policy,
deleted with the account. Plus the outcomes already known: category switched off afterwards, OS permission revoked.

## Rules for everything above
Opt-in only; no deception; no manipulative variants (no guilt, fake urgency or loss framing); minimum data under the DPDP Act; no testing around grief or
fasting; nothing published as a finding without saying how small the study was.

## Open
- Founder: choose A, B or C for the 32 existing profiles (recommendation: B).
- Founder: confirm the personal-invitation approach and the 30-day recording deletion.
- Deferred by the founder: named Sikh, Buddhist and Hindi reviewers. Until then all non-English and tradition-specific wording stays an unreviewed draft.
