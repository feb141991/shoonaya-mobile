import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, sep } from 'node:path';
import test from 'node:test';

import {
  ACCOUNT_DATA_EXPORT_NAME,
  FALLBACK_SHARE_CARD_NAME,
  IMAGE_PICKER_CACHE_DIRECTORY,
  LEGACY_PRIVATE_EXPORT_NAMES,
  PRIVATE_EXPORT_DIRECTORY,
  SADHANA_REPORT_NAME,
  adoptCapturedImageWith,
  adoptedShareCardName,
  capturedFileUri,
  shareCapturedImageWith,
  sharePrivateExportWith,
  type AdoptCaptureDeps,
  type PrivateExportDeps,
  type PrivateExportName,
  type ShareCapturedImageDeps,
} from '../lib/privateExportFiles';

/**
 * Guard for AGENTS 25 (closed 2026-11-06): the account data export (Settings), the sadhana report (Profile), the share-card images
 * and the profile-photo picker's copy are private files in the app's cache. Exports and share cards live in one directory, are
 * removed before each new one and after a failed share, and everything is purged at sign-out and on an account switch. A shared
 * file is never removed when the share sheet's promise resolves.
 */

const ROOT = join(__dirname, '..');
const source = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** A fake device: a set of files in one directory plus a log of what the helper did, in order. */
function fakeDevice(over: Partial<PrivateExportDeps> = {}) {
  const files = new Map<string, string>();
  const log: string[] = [];
  const deps: PrivateExportDeps = {
    isSharingAvailable: async () => {
      log.push('available');
      return true;
    },
    removeFiles: () => {
      log.push('remove');
      files.clear();
    },
    writeFile: (name, body) => {
      log.push(`write:${name}`);
      files.set(name, body);
      return `file:///cache/${PRIVATE_EXPORT_DIRECTORY}/${name}`;
    },
    share: async () => {
      log.push('share');
    },
    ...over,
  };
  return { deps, files, log };
}

// ── The order of steps is the rule ─────────────────────────────────────────────────────────────────────────────────────

test('sharing unavailable: nothing is removed or written, and the caller is told', async () => {
  const device = fakeDevice({ isSharingAvailable: async () => false });
  const shared = await sharePrivateExportWith(device.deps, ACCOUNT_DATA_EXPORT_NAME, '{"private":true}');
  assert.equal(shared, false);
  assert.deepEqual(device.log, [], 'private data must not reach the disk for a share that cannot happen');
  assert.equal(device.files.size, 0);
});

test('a share: availability, then remove earlier copies, then write, then share', async () => {
  const device = fakeDevice();
  const shared = await sharePrivateExportWith(device.deps, SADHANA_REPORT_NAME, '<html>report</html>');
  assert.equal(shared, true);
  assert.deepEqual(device.log, ['available', 'remove', `write:${SADHANA_REPORT_NAME}`, 'share']);
});

test('a successful share does NOT remove the file: the receiving app may not have read it yet', async () => {
  const device = fakeDevice();
  await sharePrivateExportWith(device.deps, ACCOUNT_DATA_EXPORT_NAME, '{"private":true}');
  assert.equal(device.log.filter((step) => step === 'remove').length, 1, 'removed once, before the write, and not after the share');
  assert.equal(device.log[device.log.length - 1], 'share', 'nothing happens after the share sheet resolves');
  assert.equal(device.files.get(ACCOUNT_DATA_EXPORT_NAME), '{"private":true}', 'the file is still there for the receiving app');
});

test('a second export removes the first, so at most one private copy is on the device', async () => {
  const device = fakeDevice();
  await sharePrivateExportWith(device.deps, ACCOUNT_DATA_EXPORT_NAME, '{"private":true}');
  await sharePrivateExportWith(device.deps, SADHANA_REPORT_NAME, '<html>report</html>');
  assert.deepEqual([...device.files.keys()], [SADHANA_REPORT_NAME]);
  await sharePrivateExportWith(device.deps, SADHANA_REPORT_NAME, '<html>report again</html>');
  assert.deepEqual([...device.files.entries()], [[SADHANA_REPORT_NAME, '<html>report again</html>']]);
});

