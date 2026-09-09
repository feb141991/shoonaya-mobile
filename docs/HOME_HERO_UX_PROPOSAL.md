# Home hero and calendar UX proposal

Status: proposal for the larger interactions. Mood styling, profile Language heading and profile sheet safe-area scrolling are implemented locally. No subscription feed or tour has been shipped by this change.

## Backdrop-aware greeting and pills

The supplied Krishna image places its focal subject on the left, where the current greeting and pills are anchored. Shadows alone cannot resolve that overlap.

Give each curated backdrop a preferred content position (left, right, below artwork), focal point and readability treatment. For this image use a right-side, internally left-aligned content column when it fits. Keep the bell and avatar in their established positions; move the greeting and all three pills as one group. Never mirror sacred artwork to make room.

On narrow screens or enlarged text, put the greeting and pills in a compact cream/dark themed surface below the artwork. Do not squeeze a long greeting into the remaining sliver of space. An uploaded image defaults to this safe layout; the backdrop picker can offer Left / Right / Below preview choices. Apply a localized scrim behind text, preserving the artwork outside that region. Verify the longest greeting and observance labels before choosing the breakpoint.

## Home feature tips

Add a small “Explore your Home” action below the hero controls. It opens a dismissible sheet with these explanations, showing only features actually available to the user:

- Mood: “Check in with how you feel and explore a practice for today.”
- Greeting: “Tap the pencil to personalize your greeting.”
- Panchang: “Open today’s calendar details.”
- Sacred days: “Tap an observance to learn more.”
- Rashiphal: “Open your daily reading.”
- Background: “Choose the artwork for your Home.”

Use an explicit “Show me around” action for a guided tour. Show one anchored tip at a time, with Next, Back and Close; finish with Done. Keep the tour replayable from help. Do not launch it over onboarding or permission prompts. Close never marks an onboarding/profile task complete. Respect reduced motion and announce each tip to screen readers.

## Onboarding labels

Keep a stable primary Continue button. Add a secondary “Skip for now” only on optional steps. Required steps show an explanation when they cannot continue. The final action is “Start my practice”. Permission steps use the action they perform (for example “Enable notifications”) plus “Not now”.

The current primary label changes between Continue and Skip for now based on whether a value exists. This makes the same button appear to change purpose. Replace that presentation without changing existing completion or save semantics.

For optional empty fields, Continue may advance using the same existing default behavior; show “Optional · You can add this later in Profile”. If a user has already entered information, Continue saves it. Do not introduce a skip action that silently discards existing answers: use Back to edit them. Preserve drafts and step progress. Use the same treatment in supported translations.

## Subscribe to Sacred Calendar

Current native behavior: Export calendar calls /api/calendar/export, writes an .ics file and opens the native share sheet. This is a one-time export.

Proposed entry sheet:

    Sacred Calendar                              Close
    Keep verified sacred days in your calendar.

    Subscribe for updates
    Receive published additions and corrections.

    Download calendar file
    Save a one-time copy of the current calendar.

After Subscribe, show a settings sheet:

    Your tradition and calendar profile     Review
    Include                                Festivals and vrats
    Region and time zone                    From calendar profile
    Preview                                Verified upcoming events

    Add subscription
    Copy subscription link

The inclusion choices should be Major festivals / Festivals and vrats / All verified sacred days. Show the actual canonical profile and local timezone, with an edit path. Empty preview: “No verified events are available for these settings yet.” Loading and error states must preserve preferences and offer Retry.

Only expose choices supported by the feed. Avoid a reminder selector until recipient-calendar behavior is verified; initially explain that reminders can be managed in the calendar app. Explain that calendar apps refresh on their own schedule, without promising immediate corrections.

Success copy after handing off: “Subscription link opened. Finish adding it in your calendar app.” Do not claim the subscription was installed merely because a link opened. Include provider-specific instructions and a copy-link fallback. The feed must exist before activating Add subscription.

Canonical ownership: Shoonaya backend/PWA owns occurrence eligibility, feed generation and subscription contracts. Native owns the sheet and platform handoff. Reuse published, reviewed, verified, profile-qualified occurrence data; never calculate festival dates in the UI. Include stable event IDs and update/cancellation behavior. If personalized links are used, make them revocable, keep identity and auth tokens out of readable URL parameters, and explain link access. One-time export remains available.

## Verification and release gates

Local typecheck and focused existing regression tests cover the mechanical changes. Device review remains necessary on Android and iOS, light/dark, narrow screens and enlarged text. Check mood truncation, profile keyboard scrolling, safe areas and save/cancel. Larger proposed features need implementation and interaction testing before release. No backend contract or production data changes are part of this patch.
