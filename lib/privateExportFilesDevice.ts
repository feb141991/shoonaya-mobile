import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  LEGACY_PRIVATE_EXPORT_NAMES,
  PRIVATE_EXPORT_DIRECTORY,
  sharePrivateExportWith,
  type PrivateExportName,
} from './privateExportFiles';

/**
 * The device half of the account data export and the sadhana report: a file in the app's own cache and the system share sheet.
 * Both native modules are already imported by Settings ("Download your data"), so this adds no native module and can ship over
 * the air (AGENTS 12). The rules for when a copy is removed are in lib/privateExportFiles.ts (AGENTS 25).
 */
function exportDirectory(): FileSystem.Directory {
  return new FileSystem.Directory(FileSystem.Paths.cache, PRIVATE_EXPORT_DIRECTORY);
}

/**
 * Removes the export directory and any copy an earlier build wrote straight into the cache root. Each target is tried on its own
 * so one that cannot be removed does not leave the others behind, and nothing throws: a copy that survives is retried at the
 * next export, sign-out or account switch.
 */
export function removePrivateExportFiles(): void {
  try {
    const directory = exportDirectory();
    if (directory.exists) directory.delete();
  } catch {
    // Retried at the next purge.
  }
  for (const name of LEGACY_PRIVATE_EXPORT_NAMES) {
    try {
      const legacy = new FileSystem.File(FileSystem.Paths.cache, name);
      if (legacy.exists) legacy.delete();
    } catch {
      // Retried at the next purge.
    }
  }
}

function writePrivateExportFile(name: PrivateExportName, body: string): string {
  const directory = exportDirectory();
  directory.create({ idempotent: true });
  const file = new FileSystem.File(directory, name);
  if (!file.exists) file.create();
  file.write(body);
  return file.uri;
}

/** Resolves false, having written nothing, when this device cannot share files. */
export function sharePrivateExport(name: PrivateExportName, body: string): Promise<boolean> {
  return sharePrivateExportWith(
    {
      isSharingAvailable: () => Sharing.isAvailableAsync(),
      removeFiles: removePrivateExportFiles,
      writeFile: writePrivateExportFile,
      share: (uri) => Sharing.shareAsync(uri),
    },
    name,
    body,
  );
}