test('a failed share removes the file and rethrows the share error, not a cleanup error', async () => {
  const failure = new Error('share sheet failed');
  const device = fakeDevice();
  device.deps.share = async () => {
    device.log.push('share');
    throw failure;
  };
  await assert.rejects(sharePrivateExportWith(device.deps, ACCOUNT_DATA_EXPORT_NAME, 'x'), (error) => error === failure);
  assert.equal(device.files.size, 0, 'nothing was handed over, so nothing stays behind');
  assert.deepEqual(device.log, ['available', 'remove', `write:${ACCOUNT_DATA_EXPORT_NAME}`, 'share', 'remove']);

  const brokenCleanup = fakeDevice({
    share: async () => {
      throw failure;
    },
  });
  let removals = 0;
  brokenCleanup.deps.removeFiles = () => {
    removals += 1;
    if (removals > 1) throw new Error('could not remove');
  };
  await assert.rejects(sharePrivateExportWith(brokenCleanup.deps, SADHANA_REPORT_NAME, 'x'), (error) => error === failure);
});

test('a write that fails stops before the share and leaves no uri to hand over', async () => {
  const device = fakeDevice({
    writeFile: () => {
      throw new Error('disk full');
    },
  });
  await assert.rejects(sharePrivateExportWith(device.deps, ACCOUNT_DATA_EXPORT_NAME, 'x'), /disk full/);
  assert.ok(!device.log.includes('share'));
});

// ── Names and the cache location ───────────────────────────────────────────────────────────────────────────────────────

test('the two private exports have fixed names and the directory name is not one of the legacy cache-root files', () => {
  assert.equal(ACCOUNT_DATA_EXPORT_NAME, 'shoonaya-data.json');
  assert.equal(SADHANA_REPORT_NAME, 'sadhana-report.html');
  assert.equal(PRIVATE_EXPORT_DIRECTORY, 'private-exports');
  assert.deepEqual([...LEGACY_PRIVATE_EXPORT_NAMES].sort(), [ACCOUNT_DATA_EXPORT_NAME, SADHANA_REPORT_NAME].sort());
  const names: PrivateExportName[] = [ACCOUNT_DATA_EXPORT_NAME, SADHANA_REPORT_NAME];
  for (const name of names) assert.doesNotMatch(name, /[\\/]/, 'a plain file name, never a path');
});

test('device module: one cache directory, removed whole, and the copies an earlier build left in the cache root are removed too', () => {
  const device = source('lib/privateExportFilesDevice.ts');
  assert.match(device, /new FileSystem\.Directory\(FileSystem\.Paths\.cache, PRIVATE_EXPORT_DIRECTORY\)/);
  assert.doesNotMatch(device, /Paths\.document|Paths\.bundle|cacheDirectory|documentDirectory/, 'cache only');
  assert.doesNotMatch(device, /AsyncStorage|SecureStore/);
  const remove = /export function removePrivateExportFiles[\s\S]*?\n}\n/.exec(device)?.[0] ?? '';
  assert.match(remove, /directory\.exists/);
  assert.match(remove, /directory\.delete\(\)/, 'removing the directory removes every copy');
  assert.match(remove, /for \(const name of LEGACY_PRIVATE_EXPORT_NAMES\)/);
  assert.match(remove, /new FileSystem\.File\(FileSystem\.Paths\.cache, name\)/, 'the files an earlier build wrote to the cache root');
  assert.match(remove, /legacy\.delete\(\)/);
  assert.equal((remove.match(/try \{/g) ?? []).length, 2, 'each target is tried on its own, so one failure leaves no other copy behind');
  assert.doesNotMatch(remove, /throw /, 'a purge never throws: it must not stand in the way of a sign-out');
});

