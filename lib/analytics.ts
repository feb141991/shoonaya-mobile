/**
 * Consent-gated product measurement. The transport is installed by the Native
 * runtime; this module deliberately knows nothing about identity, storage, or
 * network details so its policy remains straightforward to test.
 */
export const PRODUCT_ANALYTICS_EVENTS = [
  'app_opened',
  'practice_started',
  'practice_completed',
  'progressive_profiling',
] as const;

export type AnalyticsEventName = (typeof PRODUCT_ANALYTICS_EVENTS)[number];
export type AnalyticsEventParams = {
  surface?: string;
  action?: string;
  route?: string;
  prompt_key?: string;
};
export type AnalyticsTransport = {
  send: (event: AnalyticsEventName) => Promise<void>;
  withdraw: (userId: string) => Promise<void>;
};

let enabled = false;
let practiceEnabled = false;
let transport: AnalyticsTransport | null = null;

export function configureNativeAnalytics(nextTransport: AnalyticsTransport): void {
  transport = nextTransport;
}

export async function setNativeAnalyticsEnabled(nextEnabled: boolean): Promise<void> {
  enabled = nextEnabled;
  if (!nextEnabled) practiceEnabled = false;
}

/** Practice events reveal spiritual activity and need both independent consents. */
export async function setNativePracticeAnalyticsEnabled(nextEnabled: boolean): Promise<void> {
  practiceEnabled = enabled && nextEnabled;
}

export async function deleteNativeAnalyticsHistory(userId: string): Promise<void> {
  await transport?.withdraw(userId).catch(() => {});
}

export async function trackScreenView(_screenName: string): Promise<void> {
  // Screen names can reveal spiritual beliefs or sensitive feature use.
  // Product measurement intentionally records no route-level browsing.
}

export async function trackAnalyticsEvent(
  eventName: AnalyticsEventName,
  _params?: AnalyticsEventParams,
): Promise<void> {
  if (!enabled || !PRODUCT_ANALYTICS_EVENTS.includes(eventName) || !transport) return;
  if ((eventName === 'practice_started' || eventName === 'practice_completed') && !practiceEnabled) return;
  await transport.send(eventName).catch(() => {});
}

export function isNativeAnalyticsEnabled(): boolean {
  return enabled;
}

export function isNativePracticeAnalyticsEnabled(): boolean {
  return practiceEnabled;
}
