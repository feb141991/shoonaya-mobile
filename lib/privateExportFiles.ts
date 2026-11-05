/**
 * Private files the app puts in its cache so the system share sheet or a picker can reach them, and the rule that none of them
 * outlives the account that made it (AGENTS 25):
 *
 *  - the account-wide data export (Settings, "Download your data") and the personal sadhana report (Profile);
 *  - the share-card images (lib/share-card.ts), which can carry the person's own name and practice numbers;
 *  - the photo copy the image picker leaves for the profile picture.
 *
 * This is the part with no native import, so the root layout can call the purge without loading the file-system module at
 * startup. The device half (lib/privateExportFilesDevice.ts) touches the disk.
 *
 * Exports and share cards live in ONE cache directory, so removing the directory removes every copy. It is removed:
 *  - before each new export or share card, so at most one copy is ever on the device;
 *  - after a share that failed, because nothing was handed over;
 *  - at sign-out and on an account switch (app/_layout.tsx).
 * It is deliberately NOT removed when the share sheet's promise resolves: the Expo SDK 57 sharing docs do not say whether that
 * is before or after the receiving app has read the file, and an attachment read late would arrive empty.
 *
 * The picker's copy is not ours to place: expo-image-picker writes it to `<cache>/ImagePicker/` on both platforms (read in its
 * Android and iOS sources). The app only reads the base64 the picker returns, never the file, so that folder is also removed as
 * soon as a pick has been used.
 */
export const PRIVATE_EXPORT_DIRECTORY = 'private-exports';

/** expo-image-picker's own output folder inside the cache, on Android and iOS. Nothing else writes there. */
export const IMAGE_PICKER_CACHE_DIRECTORY = 'ImagePicker';

export const ACCOUNT_DATA_EXPORT_NAME = 'shoonaya-data.json';
export const SADHANA_REPORT_NAME = 'sadhana-report.html';

export type PrivateExportName = typeof ACCOUNT_DATA_EXPORT_NAME | typeof SADHANA_REPORT_NAME;

/**
 * Earlier builds wrote these two files straight into the cache root, outside any directory this module owns. A purge removes
 * those too, otherwise a copy left by an old build would survive every sign-out (AGENTS 24: a purge also deletes what an
 * earlier build left behind).
 */
export const LEGACY_PRIVATE_EXPORT_NAMES: readonly PrivateExportName[] = [ACCOUNT_DATA_EXPORT_NAME, SADHANA_REPORT_NAME];

export type PrivateExportDeps = {
  isSharingAvailable: () => Promise<boolean>;
  /** Removes every earlier private export. Called before a new one is written and after a failed share. */
  removeFiles: () => void;
  /** Writes the file and returns its uri. */
  writeFile: (name: PrivateExportName, body: string) => string;
  share: (uri: string) => Promise<void>;
};

/**
 * Hands the person a copy of their own data through the system share sheet. The order is the rule:
 *
 *  1. Ask whether sharing exists BEFORE writing. Private data must not reach the disk for a share that cannot happen.
 *  2. Remove every earlier export before writing the new one.
 *  3. If the share fails, remove the file: nothing was handed over, so nothing should stay behind.
 *  4. If the share succeeds, leave the file (see the note at the top of this file).
 *
 * Resolves false, having written nothing, when sharing is unavailable on this device.
 */
export async function sharePrivateExportWith(deps: PrivateExportDeps, name: PrivateExportName, body: string): Promise<boolean> {
  if (!(await deps.isSharingAvailable())) return false;
  deps.removeFiles();
  const uri = deps.writeFile(name, body);
  try {
    await deps.share(uri);
  } catch (error) {
    try {
      deps.removeFiles();
    } catch {
      // The share error is the one the person needs; a file that could not be removed is retried at the next purge.
    }
    throw error;
  }
  return true;
}

// ── Share cards ────────────────────────────────────────────────────────────────────────────────────────────────────────

const SAFE_CARD_FILE_NAME = /^[A-Za-z0-9._-]{1,120}\.png$/;
export const FALLBACK_SHARE_CARD_NAME = 'shoonaya-share-card.png';

/**
 * react-native-view-shot answers with a `file://` uri on Android but a bare path on iOS (RNViewShot.mm resolves the path from
 * RCTTempFilePath), and the file-system module wants a uri.
 */
export function capturedFileUri(captured: string): string {
  return captured.startsWith('/') ? `file://${captured}` : captured;
}

/**
 * The file name the copy keeps. Android's capture is named after the caller's `fileName` plus random digits, which is what the
 * receiving app shows; iOS's is a UUID. A name that is not plain ASCII, or is not a .png, becomes a fixed neutral one.
 */
export function adoptedShareCardName(captured: string): string {
  const last = captured.split('?')[0].split('/').pop() ?? '';
  let name = last;
  try {
    name = decodeURIComponent(last);
  } catch {
    // Keep the raw segment; the pattern below decides whether it is usable.
  }
  return SAFE_CARD_FILE_NAME.test(name) ? name : FALLBACK_SHARE_CARD_NAME;
}

export type AdoptCaptureDeps = {
  /** Copies the captured file into the private-export directory and resolves with the copy's uri. */
  copyIn: (sourceUri: string, name: string) => Promise<string>;
  /** Deletes the file view-shot made. */
  discard: (sourceUri: string) => void;
};

/**
 * Moves a share card out of the place view-shot chose (a temp folder or the cache root, where nothing purges it) into the
 * private-export directory. It never throws: if the copy fails the original is shared exactly as before this existed, so a
 * problem here can cost a leftover file but never a share.
 */
export async function adoptCapturedImageWith(deps: AdoptCaptureDeps, captured: string): Promise<string> {
  const source = capturedFileUri(captured);
  let adopted: string;
  try {
    adopted = await deps.copyIn(source, adoptedShareCardName(captured));
  } catch {
    return captured;
  }
  try {
    deps.discard(source);
  } catch {
    // The copy is what gets shared; the original sits in a temp location the system clears.
  }
  return adopted;
}

export type ShareCapturedImageDeps = {
  isSharingAvailable: () => Promise<boolean>;
  /** Takes the picture; resolves with the file view-shot wrote. */
  capture: () => Promise<string>;
  removeFiles: () => void;
  adopt: (captured: string) => Promise<string>;
  share: (uri: string) => Promise<void>;
};

/**
 * Captures a share card and hands it to the share sheet, with the same rules as an export: sharing is checked BEFORE anything is
 * captured, earlier copies are removed before the new one is placed, a failed share removes the file, and a successful share
 * leaves it. Resolves false, having captured nothing, when sharing is unavailable.
 */
export async function shareCapturedImageWith(deps: ShareCapturedImageDeps): Promise<boolean> {
  if (!(await deps.isSharingAvailable())) return false;
  const captured = await deps.capture();
  deps.removeFiles();
  const uri = await deps.adopt(captured);
  try {
    await deps.share(uri);
  } catch (error) {
    try {
      deps.removeFiles();
    } catch {
      // The share error is the one the person needs; a file that could not be removed is retried at the next purge.
    }
    throw error;
  }
  return true;
}

/**
 * Removes every private file this module knows about from the app's cache: exports, share cards, the picker's copy and the
 * copies an earlier build left in the cache root. Called at sign-out and on an account switch. Best effort and never throws: it
 * must not stand in the way of a sign-out. The file module is loaded only when this runs.
 */
export function purgePrivateExportFiles(): void {
  void import('./privateExportFilesDevice').then((device) => device.removeAllPrivateCacheFiles()).catch(() => {});
}
