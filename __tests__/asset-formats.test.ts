import assert from 'node:assert/strict';
import path from 'node:path';
import { deflateSync } from 'node:zlib';
import { describe, it } from 'node:test';

import {
  MISMATCH_ADVICE,
  checkImageAsset,
  formatFromExtension,
  inspectPng,
  isCutoutArtPath,
  sniffImageFormat,
  webpHasAlpha,
} from '../lib/assetFormat';
import { scanAssets } from '../scripts/check-asset-formats';

// ── Byte builders: real, minimal files so the checks are exercised on actual formats ──

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of bytes) {
    c ^= byte;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return (c ^ 0xffffffff) >>> 0;
}

function u32be(value: number): Buffer {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value >>> 0);
  return out;
}

function pngChunk(type: string, data: Buffer, opts: { badCrc?: boolean } = {}): Buffer {
  const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
  const crc = crc32(body) ^ (opts.badCrc ? 1 : 0);
  return Buffer.concat([u32be(data.length), body, u32be(crc)]);
}

const SAMPLE_BYTES: Record<number, number> = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };

function makePng(
  colorType: 0 | 2 | 3 | 4 | 6,
  opts: { trns?: boolean; badCrc?: boolean; noIend?: boolean; noIdat?: boolean } = {},
): Uint8Array {
  const ihdr = Buffer.concat([u32be(1), u32be(1), Buffer.from([8, colorType, 0, 0, 0])]);
  const scanline = Buffer.concat([Buffer.from([0]), Buffer.alloc(SAMPLE_BYTES[colorType], 0x7f)]);
  const parts: Buffer[] = [Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), pngChunk('IHDR', ihdr)];
  if (colorType === 3) parts.push(pngChunk('PLTE', Buffer.from([1, 2, 3])));
  if (opts.trns) parts.push(pngChunk('tRNS', Buffer.from(colorType === 3 ? [0] : colorType === 0 ? [0, 0] : [0, 0, 0, 0, 0, 0])));
  if (!opts.noIdat) parts.push(pngChunk('IDAT', deflateSync(scanline), { badCrc: opts.badCrc }));
  if (!opts.noIend) parts.push(pngChunk('IEND', Buffer.alloc(0)));
  return Buffer.concat(parts);
}

// First bytes of a real JPEG (what the eight relic files actually are).
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00]);
const GIF = Buffer.from('GIF89a\x01\x00\x01\x00\x00\x00\x00;', 'latin1');

function riff(chunks: Buffer[]): Buffer {
  const body = Buffer.concat([Buffer.from('WEBP', 'latin1'), ...chunks]);
  const size = Buffer.alloc(4);
  size.writeUInt32LE(body.length);
  return Buffer.concat([Buffer.from('RIFF', 'latin1'), size, body]);
}

function webpChunk(type: string, data: Buffer): Buffer {
  const size = Buffer.alloc(4);
  size.writeUInt32LE(data.length);
  return Buffer.concat([Buffer.from(type, 'latin1'), size, data, data.length & 1 ? Buffer.alloc(1) : Buffer.alloc(0)]);
}

const webpLossy = () => riff([webpChunk('VP8 ', Buffer.alloc(10, 1))]);
const webpWithAlphaFlag = (alpha: boolean) => riff([webpChunk('VP8X', Buffer.from([alpha ? 0x10 : 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]))]);
function webpLossless(alphaUsed: boolean): Buffer {
  const header = Buffer.alloc(5);
  header[0] = 0x2f;
  header.writeUInt32LE(((alphaUsed ? 1 : 0) << 28) >>> 0, 1);
  return riff([webpChunk('VP8L', header)]);
}

const codes = (path_: string, bytes: Uint8Array) => checkImageAsset(path_, bytes).map((problem) => problem.code);