test('device module: writes inside the export directory and hands the share sheet that file, with no early removal', () => {
  const device = source('lib/privateExportFilesDevice.ts');
  const write = /function writePrivateExportFile[\s\S]*?\n}\n/.exec(device)?.[0] ?? '';
  assert.match(write, /directory\.create\(\{ idempotent: true \}\)/);
  assert.match(write, /new FileSystem\.File\(directory, name\)/);
  assert.match(write, /return file\.uri/);
  assert.match(device, /share: \(uri\) => Sharing\.shareAsync\(uri\)/);
  assert.match(device, /removeFiles: removePrivateExportFiles/);
  assert.doesNotMatch(device, /shareAsync\([^)]*\)\s*\.then|await Sharing\.shareAsync[\s\S]{0,80}(delete|remove)/, 'never removed right after shareAsync');
});

test('pure module: no native import, and the purge loads the file module only when it runs', () => {
  const pure = source('lib/privateExportFiles.ts');
  assert.doesNotMatch(pure, /^import .*(expo-file-system|expo-sharing|privateExportFilesDevice)/m);
  assert.match(pure, /import\('\.\/privateExportFilesDevice'\)/);
  assert.match(pure, /\.then\(\(device\) => device\.removeAllPrivateCacheFiles\(\)\)\.catch\(\(\) => \{\}\)/, 'best effort, never throws');
  assert.doesNotMatch(source('app/_layout.tsx'), /privateExportFilesDevice/, 'the root layout never loads the file module at startup');
});

test('adds no native module: the device module imports only the two modules Settings already shipped with', () => {
  const imports = [...source('lib/privateExportFilesDevice.ts').matchAll(/^import .* from '([^']+)';/gm)].map((m) => m[1]);
  const native = imports.filter((name) => !name.startsWith('.'));
  assert.deepEqual(native.sort(), ['expo-file-system', 'expo-sharing']);
  const pkg = JSON.parse(source('package.json')) as { dependencies: Record<string, string> };
  assert.ok(pkg.dependencies['expo-file-system'] && pkg.dependencies['expo-sharing']);
});

// ── The two screens use the helper and never write the files themselves ────────────────────────────────────────────────

test('Settings "Download your data" writes through the helper, never straight into the cache', () => {
  const settings = source('app/settings/detail-screen.tsx');
  const handler = /const handleDownloadData = async \(\) => \{[\s\S]*?\n  \};/.exec(settings)?.[0] ?? '';
  assert.ok(handler.length > 0);
  assert.match(handler, /sharePrivateExport\(ACCOUNT_DATA_EXPORT_NAME, data\)/);
  assert.match(handler, /Sharing not available/, 'the unavailable message is kept');
  assert.doesNotMatch(settings, /FileSystem\./);
  assert.doesNotMatch(settings, /expo-file-system|expo-sharing|Sharing\./, 'Settings reaches both through the helper');
  assert.doesNotMatch(settings, /shoonaya-data\.json/, 'the name lives in lib/privateExportFiles.ts only');
});

test('Profile sadhana report writes through the helper, never straight into the cache', () => {
  const profile = source('app/(tabs)/profile.tsx');
  assert.match(profile, /sharePrivateExport\(SADHANA_REPORT_NAME, html\)/);
  assert.match(profile, /Sharing not available/, 'the unavailable message is kept');
  assert.doesNotMatch(profile, /FileSystem\./);
  assert.doesNotMatch(profile, /expo-file-system/);
  assert.doesNotMatch(profile, /sadhana-report\.html/, 'the name lives in lib/privateExportFiles.ts only');
  assert.doesNotMatch(profile, /Sharing\.isAvailableAsync|targetFile/, 'the screen no longer checks for sharing or holds a file itself');
});

// ── Sign-out and account switch ────────────────────────────────────────────────────────────────────────────────────────

test('layout: private exports are purged at sign-out and on an account switch', () => {
  const layout = source('app/_layout.tsx');
  assert.match(layout, /import \{ purgePrivateExportFiles \} from '@\/lib\/privateExportFiles';/);
  const signedOut = /if \(event === 'SIGNED_OUT'\) \{[\s\S]*?\n      \}/.exec(layout)?.[0] ?? '';
  assert.match(signedOut, /purgePrivateExportFiles\(\)/);
  const switchBlock = /if \(previousRouteKey && previousRouteKey !== session\.user\.id\) \{[\s\S]*?\n      \}/.exec(layout)?.[0] ?? '';
  assert.match(switchBlock, /clearAllUserScopedStorage\(\)/, 'the block found is the account switch');
  assert.match(switchBlock, /purgePrivateExportFiles\(\)/);
  assert.equal((layout.match(/purgePrivateExportFiles\(\)/g) ?? []).length, 2, 'exactly the two boundaries');
});

