/**
 * Private files the app writes to its cache so the system share sheet can pick them up: the account-wide data export
 * (Settings, "Download your data") and the personal sadhana report (Profile). Both describe one person's life and practice, so a
 * copy must never outlive the account that made it (AGENTS 25).
 *
 * This is the part with no native import, so the root layout can call the purge without loading the file-system module at
 * startup. The device half (lib/privateExportFilesDevice.ts) writes the files.
 *
 * Every copy lives in ONE cache directory, so removing the directory removes every copy. The directory is removed:
 *  - before each new export, so at most one copy is ever on the device;
 *  - after a share that failed, because nothing was handed over;
 *  - at sign-out and on an account switch (app/_layout.tsx).
 * It is deliberately NOT removed when the share sheet's promise resolves: the Expo SDK 57 sharing docs do not say whether that
 * is before or after the receiving app has read the file, and an attachment read late would arrive empty.
 */
export const PRIVATE_EXPORT_DIRECTORY = 'private-exports';

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

/**
 * Removes every private export from the app's cache. Called at sign-out and on an account switch. Best effort and never
 * throws: it must not stand in the way of a sign-out. The file module is loaded only when this runs.
 */
export function purgePrivateExportFiles(): void {
  void import('./privateExportFilesDevice').then((device) => device.removePrivateExportFiles()).catch(() => {});
}
