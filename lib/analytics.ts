/**
 * Stable analytics facade retained after Firebase Analytics removal. Product
 * events intentionally no-op until a consented provider is approved.
 */

type AnalyticsEventName =
  | 'app_opened'
  | 'login_started'
  | 'onboarding_completed'
  | 'practice_started'
  | 'practice_completed'
  | 'share_started'
  | 'progressive_profiling';

type AnalyticsEventParams = {
  surface?: string;
  action?: string;
  route?: string;
  prompt_key?: string;
};

export async function setNativeAnalyticsEnabled(_enabled: boolean) {}
export async function trackScreenView(_screenName: string) {}
export async function trackAnalyticsEvent(_eventName: AnalyticsEventName, _params?: AnalyticsEventParams) {}
