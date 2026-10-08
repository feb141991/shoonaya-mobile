export interface AppVersionInfo {
  latestVersion: string;
  minSupportedVersion: string;
  forceUpdate?: boolean;
  storeUrls: {
    android: string;
    ios: string;
  };
  releaseNotes: string;
}

export type StoreUpdateCheckResult =
  | { type: 'MANDATORY'; storeUrl: string; releaseNotes: string; latestVersion: string }
  | { type: 'OPTIONAL'; storeUrl: string; releaseNotes: string; latestVersion: string }
  | { type: 'UP_TO_DATE' }
  | { type: 'ERROR'; message: string };

interface ParsedVersion {
  core: [string, string, string];
  prerelease: string[] | null;
}

function parseSemVer(version: string): ParsedVersion | null {
  const match = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\.(0|[1-9]\d*))?(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/.exec(version);
  if (!match) return null;

  const prerelease = match[4]?.split('.') ?? null;
  if (prerelease?.some((part) => /^\d+$/.test(part) && part.length > 1 && part.startsWith('0'))) {
    return null;
  }

  return { core: [match[1], match[2], match[3] ?? '0'], prerelease };
}

function compareNumericStrings(left: string, right: string): number {
  const normalizedLeft = left.replace(/^0+(?=\d)/, '');
  const normalizedRight = right.replace(/^0+(?=\d)/, '');
  if (normalizedLeft.length !== normalizedRight.length) {
    return normalizedLeft.length > normalizedRight.length ? 1 : -1;
  }
  return normalizedLeft === normalizedRight ? 0 : normalizedLeft > normalizedRight ? 1 : -1;
}

function comparePrerelease(left: string[] | null, right: string[] | null): number {
  if (left === null && right === null) return 0;
  if (left === null) return 1;
  if (right === null) return -1;

  const sharedLength = Math.min(left.length, right.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftPart = left[index];
    const rightPart = right[index];
    const leftNumeric = /^\d+$/.test(leftPart);
    const rightNumeric = /^\d+$/.test(rightPart);

    if (leftNumeric && rightNumeric) {
      const comparison = compareNumericStrings(leftPart, rightPart);
      if (comparison !== 0) return comparison;
    } else if (leftNumeric !== rightNumeric) {
      return leftNumeric ? -1 : 1;
    } else if (leftPart !== rightPart) {
      return leftPart > rightPart ? 1 : -1;
    }
  }

  if (left.length === right.length) return 0;
  return left.length > right.length ? 1 : -1;
}

/**
 * Compares two SemVer strings. Two-part versions are accepted as shorthand
 * for patch zero to preserve older app config values. Invalid values throw so
 * malformed server policy cannot silently make an old client look current.
 */
export function compareSemVer(v1: string, v2: string): number {
  const left = parseSemVer(v1);
  const right = parseSemVer(v2);
  if (!left || !right) throw new RangeError('Invalid semantic version');

  for (let index = 0; index < 3; index += 1) {
    const comparison = compareNumericStrings(left.core[index], right.core[index]);
    if (comparison !== 0) return comparison;
  }

  return comparePrerelease(left.prerelease, right.prerelease);
}

function isTrustedStoreUrl(value: unknown, platform: 'android' | 'ios'): value is string {
  if (typeof value !== 'string' || value.length > 500) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:') return false;
    if (url.username || url.password) return false;
    return platform === 'ios'
      ? url.hostname === 'apps.apple.com' && /\/app\/shoonaya\/id6793055966$/.test(url.pathname)
      : url.hostname === 'play.google.com' &&
        url.pathname === '/store/apps/details' &&
        url.searchParams.get('id') === 'com.shoonaya.app';
  } catch {
    return false;
  }
}

/** Runtime validation for the public server response; JSON is untrusted input. */
export function parseAppVersionInfo(
  value: unknown,
  platform: 'android' | 'ios'
): AppVersionInfo | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const storeUrls = record.storeUrls;
  if (!storeUrls || typeof storeUrls !== 'object' || Array.isArray(storeUrls)) return null;
  const urls = storeUrls as Record<string, unknown>;

  if (typeof record.latestVersion !== 'string' || !parseSemVer(record.latestVersion)) return null;
  if (typeof record.minSupportedVersion !== 'string' || !parseSemVer(record.minSupportedVersion)) return null;
  if (compareSemVer(record.minSupportedVersion, record.latestVersion) > 0) return null;
  if (typeof record.releaseNotes !== 'string' || record.releaseNotes.length > 2000) return null;
  if (record.forceUpdate !== undefined && typeof record.forceUpdate !== 'boolean') return null;
  if (!isTrustedStoreUrl(urls.android, 'android') || !isTrustedStoreUrl(urls.ios, 'ios')) return null;

  // Unknown fields are ignored on purpose: older servers also sent a
  // `latestBuildNumber`, which this client no longer reads or validates.
  return {
    latestVersion: record.latestVersion,
    minSupportedVersion: record.minSupportedVersion,
    ...(record.forceUpdate === undefined ? {} : { forceUpdate: record.forceUpdate }),
    storeUrls: { android: urls.android, ios: urls.ios },
    releaseNotes: record.releaseNotes,
  };
}

/**
 * Pure policy evaluator comparing the installed app VERSION to server policy.
 *
 * Only the version string is compared. Every store build of a release shares one
 * version and differs only by an auto-incremented build number, and nothing
 * automatic tells the server which build is live, so a build-number comparison
 * needed a manual env var change after each release and silently did nothing
 * when it was forgotten. Routine same-version builds reach users through Google
 * Play / the App Store's own update notice; this policy exists to nudge a
 * deliberate version bump (`latestVersion`) or to force one (`forceUpdate`,
 * `minSupportedVersion`).
 */
export function evaluateStoreVersionPolicy(
  currentVersion: string,
  policy: AppVersionInfo,
  platform: 'android' | 'ios'
): StoreUpdateCheckResult {
  const storeUrl = platform === 'ios' ? policy.storeUrls.ios : policy.storeUrls.android;

  const isBelowMin = compareSemVer(currentVersion, policy.minSupportedVersion) < 0;
  if (policy.forceUpdate || isBelowMin) {
    return {
      type: 'MANDATORY',
      storeUrl,
      releaseNotes: policy.releaseNotes,
      latestVersion: policy.latestVersion,
    };
  }

  const versionComparison = compareSemVer(currentVersion, policy.latestVersion);
  if (versionComparison < 0) {
    return {
      type: 'OPTIONAL',
      storeUrl,
      releaseNotes: policy.releaseNotes,
      latestVersion: policy.latestVersion,
    };
  }

  return { type: 'UP_TO_DATE' };
}