// ── Share cards ────────────────────────────────────────────────────────────────────────────────────────────────────────

const ANDROID_CAPTURE = 'file:///data/user/0/com.shoonaya.app/cache/shoonaya-quiz-result8812345.png';
const IOS_CAPTURE = '/var/mobile/Containers/Data/Application/ABC/tmp/ReactNative/8F2C1D3E-1111-4222-8333-444455556666.png';

test('capture uri: Android answers with a file uri, iOS with a bare path that gets a file:// prefix', () => {
  assert.equal(capturedFileUri(ANDROID_CAPTURE), ANDROID_CAPTURE);
  assert.equal(capturedFileUri(IOS_CAPTURE), `file://${IOS_CAPTURE}`);
});

test('share card name: a plain ASCII .png name is kept, anything else becomes the neutral fixed name', () => {
  assert.equal(adoptedShareCardName(ANDROID_CAPTURE), 'shoonaya-quiz-result8812345.png');
  assert.equal(adoptedShareCardName(IOS_CAPTURE), '8F2C1D3E-1111-4222-8333-444455556666.png');
  assert.equal(adoptedShareCardName('file:///cache/%E0%A4%86%E0%A4%B0%E0%A4%B5-dharmic-story1.png'), FALLBACK_SHARE_CARD_NAME, 'a Devanagari name');
  assert.equal(adoptedShareCardName('file:///cache/card.jpg'), FALLBACK_SHARE_CARD_NAME, 'not a png');
  assert.equal(adoptedShareCardName('file:///cache/a b.png'), FALLBACK_SHARE_CARD_NAME, 'a space');
  assert.equal(adoptedShareCardName('file:///cache/%E0%A4%A.png'), FALLBACK_SHARE_CARD_NAME, 'a malformed escape');
  assert.equal(adoptedShareCardName('file:///cache/'), FALLBACK_SHARE_CARD_NAME, 'no file name');
  assert.equal(adoptedShareCardName(''), FALLBACK_SHARE_CARD_NAME);
  assert.equal(adoptedShareCardName('file:///cache/..%2F..%2Fx.png'), FALLBACK_SHARE_CARD_NAME, 'a path escape never becomes a file name');
});

function fakeAdopt(over: Partial<AdoptCaptureDeps> = {}) {
  const calls: string[] = [];
  const deps: AdoptCaptureDeps = {
    copyIn: async (source, name) => {
      calls.push(`copy:${source}:${name}`);
      return `file:///cache/${PRIVATE_EXPORT_DIRECTORY}/${name}`;
    },
    discard: (source) => {
      calls.push(`discard:${source}`);
    },
    ...over,
  };
  return { deps, calls };
}

test('adopting a capture: copy into the private directory, then delete the original, and share the copy', async () => {
  const android = fakeAdopt();
  assert.equal(
    await adoptCapturedImageWith(android.deps, ANDROID_CAPTURE),
    `file:///cache/${PRIVATE_EXPORT_DIRECTORY}/shoonaya-quiz-result8812345.png`,
  );
  assert.deepEqual(android.calls, [
    `copy:${ANDROID_CAPTURE}:shoonaya-quiz-result8812345.png`,
    `discard:${ANDROID_CAPTURE}`,
  ]);

  const ios = fakeAdopt();
  await adoptCapturedImageWith(ios.deps, IOS_CAPTURE);
  assert.equal(ios.calls[0], `copy:file://${IOS_CAPTURE}:8F2C1D3E-1111-4222-8333-444455556666.png`, 'the bare iOS path is turned into a uri');
  assert.equal(ios.calls[1], `discard:file://${IOS_CAPTURE}`);
});