describe('image format detection', () => {
  it('recognises each format from its bytes, not its name', () => {
    assert.equal(sniffImageFormat(makePng(6)), 'png');
    assert.equal(sniffImageFormat(JPEG), 'jpeg');
    assert.equal(sniffImageFormat(webpLossy()), 'webp');
    assert.equal(sniffImageFormat(GIF), 'gif');
  });

  it('returns null for empty files and Git LFS pointers', () => {
    assert.equal(sniffImageFormat(new Uint8Array()), null);
    assert.equal(sniffImageFormat(Buffer.from('version https://git-lfs.github.com/spec/v1\noid sha256:abc\n')), null);
  });

  it('reads the expected format from the extension, case-insensitively', () => {
    assert.equal(formatFromExtension('a/b/c.PNG'), 'png');
    assert.equal(formatFromExtension('a.jpg'), 'jpeg');
    assert.equal(formatFromExtension('a.JPEG'), 'jpeg');
    assert.equal(formatFromExtension('a.webp'), 'webp');
    assert.equal(formatFromExtension('a.json'), null);
    assert.equal(formatFromExtension('noextension'), null);
  });
});

describe('format must match the extension (the Android build 46 failure)', () => {
  it('rejects a JPEG named .png and says what it really is', () => {
    const problems = checkImageAsset('assets/heroes/photo.png', JPEG);
    assert.deepEqual(problems.map((p) => p.code), ['FORMAT_MISMATCH']);
    assert.match(problems[0].message, /really a JPEG but is named \.png/);
    assert.match(MISMATCH_ADVICE, /AAPT2/); // printed once by the CLI, not repeated per file
  });

  it('tells people when renaming is and is not the fix', () => {
    assert.match(MISMATCH_ADVICE, /opaque photo/);
    assert.match(MISMATCH_ADVICE, /Renaming cut-out art is not a fix/);
  });

  it('rejects a PNG named .jpg and a WebP named .png', () => {
    assert.deepEqual(codes('assets/a/b.jpg', makePng(2)), ['FORMAT_MISMATCH']);
    assert.deepEqual(codes('assets/a/b.png', webpLossy()), ['FORMAT_MISMATCH']);
  });

  it('accepts files whose name and content agree', () => {
    assert.deepEqual(codes('assets/heroes/a.png', makePng(2)), []);
    assert.deepEqual(codes('assets/heroes/a.jpg', JPEG), []);
    assert.deepEqual(codes('assets/heroes/a.webp', webpLossy()), []);
    assert.deepEqual(codes('assets/heroes/a.gif', GIF), []);
  });

  it('flags files that are not images at all, including LFS pointers, instead of letting the build discover them', () => {
    assert.deepEqual(codes('assets/a/b.png', new Uint8Array()), ['UNRECOGNISED']);
    assert.deepEqual(codes('assets/a/b.png', Buffer.from('version https://git-lfs.github.com/spec/v1\n')), ['UNRECOGNISED']);
  });

  it('ignores files that are not raster images', () => {
    assert.deepEqual(checkImageAsset('assets/data/x.json', Buffer.from('{}')), []);
    assert.deepEqual(checkImageAsset('assets/icons/x.svg', Buffer.from('<svg/>')), []);
  });
});

describe('PNG integrity', () => {
  it('accepts a well-formed PNG and reports its size and alpha', () => {
    const rgba = inspectPng(makePng(6));
    assert.deepEqual(rgba.ok && [rgba.width, rgba.height, rgba.hasAlpha], [1, 1, true]);
    const rgb = inspectPng(makePng(2));
    assert.equal(rgb.ok && rgb.hasAlpha, false);
  });

  it('rejects a bad checksum, a missing IEND and missing image data as CORRUPT_PNG', () => {
    assert.deepEqual(codes('assets/heroes/a.png', makePng(6, { badCrc: true })), ['CORRUPT_PNG']);
    assert.deepEqual(codes('assets/heroes/a.png', makePng(6, { noIend: true })), ['CORRUPT_PNG']);
    assert.deepEqual(codes('assets/heroes/a.png', makePng(6, { noIdat: true })), ['CORRUPT_PNG']);
  });

  it('rejects a truncated PNG', () => {
    const whole = makePng(6);
    assert.deepEqual(codes('assets/heroes/a.png', whole.subarray(0, whole.length - 9)), ['CORRUPT_PNG']);
  });
});

