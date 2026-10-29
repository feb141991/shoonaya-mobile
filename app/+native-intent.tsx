import { holdSystemLinkIntent } from '@/lib/systemLinkIntent';

// Expo Router calls this for every link the OS opens the app with (cold start: initial=true) and for links that arrive
// while it is running. Product links wait for the root's auth/onboarding gate; callbacks remain untouched.
export function redirectSystemPath(intent: { path: string; initial: boolean }): string {
  return holdSystemLinkIntent(intent);
}
