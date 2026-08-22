import { trackAnalyticsEvent } from '@/lib/analytics';
import {
  buildProgressiveAnalyticsEvent,
  type PromptAction,
  type PromptKey,
} from '@/lib/progressiveProfiling';

export function trackProgressivePromptEvent(promptKey: PromptKey, action: PromptAction): void {
  const event = buildProgressiveAnalyticsEvent(promptKey, action);
  void trackAnalyticsEvent(event.event, {
    prompt_key: event.prompt_key,
    action: event.action,
  }).catch(() => {});
}