describe('cut-out art must have real transparency', () => {
  it('knows which folders are cut-out art', () => {
    assert.equal(isCutoutArtPath('assets/relics/diya.png'), true);
    assert.equal(isCutoutArtPath('assets/icons/japa.png'), true);
    assert.equal(isCutoutArtPath('assets/heroes/photo.png'), false);
    assert.equal(isCutoutArtPath('docs/assets/relics/x.png'), false);
  });

  it('rejects an opaque PNG in a cut-out folder (converting the JPEG is not a fix)', () => {
    for (const colorType of [0, 2, 3] as const) {
      assert.deepEqual(codes('assets/relics/lamp.png', makePng(colorType)), ['NO_ALPHA'], `color type ${colorType}`);
    }
  });

  it('accepts PNGs with an alpha channel or transparency data in a cut-out folder', () => {
    assert.deepEqual(codes('assets/relics/lamp.png', makePng(4)), []);
    assert.deepEqual(codes('assets/relics/lamp.png', makePng(6)), []);
    assert.deepEqual(codes('assets/relics/lamp.png', makePng(3, { trns: true })), []);
    assert.deepEqual(codes('assets/icons/lamp.png', makePng(2, { trns: true })), []);
  });

  it('rejects a correctly-named JPEG in a cut-out folder, since JPEG cannot carry transparency', () => {
    assert.deepEqual(codes('assets/relics/lamp.jpg', JPEG), ['NO_ALPHA']);
  });

  it('rejects opaque WebP and accepts WebP with an alpha flag, in both lossy-with-VP8X and lossless forms', () => {
    assert.equal(webpHasAlpha(webpLossy()), false);
    assert.equal(webpHasAlpha(webpWithAlphaFlag(false)), false);
    assert.equal(webpHasAlpha(webpWithAlphaFlag(true)), true);
    assert.equal(webpHasAlpha(webpLossless(false)), false);
    assert.equal(webpHasAlpha(webpLossless(true)), true);
    assert.deepEqual(codes('assets/relics/lamp.webp', webpLossy()), ['NO_ALPHA']);
    assert.deepEqual(codes('assets/relics/lamp.webp', webpWithAlphaFlag(true)), []);
    assert.deepEqual(codes('assets/relics/lamp.webp', webpLossless(true)), []);
  });

  it('does not require transparency for photographic and background art', () => {
    assert.deepEqual(codes('assets/heroes/photo.png', makePng(2)), []);
    assert.deepEqual(codes('assets/heroes/photo.webp', webpLossy()), []);
    assert.deepEqual(codes('store-assets/google-play/graphic.png', makePng(2)), []);
  });
});

// ── Repo-wide ratchet ───────────────────────────────────────────────────────────
//
// Known offenders, tolerated only so existing debt cannot block work. This list
// is EMPTY and may only ever shrink: a new offender fails the test, and a listed
// file that has been fixed must be deleted from it. Never add a file to hide a
// problem; fix the artwork.
//
// History: it once listed eight assets/relics files (JPEGs named .png with a
// checkerboard "transparency" grid baked into the pixels) that broke Android
// build 46. They came from the web repo (public/relics, 2026-05-14) and were
// copied here in 8e21e69. They were replaced with real transparent cut-outs on
// 2026-10-08, so `npm run check:assets` (strict, run before every Android build
// and OTA publish) now passes.
const KNOWN_BROKEN = new Set<string>([]);

describe('repo image assets', () => {
  const { scanned, problems } = scanAssets(path.resolve(__dirname, '..'));

  it('scans a plausible number of images (guards against the scan silently finding none)', () => {
    assert.ok(scanned > 200, `expected 200+ images, scanned ${scanned}`);
  });

  it('has no image problems beyond the known-broken list', () => {
    const fresh = problems.filter((problem) => !KNOWN_BROKEN.has(problem.path));
    assert.deepEqual(
      fresh.map((problem) => `${problem.code} ${problem.path}: ${problem.message}`),
      [],
      'New image problems. Fix the artwork; do not add it to KNOWN_BROKEN.',
    );
  });

  it('lists only files that are still broken, so the list shrinks as art is fixed', () => {
    const stillBroken = new Set(problems.map((problem) => problem.path));
    const fixed = [...KNOWN_BROKEN].filter((file) => !stillBroken.has(file));
    assert.deepEqual(fixed, [], 'These are fixed now: delete them from KNOWN_BROKEN.');
  });
});
