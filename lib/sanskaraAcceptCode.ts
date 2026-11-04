import { ApiRequestError } from './user-facing-error';

export type AcceptedHandoverCode =
  | { kind: 'claim'; moved: number; dropped_as_duplicates: number }
  | { kind: 'early' };

export type AcceptCodeWriters = {
  acceptClaim: (token: string) => Promise<{ moved: number; dropped_as_duplicates: number }>;
  acceptEarly: (token: string) => Promise<unknown>;
};

/**
 * One field for both kinds of code. A code from a hand-over at 18 and a code from an early hand-over look the same; the server
 * answers 404 for a code it does not know, whichever kind the caller tried, so trying the 18 route first and the early route
 * on a 404 reveals nothing and asks the person nothing extra. Any other failure is final and is never retried against the
 * other route: a 503 or a rate limit is the answer, and a second attempt would only hide it.
 */
export async function acceptHandoverCodeWith(writers: AcceptCodeWriters, token: string): Promise<AcceptedHandoverCode> {
  try {
    const { moved, dropped_as_duplicates } = await writers.acceptClaim(token);
    return { kind: 'claim', moved, dropped_as_duplicates };
  } catch (error) {
    if (!(error instanceof ApiRequestError) || error.status !== 404) throw error;
  }
  await writers.acceptEarly(token);
  return { kind: 'early' };
}
