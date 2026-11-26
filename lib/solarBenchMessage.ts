// Reads the message the Solar Horizon benchmark page posts through
// ReactNativeWebView.postMessage when a run finishes. The page is a spike
// harness, not a product surface: nothing here is stored or uploaded.
// Anything that is not a well-formed benchmark result is refused rather than
// guessed at, so a stray page message can never be shown as a measurement.

export type SolarBenchResult = {
  secs: number;
  fpsAvg: number;
  frameMsP50: number;
  frameMsP95: number;
  frameMsP99: number;
  pctOver33ms: number;
  pctOver50ms: number;
  drawCallsPerFrame: number;
  trianglesPerFrame: number;
  drawCpuMsAvg: number;
  gpu: string;
  /** False when the tab was hidden or the browser throttled frames: the run proves nothing. */
  validRun: boolean;
};

const NUMERIC_FIELDS = [
  'secs', 'fpsAvg', 'frameMsP50', 'frameMsP95', 'frameMsP99', 'pctOver33ms', 'pctOver50ms',
  'drawCallsPerFrame', 'trianglesPerFrame', 'drawCpuMsAvg',
] as const;

export function parseSolarBenchMessage(raw: unknown): SolarBenchResult | null {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 20_000) return null;
  let outer: unknown;
  try {
    outer = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!outer || typeof outer !== 'object') return null;
  const message = outer as { type?: unknown; res?: unknown };
  if (message.type !== 'bench' || !message.res || typeof message.res !== 'object') return null;
  const res = message.res as Record<string, unknown>;
  const out: Partial<SolarBenchResult> = {};
  for (const key of NUMERIC_FIELDS) {
    const value = res[key];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
    out[key] = value;
  }
  if (typeof res.validRun !== 'boolean') return null;
  out.validRun = res.validRun;
  out.gpu = typeof res.gpu === 'string' ? res.gpu.slice(0, 120) : 'unknown';
  return out as SolarBenchResult;
}

/** The page address is accepted only as plain http(s) with a host, so a file:, javascript: or data: address never loads. */
export function isAllowedBenchUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname.length > 0;
  } catch {
    return false;
  }
}