test('adopting a capture: if the copy fails the original is shared as before and is NOT deleted', async () => {
  const failing = fakeAdopt({
    copyIn: async () => {
      throw new Error('copy failed');
    },
  });
  assert.equal(await adoptCapturedImageWith(failing.deps, IOS_CAPTURE), IOS_CAPTURE, 'the exact string view-shot gave');
  assert.deepEqual(failing.calls, [], 'nothing is discarded when there is no copy to share instead');
});

test('adopting a capture: an original that cannot be deleted does not stop the share of the copy', async () => {
  const stuck = fakeAdopt({
    discard: () => {
      throw new Error('could not delete');
    },
  });
  assert.equal(await adoptCapturedImageWith(stuck.deps, ANDROID_CAPTURE), `file:///cache/${PRIVATE_EXPORT_DIRECTORY}/shoonaya-quiz-result8812345.png`);
});

function fakeCardDevice(over: Partial<ShareCapturedImageDeps> = {}) {
  const files = new Map<string, string>();
  const log: string[] = [];
  let counter = 0;
  const deps: ShareCapturedImageDeps = {
    isSharingAvailable: async () => {
      log.push('available');
      return true;
    },
    capture: async () => {
      counter += 1;
      log.push('capture');
      return `file:///tmp/card${counter}.png`;
    },
    removeFiles: () => {
      log.push('remove');
      files.clear();
    },
    adopt: async (captured) => {
      log.push('adopt');
      const name = `card${counter}.png`;
      files.set(name, captured);
      return `file:///cache/${PRIVATE_EXPORT_DIRECTORY}/${name}`;
    },
    share: async () => {
      log.push('share');
    },
    ...over,
  };
  return { deps, files, log };
}

test('a share card: sharing is checked before anything is captured, then capture, remove earlier copies, adopt, share', async () => {
  const unavailable = fakeCardDevice({ isSharingAvailable: async () => false });
  assert.equal(await shareCapturedImageWith(unavailable.deps), false);
  assert.deepEqual(unavailable.log, [], 'no picture is taken for a share that cannot happen');

  const device = fakeCardDevice();
  assert.equal(await shareCapturedImageWith(device.deps), true);
  assert.deepEqual(device.log, ['available', 'capture', 'remove', 'adopt', 'share']);
});

test('a share card: a successful share leaves the file, and the next card replaces it, so one copy at most', async () => {
  const device = fakeCardDevice();
  await shareCapturedImageWith(device.deps);
  assert.equal(device.log[device.log.length - 1], 'share', 'nothing happens after the share sheet resolves');
  assert.deepEqual([...device.files.keys()], ['card1.png'], 'still there for the receiving app');
  await shareCapturedImageWith(device.deps);
  assert.deepEqual([...device.files.keys()], ['card2.png']);
});

test('a share card: a failed share removes the card and rethrows the share error', async () => {
  const failure = new Error('share sheet failed');
  const device = fakeCardDevice();
  device.deps.share = async () => {
    device.log.push('share');
    throw failure;
  };
  await assert.rejects(shareCapturedImageWith(device.deps), (error) => error === failure);
  assert.equal(device.files.size, 0);
  assert.deepEqual(device.log, ['available', 'capture', 'remove', 'adopt', 'share', 'remove']);

  const brokenCleanup = fakeCardDevice();
  brokenCleanup.deps.share = async () => {
    throw failure;
  };
  let removals = 0;
  brokenCleanup.deps.removeFiles = () => {
    removals += 1;
    if (removals > 1) throw new Error('could not remove');
  };
  await assert.rejects(shareCapturedImageWith(brokenCleanup.deps), (error) => error === failure);
});

test('a share card: a capture that fails removes nothing and adopts nothing', async () => {
  const device = fakeCardDevice({
    capture: async () => {
      throw new Error('view cannot be captured');
    },
  });
  await assert.rejects(shareCapturedImageWith(device.deps), /view cannot be captured/);
  assert.deepEqual(device.log, ['available']);
});

