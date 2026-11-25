// The profile read that decides which Dharm Veer is "today's" and which spiritual
// day it is. A failed read must not become the defaults: 'hindu' and 'UTC' would
// pick another tradition's hero and the wrong day boundary and present both as
// correct (AGENTS.md section 18).
export type DharmVeerProfileRead = {
  data: { tradition?: string | null; timezone?: string | null } | null;
  error: unknown;
};

export const DHARM_VEER_DEFAULT_TRADITION = 'hindu';
export const DHARM_VEER_DEFAULT_TIMEZONE = 'UTC';

export function resolveDharmVeerProfile(result: DharmVeerProfileRead): { tradition: string; timezone: string } {
  // Throw the original error: the caller's retryable error state handles it, and no
  // message from it is ever shown (section 12).
  if (result.error) throw result.error;
  // A successful read with a blank column is a real "not set": the defaults are right.
  return {
    tradition: result.data?.tradition || DHARM_VEER_DEFAULT_TRADITION,
    timezone: result.data?.timezone || DHARM_VEER_DEFAULT_TIMEZONE,
  };
}
