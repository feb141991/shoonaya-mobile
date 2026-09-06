/**
 * Builds the identity key that gates PanchangRetryController's
 * cancel/re-arm effect in app/(tabs)/index.tsx -- extracted so the exact
 * scenario the reliability audit flagged (two different accounts sharing
 * identical tradition/location/timezone/date producing the same key, and
 * so failing to cancel a stale retry across an account switch) is
 * directly testable, not just reviewed by eye.
 *
 * The authenticated user id is included explicitly rather than relied
 * upon via state resetting to INITIAL_STATE on an identity change: that
 * reset only *coincidentally* changes this key when the two accounts'
 * tradition/location/timezone/date actually differ. calendarProfile and
 * sampradaya are included too -- either can change on the backend without
 * `tradition` (a much coarser category) ever changing.
 */

export type CalendarIdentityInputs = {
  accountKey: string; // e.g. userId for authenticated, or the identity kind for guest/unauthenticated/loading
  tradition: string;
  calendarProfile: string | null | undefined;
  sampradaya: string | null | undefined;
  latitude: number;
  longitude: number;
  timezone: string;
  spiritualDateIso: string;
};

export function buildCalendarIdentityKey(inputs: CalendarIdentityInputs): string {
  return [
    inputs.accountKey,
    inputs.tradition,
    inputs.calendarProfile ?? '',
    inputs.sampradaya ?? '',
    inputs.latitude,
    inputs.longitude,
    inputs.timezone,
    inputs.spiritualDateIso,
  ].join('|');
}
