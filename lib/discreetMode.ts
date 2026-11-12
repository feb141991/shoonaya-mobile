export const DISCRETION_READ_PATH = '/api/native/notification-discretion';
const PROFILE_WRITE_PATH = '/api/native/profile';

export type DiscreetModeRead =
  | { state: 'ready'; value: boolean }
  | { state: 'not_available' | 'load_failed' };

type Request = (path: string, init?: RequestInit) => Promise<Response>;

/** The sender and this endpoint must ship together. A database column is not a readiness signal. */
export async function readDiscreetMode(request: Request): Promise<DiscreetModeRead> {
  try {
    const response = await request(DISCRETION_READ_PATH);
    if (response.status === 404) return { state: 'not_available' };
    if (!response.ok) return { state: 'load_failed' };
    const body: { enabled?: unknown } | null = await response.json();
    return typeof body?.enabled === 'boolean'
      ? { state: 'ready', value: body.enabled }
      : { state: 'load_failed' };
  } catch {
    return { state: 'load_failed' };
  }
}

/** A successful HTTP status is insufficient unless the server confirms this exact setting. */
export async function saveDiscreetMode(request: Request, value: boolean): Promise<boolean> {
  const response = await request(PROFILE_WRITE_PATH, {
    method: 'PATCH',
    body: JSON.stringify({ notification_discreet_mode: value }),
  });
  if (!response.ok) return false;
  const body: { success?: unknown; persisted?: { notification_discreet_mode?: unknown } } | null = await response.json();
  return body?.success === true && body.persisted?.notification_discreet_mode === value;
}

export const DISCREET_MODE_COPY = {
  label: 'Hide notification details',
  labelHi: 'सूचनाओं का विवरण छिपाएँ',
  subtitle: 'New notifications will use a generic message. Open Shoonaya for the details. Security alerts keep their wording.',
} as const;
