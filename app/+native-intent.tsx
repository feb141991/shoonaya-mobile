import { mapSystemPath } from '@/lib/systemLinkRoute';

// Expo Router calls this for every link the OS opens the app with (cold start: initial=true) and for links that arrive
// while it is running. See lib/systemLinkRoute.ts for what is rewritten and what is left alone.
export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  return mapSystemPath(path);
}
