import { exportFileBody, exportFileName } from './sanskaraData';
import type { SanskaraExport } from './sanskaraContract';

export const EXPORT_MIME_TYPE = 'application/json';
export const EXPORT_UTI = 'public.json';
export const EXPORT_DIALOG_TITLE = 'Save your Sanskāra data';

export class SharingUnavailableError extends Error {
  constructor() {
    super('Sharing is not available on this device.');
    this.name = 'SharingUnavailableError';
  }
}

export type ExportFileDeps = {
  isSharingAvailable: () => Promise<boolean>;
  /** Removes every earlier export file. Called before a new one is written and after a failed share. */
  removeFiles: () => void;
  /** Writes the file and returns its uri. */
  writeFile: (name: string, body: string) => string;
  share: (uri: string, options: { mimeType: string; UTI: string; dialogTitle: string }) => Promise<void>;
};

/**
 * Hands the person a copy of what the server sent, through the system share sheet. The order matters, and each step is a rule:
 *
 *  1. Ask whether sharing exists BEFORE writing. Notes and places must not reach the disk for a share that cannot happen.
 *  2. Remove every earlier export before writing a new one, so at most one copy is ever on the device.
 *  3. If the share fails, remove the file: nothing was handed over, so nothing should stay behind.
 *  4. When the share succeeds, the file is NOT removed here. Whether the share sheet's promise resolves before or after the
 *     receiving app has read the file is not documented (Expo SDK 57 sharing docs), and an attachment read late would arrive
 *     empty. Sign-out, an account switch, the next download and a delete remove it instead (AGENTS 25).
 */
export async function shareSanskaraExportWith(deps: ExportFileDeps, exp: SanskaraExport): Promise<void> {
  if (!(await deps.isSharingAvailable())) throw new SharingUnavailableError();
  deps.removeFiles();
  const uri = deps.writeFile(exportFileName(exp.generated_at), exportFileBody(exp));
  try {
    await deps.share(uri, { mimeType: EXPORT_MIME_TYPE, UTI: EXPORT_UTI, dialogTitle: EXPORT_DIALOG_TITLE });
  } catch (error) {
    try {
      deps.removeFiles();
    } catch {
      // The share error is the one the person needs; a file that could not be removed is retried at the next purge.
    }
    throw error;
  }
}