test('share-card.ts: every card goes through the purged directory, loaded on first share, with its capture settings unchanged', () => {
  const card = source('lib/share-card.ts');
  assert.match(card, /await import\('\.\/privateExportFilesDevice'\)/);
  assert.doesNotMatch(card, /^import .*privateExportFilesDevice/m, 'the file module is not loaded when a screen opens');
  assert.match(card, /shareCapturedImage\(\s*\(\) =>\s*captureRef\(ref, \{/);
  assert.doesNotMatch(card, /Sharing\.|expo-sharing/, 'the helper no longer shares a file from the place view-shot chose');
  assert.match(card, /result: 'tmpfile'/);
  assert.match(card, /mimeType: 'image\/png'/);
  assert.match(card, /UTI: 'public\.png'/);
  assert.match(card, /if \(!shared\) \{\s*Alert\.alert\(options\.fallbackMessage/, 'the unavailable message is kept');
});

test('device module: share cards are copied into the export directory and the original deleted, never the other way round', () => {
  const device = source('lib/privateExportFilesDevice.ts');
  const copy = /async function copyCaptureIntoDirectory[\s\S]*?\n}\n/.exec(device)?.[0] ?? '';
  assert.match(copy, /exportDirectory\(\)/);
  assert.match(copy, /new FileSystem\.File\(directory, name\)/);
  assert.match(copy, /new FileSystem\.File\(sourceUri\)\.copy\(destination/);
  assert.match(copy, /if \(!destination\.exists\) throw/, 'a copy that did not happen is reported, so the original is kept and shared');
  assert.match(device, /discard: \(sourceUri\) => new FileSystem\.File\(sourceUri\)\.delete\(\)/);
  assert.match(device, /removeFiles: removePrivateExportFiles,\s*adopt:/);
  assert.match(device, /share: \(uri\) => Sharing\.shareAsync\(uri, shareOptions\)/);
});

// ── The profile photo picker ───────────────────────────────────────────────────────────────────────────────────────────

test('picker copy: only expo-image-picker\'s own folder in the cache is removed, never a uri a pick returned', () => {
  assert.equal(IMAGE_PICKER_CACHE_DIRECTORY, 'ImagePicker');
  const device = source('lib/privateExportFilesDevice.ts');
  const remove = /export function removeImagePickerCopies[\s\S]*?\n}\n/.exec(device)?.[0] ?? '';
  assert.match(remove, /new FileSystem\.Directory\(FileSystem\.Paths\.cache, IMAGE_PICKER_CACHE_DIRECTORY\)/);
  assert.match(remove, /directory\.exists/);
  assert.match(remove, /directory\.delete\(\)/);
  assert.doesNotMatch(remove, /throw |uri|asset/, 'it cannot be handed a pick and delete the person\'s own photo');
  const all = /export function removeAllPrivateCacheFiles[\s\S]*?\n}\n/.exec(device)?.[0] ?? '';
  assert.match(all, /removePrivateExportFiles\(\);\s*removeImagePickerCopies\(\);/, 'the sign-out purge removes both');
});

test('picker copy: the profile picture upload removes it as soon as the pick is used, even when the pick fails or is abandoned', () => {
  const profile = source('app/(tabs)/profile.tsx');
  const pick = /const pickAvatar = async \(\) => \{[\s\S]*?\n  \};/.exec(profile)?.[0] ?? '';
  assert.ok(pick.length > 0);
  assert.match(pick, /\} finally \{[\s\S]*?removeImagePickerCopies\(\);[\s\S]*?\}\n  \};/, 'in the finally block');
  assert.match(pick, /base64: true/, 'the upload reads the base64, so the file is never needed again');
  assert.doesNotMatch(pick, /asset\.uri|FileSystem\./, 'nothing reads the picker\'s file');
  assert.match(profile, /import \{ removeImagePickerCopies, sharePrivateExport \} from '@\/lib\/privateExportFilesDevice';/);
});

// ── The class: nothing else writes a private file to the cache ─────────────────────────────────────────────────────────

/**
 * Files that write to the cache directory, each with the reason it is allowed. This list may only SHRINK: a new writer of a
 * private file goes through lib/privateExportFilesDevice.ts or lib/sanskaraExportDevice.ts (which are purged), and is never added
 * here. An entry that no longer writes to the cache must be deleted, so the list cannot go stale.
 */
const CACHE_WRITERS: Record<string, string> = {
  'lib/privateExportFilesDevice.ts': 'the purged home of the account data export and the sadhana report',
  'lib/sanskaraExportDevice.ts': 'the purged home of the Sanskāra export (AGENTS 25)',
  'components/home/SacredDaysCarousel.tsx': 'shoonaya-dharmic-calendar.ics: the public dharmic calendar, nothing about the person',
  'hooks/useReaderControls.ts': 'tts_audio_N: read-aloud audio of public scripture and katha text, rotated over four files',
};

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(join(ROOT, dir))) {
    const rel = join(dir, entry);
    const stat = statSync(join(ROOT, rel));
    if (stat.isDirectory()) out.push(...sourceFiles(rel));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(rel);
  }
  return out;
}

