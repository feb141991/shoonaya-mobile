import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import {
  IMAGE_PICKER_CACHE_DIRECTORY,
  LEGACY_PRIVATE_EXPORT_NAMES,
  PRIVATE_EXPORT_DIRECTORY,
  adoptCapturedImageWith,
  shareCapturedImageWith,
  sharePrivateExportWith,
  type PrivateExportName,
} from './privateExportFiles';

/**
 * The device half of the private files in the cache: the account data export, the sadhana report, share cards and the picker's
 * copy. Both native modules are already imported by Settings ("Download your data"), so this adds no native module and can ship
 * over the air (AGENTS 12). The rules for when a copy is removed are in lib/privateExportFiles.ts (AGENTS 25).
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

/**
 * Removes expo-image-picker's output folder. The profile picture is uploaded from the base64 the picker returns, so the file is
 * never read again. Only that folder is touched, never the uri a pick returns: an unedited pick can point at the person's own
 * photo, and deleting that would delete their photo.
 */
export function removeImagePickerCopies(): void {
  try {
    const directory = new FileSystem.Directory(FileSystem.Paths.cache, IMAGE_PICKER_CACHE_DIRECTORY);
    if (directory.exists) directory.delete();
  } catch {
    // Retried at the next purge.
  }
}

/** Everything the sign-out purge removes. */
export function removeAllPrivateCacheFiles(): void {
  removePrivateExportFiles();
  removeImagePickerCopies();
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

async function copyCaptureIntoDirectory(sourceUri: string, name: string): Promise<string> {
  const directory = exportDirectory();
  directory.create({ idempotent: true });
  const destination = new FileSystem.File(directory, name);
  await new FileSystem.File(sourceUri).copy(destination, { overwrite: true });
  if (!destination.exists) throw new Error('The share card was not copied.');
  return destination.uri;
}

/**
 * Captures a share card (`capture` is the react-native-view-shot call) and hands it to the share sheet, keeping the file in the
 * purged private-export directory. Resolves false, having captured nothing, when this device cannot share files.
 */
export function shareCapturedImage(
  capture: () => Promise<string>,
  shareOptions: { mimeType: string; dialogTitle: string; UTI: string },
): Promise<boolean> {
  return shareCapturedImageWith({
    isSharingAvailable: () => Sharing.isAvailableAsync(),
    capture,
    removeFiles: removePrivateExportFiles,
    adopt: (captured) =>
      adoptCapturedImageWith(
        {
          copyIn: copyCaptureIntoDirectory,
          discard: (sourceUri) => new FileSystem.File(sourceUri).delete(),
        },
        captured,
      ),
    share: (uri) => Sharing.shareAsync(uri, shareOptions),
  });
}
