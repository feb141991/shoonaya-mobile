import type { YatraTradition } from './yatra-data';

/**
 * What the virtual sanctum (components/tirtha/VirtualSanctum*) offers for a pilgrimage circuit's tradition.
 *
 * The sanctum was written for a Hindu mandir: an Om over the deity, a hanging bell, two ghee diyas, flowers and a
 * parikrama tally, and a tab named "Sthala Purana". It used to show all of that for every shrine, including the four
 * Sikh Panj Takht gurdwaras. A shrine records no tradition of its own; its circuit does (`YatraCircuit.tradition`), so the
 * screen passes the circuit's tradition to the modal and the modal asks this file what to show.
 *
 * Rules (AGENTS.md section 3 and section 40):
 *  - `sanatan` is exactly what the sanctum showed before this file existed. Nothing a Hindu shrine shows changes.
 *  - Any tradition that is not `sanatan` or `sikh` (Jain has a type but no circuit; a missing or unexpected value) gets the
 *    NEUTRAL profile: no mandir ritual set, no symbol, no tally. Showing too little is the safe failure; showing a Hindu
 *    ritual on another tradition's shrine is the defect this file exists to prevent. Add a tradition by adding a
 *    reviewed profile here, never by letting it fall through to `sanatan`.
 *  - Nothing here is scripture, a mantra or a ritual instruction. The Khanda is the symbol the app already uses for Sikh
 *    everywhere else (lib/traditions.ts, app/bhakti/browse.tsx). Which sanctum actions, if any, belong at a gurdwara has
 *    NOT been reviewed by a Sikh reviewer: the mandir ritual set is withheld until one decides, and the parikrama tally
 *    (`showParikrama`) is kept for Sikh only because it was not part of the approved change, pending that review.
 */
export type SanctumProfile = {
  /** Symbol drawn above the deity's name on the stage. `null` draws none. */
  deityGlyph: string | null;
  /** The mandir ritual set: the hanging bell and two diyas on the stage, and the Light Diya, Offer Pushpam and Ring Bell buttons. */
  showMandirRituals: boolean;
  /** The parikrama tally on the stage and its +1 button. */
  showParikrama: boolean;
  /** Label of the second tab (the shrine's history). */
  historyTabLabel: string;
  /** Heading above the history text. */
  historyHeading: string;
  /** The line above the circuit map, saying what a tap on a site opens. */
  circuitHint: string;
};

const MAP_HINT = 'Pinch to zoom and drag to explore pilgrimage routes. ';

/** Exactly what the sanctum and the circuit screen showed for every shrine before profiles existed. */
export const SANATAN_SANCTUM_PROFILE: Readonly<SanctumProfile> = {
  deityGlyph: '🕉️',
  showMandirRituals: true,
  showParikrama: true,
  historyTabLabel: 'Sthala Purana',
  historyHeading: 'STHALA PURANA & SACRED ORIGINS',
  circuitHint: `${MAP_HINT}Tap any sacred temple for virtual darshan, diya lighting, and stotras.`,
};

export const SIKH_SANCTUM_PROFILE: Readonly<SanctumProfile> = {
  deityGlyph: '☬',
  showMandirRituals: false,
  showParikrama: true,
  historyTabLabel: 'History',
  historyHeading: 'HISTORY & ORIGINS',
  circuitHint: `${MAP_HINT}Tap any sacred site for virtual darshan and its history.`,
};

export const NEUTRAL_SANCTUM_PROFILE: Readonly<SanctumProfile> = {
  deityGlyph: null,
  showMandirRituals: false,
  showParikrama: false,
  historyTabLabel: 'History',
  historyHeading: 'HISTORY & ORIGINS',
  circuitHint: `${MAP_HINT}Tap any sacred site for virtual darshan and its history.`,
};

/** The profile for a circuit's tradition. Anything that is not exactly `sanatan` or `sikh` gets the neutral profile. */
export function sanctumProfileFor(tradition: YatraTradition | string | null | undefined): Readonly<SanctumProfile> {
  if (tradition === 'sanatan') return SANATAN_SANCTUM_PROFILE;
  if (tradition === 'sikh') return SIKH_SANCTUM_PROFILE;
  return NEUTRAL_SANCTUM_PROFILE;
}
