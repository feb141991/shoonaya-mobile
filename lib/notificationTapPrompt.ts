/**
 * When the one-time "Help improve reminders" card may appear (AGENTS.md section 28).
 *
 * Asked, never assumed: the card is shown only after the person has had the app for a week, only while their choice is
 * confirmed off by the server, and at most twice -- once, and once more after 30 days if they said "Not now". Anything
 * else (an answer of Yes, two "Not now"s, an unreadable state, an unknown server value) shows nothing.
 */
export const TAP_PROMPT_DELAY_MS = 7 * 24 * 60 * 60 * 1000;
export const TAP_PROMPT_REASK_MS = 30 * 24 * 60 * 60 * 1000;
export const TAP_PROMPT_MAX_ASKS = 2;

export type TapPromptState = {
  v: 1;
  firstSeenAt: number;
  asks: number;
  lastAskedAt: number | null;
  answeredAt: number | null;
};

export function newTapPromptState(now: number): TapPromptState {
  return { v: 1, firstSeenAt: now, asks: 0, lastAskedAt: null, answeredAt: null };
}

export function parseTapPromptState(raw: string | null, now: number): TapPromptState {
  if (!raw) return newTapPromptState(now);
  try {
    const value = JSON.parse(raw) as Partial<TapPromptState> | null;
    if (!value || value.v !== 1 || typeof value.firstSeenAt !== 'number' || !Number.isFinite(value.firstSeenAt)) return newTapPromptState(now);
    const asks = typeof value.asks === 'number' && Number.isInteger(value.asks) && value.asks >= 0 ? value.asks : TAP_PROMPT_MAX_ASKS;
    return {
      v: 1,
      firstSeenAt: Math.min(value.firstSeenAt, now),
      asks,
      lastAskedAt: typeof value.lastAskedAt === 'number' && Number.isFinite(value.lastAskedAt) ? value.lastAskedAt : null,
      answeredAt: typeof value.answeredAt === 'number' && Number.isFinite(value.answeredAt) ? value.answeredAt : null,
    };
  } catch {
    return newTapPromptState(now);
  }
}

export function shouldShowTapPrompt(state: TapPromptState, now: number, serverChoice: 'on' | 'off' | 'unavailable'): boolean {
  if (serverChoice !== 'off') return false;
  if (state.answeredAt !== null) return false;
  if (state.asks >= TAP_PROMPT_MAX_ASKS) return false;
  if (now - state.firstSeenAt < TAP_PROMPT_DELAY_MS) return false;
  if (state.asks === 0) return true;
  return state.lastAskedAt !== null && now - state.lastAskedAt >= TAP_PROMPT_REASK_MS;
}

export function afterNotNow(state: TapPromptState, now: number): TapPromptState {
  return { ...state, asks: state.asks + 1, lastAskedAt: now };
}

export function afterYes(state: TapPromptState, now: number): TapPromptState {
  return { ...state, answeredAt: now };
}
