// The messages between the Solar Day screen and its 3D scene page
// (scripts/solar-scene/stage.js). The page only draws: anything it sends back that is
// not one of these shapes is ignored, so a page message can never change a fact on screen.
import type { SolarDay, SolarWindowId } from '@/lib/solarDay';

export type SolarSceneInbound =
  | { type: 'ready' }
  | { type: 'unsupported' }
  | { type: 'drag'; deltaMinutes: number };

/** A drag of more than a whole day in one event is not a drag. */
const MAX_DRAG_MINUTES = 1440;

export function parseSolarSceneMessage(raw: unknown): SolarSceneInbound | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 500) return null;
  let message: unknown;
  try {
    message = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!message || typeof message !== 'object') return null;
  const m = message as { type?: unknown; deltaMinutes?: unknown };
  if (m.type === 'ready' || m.type === 'unsupported') return { type: m.type };
  if (m.type === 'drag' && typeof m.deltaMinutes === 'number' && Number.isFinite(m.deltaMinutes) && Math.abs(m.deltaMinutes) <= MAX_DRAG_MINUTES) {
    return { type: 'drag', deltaMinutes: m.deltaMinutes };
  }
  return null;
}

export type SolarSceneOutbound =
  | { type: 'day'; geo: { latitudeDeg: number; declinationRad: number; noonMinutes: number }; windows: { start: number; end: number; color: string }[] }
  | { type: 'time'; minutes: number }
  | { type: 'motion'; on: boolean };

export function dayMessage(day: SolarDay, colors: Record<SolarWindowId, string>): SolarSceneOutbound {
  return {
    type: 'day',
    geo: { latitudeDeg: day.latitudeDeg, declinationRad: day.declinationRad, noonMinutes: day.noonMinutes },
    // Brahma Muhurta is before sunrise, so it has no arc in the sky.
    windows: day.windows.filter((w) => w.id !== 'brahma').map((w) => ({ start: w.start, end: w.end, color: colors[w.id] })),
  };
}

/** JavaScript for WebView.injectJavaScript. JSON is a safe JavaScript literal here: it is built from numbers, booleans and token colours. */
export function sceneInjection(message: SolarSceneOutbound): string {
  return `window.solarScene&&window.solarScene.receive(${JSON.stringify(message)});true;`;
}
