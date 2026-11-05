import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import type { SanskaraExport } from './sanskaraContract';
import { shareSanskaraExportWith } from './sanskaraExportShare';

/**
 * The device half of the Sanskāra download: a file in the app's own cache and the system share sheet. Both modules are already
 * imported by Settings ("Download your data"), so this adds no native module and can ship over the air (AGENTS 12).
 *
 * Every copy lives in ONE directory so that removing it removes every copy. It holds private notes, so it is removed at
 * sign-out and on an account switch (app/_layout.tsx through purgeSanskaraExportFiles in lib/sanskara.ts), before each new
 * download and after a delete (AGENTS 25).
 */
const EXPORT_DIRECTORY = 'sanskara-export';

function exportDirectory(): FileSystem.Directory {
  return new FileSystem.Directory(FileSystem.Paths.cache, EXPORT_DIRECTORY);
}

export function removeSanskaraExportFiles(): void {
  const directory = exportDirectory();
  if (directory.exists) directory.delete();
}

function writeSanskaraExportFile(name: string, body: string): string {
  const directory = exportDirectory();
  directory.create({ idempotent: true });
  const file = new FileSystem.File(directory, name);
  if (!file.exists) file.create();
  file.write(body);
  return file.uri;
}

export function shareSanskaraExport(exp: SanskaraExport): Promise<void> {
  return shareSanskaraExportWith(
    {
      isSharingAvailable: () => Sharing.isAvailableAsync(),
      removeFiles: removeSanskaraExportFiles,
      writeFile: writeSanskaraExportFile,
      share: (uri, options) => Sharing.shareAsync(uri, options),
    },
    exp,
  );
}