test('every writer to the cache directory is a purged private-export module or on the shrink-only public list', () => {
  const writers = ['app', 'lib', 'components', 'hooks']
    .flatMap(sourceFiles)
    .filter((file) => /Paths\.cache|cacheDirectory/.test(source(file)))
    .map((file) => file.split(sep).join('/'))
    .sort();
  assert.deepEqual(writers, Object.keys(CACHE_WRITERS).sort());
});

test('the cache-writer list may only shrink: the two purged modules, a public calendar and public audio', () => {
  assert.ok(Object.keys(CACHE_WRITERS).length <= 4, 'a new entry is a new private file in the cache: use the purged modules instead');
  assert.match(CACHE_WRITERS['components/home/SacredDaysCarousel.tsx'], /public/);
  assert.match(CACHE_WRITERS['hooks/useReaderControls.ts'], /public/);
});

/**
 * Libraries that write files into the cache or a temp folder on their own, where the text search above cannot see them. Each
 * importer is listed with what happens to its files. A new importer fails the test until someone decides, and records here, how
 * its files are purged. These lists may only shrink.
 */
const SELF_WRITING_LIBRARIES: Record<string, Record<string, string>> = {
  'react-native-view-shot': {
    'lib/share-card.ts': 'share cards: copied into the purged private-export directory by shareCapturedImage',
  },
  'expo-image-picker': {
    'app/(tabs)/profile.tsx': 'profile picture: the picker folder is removed after each pick and at sign-out (removeImagePickerCopies)',
  },
  'expo-image-manipulator': {},
  'expo-print': {},
  'expo-document-picker': {},
  'expo-camera': {},
  'expo-media-library': {},
};

test('every importer of a library that writes its own cache files is listed with how those files are purged', () => {
  const files = ['app', 'lib', 'components', 'hooks'].flatMap(sourceFiles).map((file) => file.split(sep).join('/'));
  for (const [library, allowed] of Object.entries(SELF_WRITING_LIBRARIES)) {
    const importers = files
      .filter((file) => new RegExp(`(from|require\\()\\s*'${library}'`).test(source(file)))
      .sort();
    assert.deepEqual(importers, Object.keys(allowed).sort(), `${library}: importers must be exactly the listed files`);
  }
});

/** Files that hand a file or link to the share sheet. A file that is private goes through the purged modules. */
const SHARE_SHEET_CALLERS: Record<string, string> = {
  'lib/privateExportFilesDevice.ts': 'exports, sadhana report and share cards, all in the purged directory',
  'lib/sanskaraExportDevice.ts': 'the Sanskāra export, in its own purged directory',
  'components/home/SacredDaysCarousel.tsx': 'the public dharmic calendar file',
  'app/(tabs)/profile.tsx': 'a link to the app (API_BASE), no file',
};

test('every caller of the share sheet is a purged module or on the shrink-only list of public files and links', () => {
  const callers = ['app', 'lib', 'components', 'hooks']
    .flatMap(sourceFiles)
    .filter((file) => /Sharing\.shareAsync\(/.test(source(file)))
    .map((file) => file.split(sep).join('/'))
    .sort();
  assert.deepEqual(callers, Object.keys(SHARE_SHEET_CALLERS).sort());
  assert.ok(Object.keys(SHARE_SHEET_CALLERS).length <= 4, 'may only shrink');
});
