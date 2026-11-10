/**
 * "Hide notification details" (AGENTS.md section 29; backend migration 20261112090000, docs/notifications/LOCK_SCREEN_DISCRETION.md).
 *
 * When on, the backend sends only a neutral line in place of each push's title and body. This module is the Native
 * half's pure logic: how the setting is read and what the switch says. No React Native here, so it is tested exactly.
 */

export type DiscreetModeLoadState = 'ready' | 'not_available' | 'load_failed';

export type DiscreetModeRead =
  | { state: 'ready'; value: boolean }
  | { state: 'not_available' | 'load_failed'; value?: undefined };

/** Postgres "undefined column": the migration adding the column has not been applied on this server yet. */
const UNDEFINED_COLUMN = '42703';

/**
 * Reads the column on its own, never as part of the long cascade of older-server fallbacks, so a server without it keeps
 * every other setting readable. Three outcomes, and none of them is a guess:
 *   ready          a real boolean came back (on or off);
 *   not_available  the column does not exist yet: the switch stays disabled and says so;
 *   load_failed    anything else, including a value that is not a boolean: the switch stays disabled. A failed read is
 *                  never presented as "off" (AGENTS.md section 18), because "off" would invite a tap that overwrites a
 *                  real "on".
 */
export async function readDiscreetMode(
  read: (columns: string) => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<DiscreetModeRead> {
  try {
    const { data, error } = await read('notification_discreet_mode');
    if (error) {
      return (error as { code?: string } | null)?.code === UNDEFINED_COLUMN ? { state: 'not_available' } : { state: 'load_failed' };
    }
    const value = (data as { notification_discreet_mode?: unknown } | null)?.notification_discreet_mode;
    return typeof value === 'boolean' ? { state: 'ready', value } : { state: 'load_failed' };
  } catch {
    return { state: 'load_failed' };
  }
}

/**
 * The words on the switch. English is the reviewed text. The Hindi is an unreviewed draft: no native reader has checked it,
 * and reviewers are deferred (founder, 2026-11-07).
 */
export const DISCREET_MODE_COPY = {
  label: 'Hide notification details',
  subtitle: 'Notifications will only say that you have a new notification. The details appear when you open Shoonaya. This applies to new notifications.',
  labelHi: 'सूचनाओं का विवरण छिपाएँ',
  subtitleHi: 'सूचना में केवल यह दिखेगा कि आपके पास एक नई सूचना है। विवरण Shoonaya खोलने पर दिखेगा। यह नई सूचनाओं पर लागू होता है।',
} as const;
