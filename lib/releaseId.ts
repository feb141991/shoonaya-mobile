/**
 * The release identifier every diagnostic upload carries, so a report says which
 * build and which over-the-air (OTA) update produced it.
 *
 * `1.0.0` alone named every build, so no fix could be confirmed from production
 * data. The marketing version never changes between store builds, and an OTA
 * update changes the JavaScript without changing the build number, so both are
 * needed: `1.0.0+47` for build 47 running its embedded bundle, and
 * `1.0.0+47.ota.1a2b3c4d` for build 47 running OTA update 1a2b3c4d-....
 *
 * The form is semver build metadata because every backend endpoint that stores
 * an app version already accepts `^\d+\.\d+\.\d+([+-][0-9A-Za-z.-]+)?$`, and the
 * strictest of them (product analytics, notification taps) cap it at 32
 * characters; the API diagnostics endpoint drops the whole upload otherwise.
 * Kept free of React Native imports so it runs under the plain `tsx --test` runner.
 */
export const RELEASE_ID_MAX_LENGTH = 32;
const OTA_ID_LENGTH = 8;

export type ReleaseIdInput = {
  version: string;
  build?: string | number | null;
  /** expo-updates `updateId`; ignored for an embedded launch. */
  updateId?: string | null;
  isEmbeddedLaunch?: boolean;
};

function metadataPart(value: string): string {
  // Semver build metadata allows only [0-9A-Za-z-], separated by dots.
  return value.replace(/[^0-9A-Za-z.-]/g, '').replace(/^\.+|\.+$/g, '');
}

export function buildReleaseId({ version, build, updateId, isEmbeddedLaunch }: ReleaseIdInput): string {
  const base = version.trim();
  const buildPart = build === null || build === undefined ? '' : metadataPart(String(build));
  const otaHex = !isEmbeddedLaunch && updateId ? updateId.replace(/[^0-9A-Fa-f]/g, '').slice(0, OTA_ID_LENGTH).toLowerCase() : '';
  const otaPart = otaHex.length === OTA_ID_LENGTH ? `ota.${otaHex}` : '';

  const candidates = [
    [buildPart, otaPart].filter(Boolean).join('.'),
    buildPart,
  ];
  for (const metadata of candidates) {
    const id = metadata ? `${base}+${metadata}` : base;
    if (id.length <= RELEASE_ID_MAX_LENGTH) return id;
  }
  return base.slice(0, RELEASE_ID_MAX_LENGTH);
}
