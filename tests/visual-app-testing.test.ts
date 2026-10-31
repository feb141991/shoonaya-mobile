/**
 * visual-app-testing.test.ts
 *
 * Contract & automated test suite for Native Visual App Testing:
 * 1. Validates visual route catalog schema, categories, and deep link URL formats.
 * 2. Tests the PNG validator engine against valid and corrupted image buffers.
 * 3. Tests end-to-end visual capture & HTML inspection report generation on live simulator.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';

import {
  VISUAL_ROUTE_CATALOG,
  validatePngScreenshot,
  detectActiveDevice,
  runVisualAppTestSuite,
} from '../scripts/visual-app-testing';

describe('Visual App Testing Suite Contract', () => {
  it('enforces route catalog integrity, unique IDs, and deep link schemes', () => {
    assert.ok(VISUAL_ROUTE_CATALOG.length >= 10, 'Expected at least 10 canonical visual test routes');

    const seenIds = new Set<string>();
    for (const route of VISUAL_ROUTE_CATALOG) {
      assert.ok(route.id && route.id.length > 0, `Route missing ID`);
      assert.ok(!seenIds.has(route.id), `Duplicate route ID found: ${route.id}`);
      seenIds.add(route.id);

      assert.ok(route.title && route.title.length > 0, `Route ${route.id} missing title`);
      assert.ok(route.url.startsWith('shoonaya://'), `Route ${route.id} URL must start with shoonaya://`);
      assert.ok(['core', 'vrat', 'festival', 'reader', 'practice'].includes(route.category), `Invalid category on ${route.id}`);
      assert.ok((route.expectedMinBytes ?? 0) >= 20000, `Expected min bytes on ${route.id} should be >= 20000`);
    }

    // Must include Ekadashi verification routes
    const ramaRoute = VISUAL_ROUTE_CATALOG.find((r) => r.id === 'vrat-rama-ekadashi');
    assert.ok(ramaRoute, 'Expected vrat-rama-ekadashi route in visual catalog');
    assert.equal(ramaRoute.url, 'shoonaya://vrat/rama-ekadashi');

    const nirjalaRoute = VISUAL_ROUTE_CATALOG.find((r) => r.id === 'vrat-nirjala-ekadashi');
    assert.ok(nirjalaRoute, 'Expected vrat-nirjala-ekadashi route in visual catalog');
    assert.equal(nirjalaRoute.url, 'shoonaya://vrat/nirjala-ekadashi');
  });

  it('validates PNG screenshot parser against valid and corrupted buffers', () => {
    const tmpDir = path.resolve(process.cwd(), 'tmp', 'test-png-validator');
    fs.mkdirSync(tmpDir, { recursive: true });

    // 1. Non-existent file
    const nonExistent = validatePngScreenshot(path.join(tmpDir, 'missing.png'));
    assert.equal(nonExistent.valid, false);
    assert.ok(nonExistent.error?.includes('does not exist'));

    // 2. Corrupt/insufficient header file
    const corruptPath = path.join(tmpDir, 'corrupt.png');
    fs.writeFileSync(corruptPath, Buffer.from('NOT A REAL PNG FILE AT ALL'));
    const corruptResult = validatePngScreenshot(corruptPath, 10);
    assert.equal(corruptResult.valid, false);
    assert.ok(corruptResult.error?.includes('PNG magic bytes'));

    // 3. Undersized file (below threshold)
    const undersizedPath = path.join(tmpDir, 'undersized.png');
    // Valid header but only 30 bytes
    const miniHeader = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0, 0, 0, 13,
      0x49, 0x48, 0x44, 0x52,
      0, 0, 4, 0, // width = 1024
      0, 0, 8, 0, // height = 2048
      8, 6, 0, 0, 0,
    ]);
    fs.writeFileSync(undersizedPath, miniHeader);
    const undersizedResult = validatePngScreenshot(undersizedPath, 25000);
    assert.equal(undersizedResult.valid, false);
    assert.ok(undersizedResult.error?.includes('below threshold'));

    // 4. Valid PNG above threshold
    const validPaddedPath = path.join(tmpDir, 'valid.png');
    const validBuffer = Buffer.concat([miniHeader, Buffer.alloc(30000, 0)]);
    fs.writeFileSync(validPaddedPath, validBuffer);
    const validResult = validatePngScreenshot(validPaddedPath, 25000);
    assert.equal(validResult.valid, true);
    assert.equal(validResult.width, 1024);
    assert.equal(validResult.height, 2048);
    assert.ok(validResult.fileSizeBytes >= 30000);

    // Clean up
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('runs focused visual snapshot verification if simulator is booted', async () => {
    const activeDevice = detectActiveDevice();
    if (!activeDevice) {
      console.log('Skipping live snapshot capture: no booted simulator detected.');
      return;
    }

    const testOutDir = path.resolve(process.cwd(), 'tmp', 'visual-test-runner');
    fs.mkdirSync(testOutDir, { recursive: true });

    const report = await runVisualAppTestSuite({
      deviceUdid: activeDevice.id,
      routes: ['home', 'vrat-rama-ekadashi'],
      outDir: testOutDir,
      delayMs: 1200,
      silent: true,
    });

    assert.equal(report.total, 2);
    assert.equal(report.passed, 2, `Expected all 2 routes to pass visual checks, got failed: ${report.failed}`);
    assert.equal(report.failed, 0);

    // Verify snapshot artifacts
    for (const snap of report.snapshots) {
      assert.equal(snap.passed, true);
      assert.ok(fs.existsSync(snap.screenshotPath), `Missing screenshot: ${snap.screenshotPath}`);
      assert.ok(snap.dimensions.width >= 320);
      assert.ok(snap.dimensions.height >= 480);
      assert.ok(snap.fileSizeBytes > 30000);
    }

    // Verify report artifacts
    assert.ok(fs.existsSync(path.join(testOutDir, 'report.json')));
    assert.ok(fs.existsSync(path.join(testOutDir, 'index.html')));
    assert.ok(fs.existsSync(path.join(testOutDir, 'README.md')));

    // Clean up
    fs.rmSync(testOutDir, { recursive: true, force: true });
  });
});

