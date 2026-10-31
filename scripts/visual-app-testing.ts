/**
 * visual-app-testing.ts
 *
 * Automated Visual App Testing Suite for Shoonaya Native
 * Drives booted iOS Simulator (or attached Android device) across canonical routes,
 * validates layout render, captures high-resolution screenshots, checks artifact
 * integrity (magic bytes, dimensions, non-blank file size), and produces an
 * interactive HTML inspection gallery and machine-readable JSON report.
 *
 * Usage:
 *   npx tsx scripts/visual-app-testing.ts
 *   npx tsx scripts/visual-app-testing.ts --device 4BA6EE0B-6257-4991-94C0-EA8A1F10BDC0
 *   npx tsx scripts/visual-app-testing.ts --routes home,panchang,vrat-rama-ekadashi
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface VisualRouteTarget {
  id: string;
  title: string;
  category: 'core' | 'vrat' | 'festival' | 'reader' | 'practice';
  url: string;
  description: string;
  expectedMinBytes?: number;
}

export interface ScreenshotValidationResult {
  valid: boolean;
  width: number;
  height: number;
  fileSizeBytes: number;
  error?: string;
}

export interface VisualTestSnapshotResult {
  route: VisualRouteTarget;
  passed: boolean;
  screenshotPath: string;
  relativeScreenshotPath: string;
  fileSizeBytes: number;
  dimensions: { width: number; height: number };
  durationMs: number;
  error?: string;
}

export interface VisualTestSuiteReport {
  timestamp: string;
  platform: 'ios' | 'android' | 'simulated';
  deviceName: string;
  deviceId: string;
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  outDir: string;
  snapshots: VisualTestSnapshotResult[];
}

export const VISUAL_ROUTE_CATALOG: VisualRouteTarget[] = [
  {
    id: 'home',
    title: 'Home Hero Surface',
    category: 'core',
    url: 'shoonaya://home',
    description: 'Dynamic Shubh hero banner, Panchang snippet, Today’s Verse, upcoming festival card, and navigation bar',
    expectedMinBytes: 30000,
  },
  {
    id: 'panchang',
    title: 'Vedic Panchang Surface',
    category: 'core',
    url: 'shoonaya://panchang',
    description: 'Date slider, Tithi, Paksha, Nakshatra, Yoga, Karana, Vara weekday, and Ujjain reference timing calculation',
    expectedMinBytes: 40000,
  },
  {
    id: 'vrat-rama-ekadashi',
    title: 'Rama Ekadashi (Editorial Gating & Mark as Read)',
    category: 'vrat',
    url: 'shoonaya://vrat/rama-ekadashi',
    description: 'Candidate Ekadashi resolution with editorial review banner, canonical rules, and reading completion trigger',
    expectedMinBytes: 35000,
  },
  {
    id: 'vrat-nirjala-ekadashi',
    title: 'Nirjala Ekadashi (Canonical Guide)',
    category: 'vrat',
    url: 'shoonaya://vrat/nirjala-ekadashi',
    description: 'Fully approved canonical Ekadashi with waterless fast rules, parana windows, and Mark as Read action',
    expectedMinBytes: 35000,
  },
  {
    id: 'vrat-haribodhini-ekadashi',
    title: 'Haribodhini / Devutthana Ekadashi',
    category: 'vrat',
    url: 'shoonaya://vrat/haribodhini-ekadashi',
    description: 'Prabodhini Ekadashi canonical route mapping and editorial gating status',
    expectedMinBytes: 35000,
  },
  {
    id: 'vrat-ekadashi-general',
    title: 'Ekadashi General Observance Guide',
    category: 'vrat',
    url: 'shoonaya://vrat/ekadashi',
    description: 'Recurring Ekadashi rules, significance, and spiritual guidelines',
    expectedMinBytes: 30000,
  },
  {
    id: 'vrat-pradosh',
    title: 'Pradosh Vrat Observance',
    category: 'vrat',
    url: 'shoonaya://vrat/pradosh',
    description: 'Bimonthly Shiva Pradosham observance timings, twilight sandhya window, and vrat rituals',
    expectedMinBytes: 30000,
  },
  {
    id: 'vrat-sankashti-chaturthi',
    title: 'Sankashti Chaturthi Observance',
    category: 'vrat',
    url: 'shoonaya://vrat/sankashti-chaturthi',
    description: 'Ganesha Sankashti fast, moonrise (chandrodaya) timing calculation, and parana rules',
    expectedMinBytes: 30000,
  },
  {
    id: 'festival-diwali',
    title: 'Deepavali Mahotsav',
    category: 'festival',
    url: 'shoonaya://festival/diwali',
    description: 'Diwali multi-day festival series, Lakshmi Puja muhurta, and spiritual observance guidelines',
    expectedMinBytes: 35000,
  },
  {
    id: 'dharm-veer-krishna',
    title: 'Dharm Veer: Sri Krishna',
    category: 'reader',
    url: 'shoonaya://dharm-veer/sri-krishna',
    description: 'Chaptered hero reader, high-res traditional artwork, epoch badges, and typography controls',
    expectedMinBytes: 50000,
  },
  {
    id: 'bhakti-stotram-ganesha',
    title: 'Stotram: Ganesha Pancharatnam',
    category: 'reader',
    url: 'shoonaya://bhakti/stotram/ganesha-pancharatnam',
    description: 'Stotram recitation surface, bilingual verses, and recitation pacing controls',
    expectedMinBytes: 35000,
  },
  {
    id: 'panchatantra-crane',
    title: 'Panchatantra: The Crane & The Crab',
    category: 'reader',
    url: 'shoonaya://bhakti/katha/panchatantra-crane-and-crab',
    description: 'Illustrated moral storybook reader with traditional animal allegory artwork',
    expectedMinBytes: 40000,
  },
  {
    id: 'japa',
    title: 'Japa Mala Counter',
    category: 'practice',
    url: 'shoonaya://japa',
    description: 'Sacred Gayatri Mantra japa surface, bead animation, mala selection, and round target counters',
    expectedMinBytes: 40000,
  },
  {
    id: 'mandali',
    title: 'Mandali Community Satsang',
    category: 'practice',
    url: 'shoonaya://mandali',
    description: 'Spiritual community gatherings, sankalpa tracking, and devotional discussion groups',
    expectedMinBytes: 30000,
  },
  {
    id: 'my-progress',
    title: 'My Progress (Featherweight Celestial Sādhana Hub)',
    category: 'core',
    url: 'shoonaya://my-progress',
    description: 'Unboxed sacred lotus relic, razor-thin weekly discipline thread, slender needle chart, and astrolabe harmony dial',
    expectedMinBytes: 35000,
  },
];

/**
 * Validates a PNG file on disk by checking magic bytes, IHDR chunk dimensions, and minimum size.
 */
export function validatePngScreenshot(filePath: string, expectedMinBytes = 25000): ScreenshotValidationResult {
  if (!fs.existsSync(filePath)) {
    return { valid: false, width: 0, height: 0, fileSizeBytes: 0, error: 'File does not exist' };
  }

  const stat = fs.statSync(filePath);
  if (stat.size < expectedMinBytes) {
    return {
      valid: false,
      width: 0,
      height: 0,
      fileSizeBytes: stat.size,
      error: `File size ${stat.size}B is below threshold ${expectedMinBytes}B (possible blank/failed render)`,
    };
  }

  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.alloc(24);
  fs.readSync(fd, buffer, 0, 24, 0);
  fs.closeSync(fd);

  // PNG Magic Header: 89 50 4E 47 0D 0A 1A 0A
  const pngMagic = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (!buffer.subarray(0, 8).equals(pngMagic)) {
    return {
      valid: false,
      width: 0,
      height: 0,
      fileSizeBytes: stat.size,
      error: 'File does not contain valid PNG magic bytes',
    };
  }

  // IHDR chunk starts at byte 12 (0x49 0x48 0x44 0x52)
  const ihdr = buffer.subarray(12, 16).toString('ascii');
  if (ihdr !== 'IHDR') {
    return {
      valid: false,
      width: 0,
      height: 0,
      fileSizeBytes: stat.size,
      error: 'Missing or corrupt IHDR chunk in PNG header',
    };
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  if (width < 320 || height < 480) {
    return {
      valid: false,
      width,
      height,
      fileSizeBytes: stat.size,
      error: `Dimensions ${width}x${height} too small for mobile screen`,
    };
  }

  return { valid: true, width, height, fileSizeBytes: stat.size };
}

/**
 * Discovers a connected device or booted simulator.
 */
export function detectActiveDevice(preferUdid?: string): { platform: 'ios' | 'android'; id: string; name: string } | null {
  if (preferUdid) {
    return { platform: 'ios', id: preferUdid, name: `Simulator (${preferUdid})` };
  }

  // 1. Check iOS Simulator via xcrun simctl
  try {
    const simOutput = execSync('xcrun simctl list devices', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const match = simOutput.match(/([^\n(]+)\s+\(([0-9A-F-]{36})\)\s+\(Booted\)/i);
    if (match) {
      return { platform: 'ios', id: match[2].trim(), name: match[1].trim() };
    }
  } catch {
    // xcrun not available or failed
  }

  // 2. Check Android via adb
  try {
    const adbOutput = execSync('adb devices', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lines = adbOutput.split('\n').filter((l) => l.includes('\tdevice'));
    if (lines.length > 0) {
      const id = lines[0].split('\t')[0].trim();
      return { platform: 'android', id, name: `Android Device (${id})` };
    }
  } catch {
    // adb not available or failed
  }

  return null;
}

/**
 * Dispatches deep link and captures screenshot on target device.
 */
export function captureRouteSnapshot(
  device: { platform: 'ios' | 'android'; id: string },
  routeUrl: string,
  outPngPath: string,
  waitDelayMs = 1800
): void {
  if (device.platform === 'ios') {
    // Open deep link via simctl
    execSync(`xcrun simctl openurl "${device.id}" "${routeUrl}"`, { stdio: 'ignore' });
    // Sleep for UI settlement
    execSync(`sleep ${Math.max(0.5, waitDelayMs / 1000)}`);
    // Capture screenshot
    execSync(`xcrun simctl io "${device.id}" screenshot "${outPngPath}"`, { stdio: 'ignore' });
  } else {
    // Open deep link via adb
    execSync(`adb -s "${device.id}" shell am start -a android.intent.action.VIEW -d "${routeUrl}"`, { stdio: 'ignore' });
    execSync(`sleep ${Math.max(0.5, waitDelayMs / 1000)}`);
    execSync(`adb -s "${device.id}" exec-out screencap -p > "${outPngPath}"`);
  }
}

/**
 * Generates an interactive HTML visual test report.
 */
export function generateHtmlVisualReport(report: VisualTestSuiteReport): string {
  const cardsHtml = report.snapshots
    .map((s, idx) => {
      const statusClass = s.passed ? 'badge-pass' : 'badge-fail';
      const statusText = s.passed ? 'PASSED' : 'FAILED';
      const sizeKb = (s.fileSizeBytes / 1024).toFixed(1);
      const imgPath = s.relativeScreenshotPath;

      return `
      <div class="card" data-category="${s.route.category}" data-status="${s.passed ? 'pass' : 'fail'}">
        <div class="card-header">
          <div class="card-title-row">
            <span class="card-num">#${idx + 1}</span>
            <span class="card-title">${escapeHtml(s.route.title)}</span>
          </div>
          <span class="badge ${statusClass}">${statusText}</span>
        </div>
        <div class="card-url"><code>${escapeHtml(s.route.url)}</code></div>
        <p class="card-desc">${escapeHtml(s.route.description)}</p>
        <div class="screenshot-container">
          <img src="${escapeHtml(imgPath)}" alt="${escapeHtml(s.route.title)}" loading="lazy" onclick="openModal('${escapeHtml(imgPath)}', '${escapeHtml(s.route.title)}')"/>
        </div>
        <div class="card-meta">
          <span class="meta-item"><strong>Res:</strong> ${s.dimensions.width}×${s.dimensions.height}</span>
          <span class="meta-item"><strong>Size:</strong> ${sizeKb} KB</span>
          <span class="meta-item"><strong>Time:</strong> ${s.durationMs}ms</span>
        </div>
        ${s.error ? `<div class="card-error"><strong>Error:</strong> ${escapeHtml(s.error)}</div>` : ''}
      </div>
    `;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Shoonaya Native — Visual App Testing Report</title>
  <style>
    :root {
      --bg: #090c14;
      --card-bg: #111625;
      --card-border: #1e263d;
      --gold: #dfb260;
      --gold-dark: #b88d3b;
      --text: #e6edf3;
      --text-muted: #8b949e;
      --pass: #2ea043;
      --pass-bg: rgba(46, 160, 67, 0.15);
      --fail: #f85149;
      --fail-bg: rgba(248, 81, 73, 0.15);
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      padding: 32px 24px;
      line-height: 1.5;
    }
    .header {
      max-width: 1400px;
      margin: 0 auto 32px auto;
      border-bottom: 1px solid var(--card-border);
      padding-bottom: 24px;
    }
    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: var(--gold);
      letter-spacing: -0.5px;
    }
    .device-pill {
      background: var(--card-bg);
      border: 1px solid var(--gold-dark);
      padding: 6px 14px;
      border-radius: 999px;
      font-size: 13px;
      color: var(--gold);
      font-weight: 500;
    }
    .stats-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-top: 16px;
    }
    .stat-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
    }
    .stat-label { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.5px; }
    .stat-value { font-size: 24px; font-weight: 700; margin-top: 4px; }
    .stat-value.pass { color: var(--pass); }
    .stat-value.fail { color: var(--fail); }
    .stat-value.gold { color: var(--gold); }

    .gallery {
      max-width: 1400px;
      margin: 0 auto;
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 24px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 20px;
      display: flex;
      flex-direction: column;
      transition: transform 0.2s, border-color 0.2s;
    }
    .card:hover {
      transform: translateY(-2px);
      border-color: var(--gold-dark);
    }
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .card-title-row {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .card-num {
      color: var(--gold);
      font-weight: 700;
      font-size: 14px;
    }
    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: #fff;
    }
    .badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }
    .badge-pass { background: var(--pass-bg); color: var(--pass); border: 1px solid var(--pass); }
    .badge-fail { background: var(--fail-bg); color: var(--fail); border: 1px solid var(--fail); }
    .card-url {
      margin-bottom: 8px;
    }
    code {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      font-size: 12px;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
      color: #79c0ff;
    }
    .card-desc {
      font-size: 13px;
      color: var(--text-muted);
      margin-bottom: 16px;
      flex-grow: 1;
    }
    .screenshot-container {
      background: #000;
      border: 1px solid var(--card-border);
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      justify-content: center;
      align-items: center;
      cursor: zoom-in;
      margin-bottom: 16px;
      aspect-ratio: 9 / 19.5;
    }
    .screenshot-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
      transition: opacity 0.2s;
    }
    .screenshot-container:hover img { opacity: 0.9; }
    .card-meta {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--text-muted);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      padding-top: 12px;
    }
    .card-error {
      margin-top: 12px;
      padding: 8px 12px;
      border-radius: 8px;
      background: var(--fail-bg);
      border: 1px solid var(--fail);
      color: var(--fail);
      font-size: 12px;
    }

    /* Modal */
    .modal {
      display: none;
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(0,0,0,0.85);
      backdrop-filter: blur(8px);
      z-index: 1000;
      justify-content: center;
      align-items: center;
      padding: 24px;
    }
    .modal.open { display: flex; }
    .modal img {
      max-width: 90vw;
      max-height: 90vh;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0,0,0,0.8);
      border: 1px solid var(--gold-dark);
    }
    .modal-close {
      position: absolute;
      top: 24px; right: 24px;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: #fff;
      font-size: 20px;
      width: 44px; height: 44px;
      border-radius: 50%;
      cursor: pointer;
      display: flex; justify-content: center; align-items: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-top">
      <div>
        <h1>Shoonaya Native Visual Test Suite</h1>
        <p style="color: var(--text-muted); margin-top: 4px;">Captured ${escapeHtml(report.timestamp)}</p>
      </div>
      <div class="device-pill">📱 ${escapeHtml(report.deviceName)} (${escapeHtml(report.platform.toUpperCase())})</div>
    </div>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-label">Total Routes</div>
        <div class="stat-value gold">${report.total}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Passed</div>
        <div class="stat-value pass">${report.passed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Failed</div>
        <div class="stat-value ${report.failed > 0 ? 'fail' : ''}">${report.failed}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Total Duration</div>
        <div class="stat-value">${(report.durationMs / 1000).toFixed(1)}s</div>
      </div>
    </div>
  </div>

  <div class="gallery">
    ${cardsHtml}
  </div>

  <div id="modal" class="modal" onclick="closeModal()">
    <button class="modal-close" onclick="closeModal()">&times;</button>
    <img id="modalImg" src="" alt="Zoom preview"/>
  </div>

  <script>
    function openModal(src, title) {
      const modal = document.getElementById('modal');
      const modalImg = document.getElementById('modalImg');
      modalImg.src = src;
      modal.classList.add('open');
    }
    function closeModal() {
      document.getElementById('modal').classList.remove('open');
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export interface RunOptions {
  deviceUdid?: string;
  routes?: string[];
  outDir?: string;
  delayMs?: number;
  silent?: boolean;
}

/**
 * Main execution harness for Visual App Testing Suite.
 */
export async function runVisualAppTestSuite(options: RunOptions = {}): Promise<VisualTestSuiteReport> {
  const startTime = Date.now();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const baseOutDir = options.outDir || path.resolve(process.cwd(), 'smoke-reports', `visual-testing-${timestamp}`);
  fs.mkdirSync(baseOutDir, { recursive: true });

  const activeDevice = detectActiveDevice(options.deviceUdid);
  if (!activeDevice) {
    throw new Error('No booted iOS simulator or Android device detected. Please boot a device/simulator before running visual tests.');
  }

  const selectedRouteIds = options.routes && options.routes.length > 0 ? new Set(options.routes) : null;
  const targets = selectedRouteIds
    ? VISUAL_ROUTE_CATALOG.filter((r) => selectedRouteIds.has(r.id))
    : VISUAL_ROUTE_CATALOG;

  if (targets.length === 0) {
    throw new Error('No matching routes selected for visual testing.');
  }

  if (!options.silent) {
    console.log(`\n========================================================`);
    console.log(`🚀 Shoonaya Native Visual App Testing Suite`);
    console.log(`📱 Device: ${activeDevice.name} [${activeDevice.id}]`);
    console.log(`🎯 Targets: ${targets.length} routes`);
    console.log(`📁 Artifacts: ${baseOutDir}`);
    console.log(`========================================================\n`);
  }

  const snapshots: VisualTestSnapshotResult[] = [];
  let passedCount = 0;
  let failedCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const target = targets[i];
    const routeStartTime = Date.now();
    const fileName = `${String(i + 1).padStart(2, '0')}-${target.id}.png`;
    const fullPngPath = path.join(baseOutDir, fileName);

    if (!options.silent) {
      process.stdout.write(`[${i + 1}/${targets.length}] Testing ${target.title.padEnd(45)} ... `);
    }

    let errorMsg: string | undefined;
    let valResult: ScreenshotValidationResult = { valid: false, width: 0, height: 0, fileSizeBytes: 0 };

    try {
      captureRouteSnapshot(activeDevice, target.url, fullPngPath, options.delayMs || 1800);
      valResult = validatePngScreenshot(fullPngPath, target.expectedMinBytes || 25000);
      if (!valResult.valid) {
        errorMsg = valResult.error;
      }
    } catch (err: any) {
      errorMsg = err.message || String(err);
    }

    const durationMs = Date.now() - routeStartTime;
    const passed = valResult.valid && !errorMsg;

    if (passed) {
      passedCount++;
      if (!options.silent) {
        console.log(`\x1b[32mPASS\x1b[0m (${(valResult.fileSizeBytes / 1024).toFixed(0)}KB, ${valResult.width}x${valResult.height}, ${durationMs}ms)`);
      }
    } else {
      failedCount++;
      if (!options.silent) {
        console.log(`\x1b[31mFAIL\x1b[0m: ${errorMsg}`);
      }
    }

    snapshots.push({
      route: target,
      passed,
      screenshotPath: fullPngPath,
      relativeScreenshotPath: fileName,
      fileSizeBytes: valResult.fileSizeBytes,
      dimensions: { width: valResult.width, height: valResult.height },
      durationMs,
      error: errorMsg,
    });
  }

  const totalDurationMs = Date.now() - startTime;
  const report: VisualTestSuiteReport = {
    timestamp: new Date().toISOString(),
    platform: activeDevice.platform,
    deviceName: activeDevice.name,
    deviceId: activeDevice.id,
    total: targets.length,
    passed: passedCount,
    failed: failedCount,
    durationMs: totalDurationMs,
    outDir: baseOutDir,
    snapshots,
  };

  // Write JSON report
  fs.writeFileSync(path.join(baseOutDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

  // Write HTML report
  const htmlContent = generateHtmlVisualReport(report);
  fs.writeFileSync(path.join(baseOutDir, 'index.html'), htmlContent, 'utf8');

  // Also maintain a pointer or copy in canonical smoke-reports/visual-snapshots/
  const canonicalDir = path.resolve(process.cwd(), 'smoke-reports', 'visual-snapshots');
  fs.mkdirSync(canonicalDir, { recursive: true });
  fs.writeFileSync(path.join(canonicalDir, 'index.html'), htmlContent, 'utf8');
  fs.writeFileSync(path.join(canonicalDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
  for (const s of snapshots) {
    if (fs.existsSync(s.screenshotPath)) {
      fs.copyFileSync(s.screenshotPath, path.join(canonicalDir, s.relativeScreenshotPath));
    }
  }

  // Write Markdown summary
  const markdown = `# Shoonaya Native Visual Test Suite Report

- **Captured**: ${report.timestamp}
- **Device**: ${report.deviceName} (\`${report.deviceId}\`)
- **Total Tested**: ${report.total}
- **Passed**: ${report.passed}
- **Failed**: ${report.failed}
- **Duration**: ${(report.durationMs / 1000).toFixed(1)}s
- **Interactive Gallery**: [\`index.html\`](./index.html)

## Test Results Matrix

| # | Route Target | Status | Dimensions | Size | URL |
|---|--------------|--------|------------|------|-----|
${report.snapshots
  .map(
    (s, i) =>
      `| ${i + 1} | ${s.route.title} | ${s.passed ? '✅ PASS' : '❌ FAIL'} | ${s.dimensions.width}×${s.dimensions.height} | ${(s.fileSizeBytes / 1024).toFixed(1)} KB | \`${s.route.url}\` |`
  )
  .join('\n')}
`;
  fs.writeFileSync(path.join(baseOutDir, 'README.md'), markdown, 'utf8');
  fs.writeFileSync(path.join(canonicalDir, 'README.md'), markdown, 'utf8');

  if (!options.silent) {
    console.log(`\n========================================================`);
    console.log(`🏁 Visual Testing Complete: ${passedCount}/${targets.length} passed (${failedCount} failed)`);
    console.log(`📊 Interactive HTML Report: ${path.join(baseOutDir, 'index.html')}`);
    console.log(`========================================================\n`);
  }

  return report;
}

// Direct CLI invocation
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const deviceIdx = args.indexOf('--device');
  const deviceUdid = deviceIdx !== -1 ? args[deviceIdx + 1] : undefined;
  const routesIdx = args.indexOf('--routes');
  const routes = routesIdx !== -1 ? args[routesIdx + 1].split(',').map((r) => r.trim()) : undefined;

  runVisualAppTestSuite({ deviceUdid, routes })
    .then((report) => {
      if (report.failed > 0) {
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error('\x1b[31mVisual test runner encountered a fatal error:\x1b[0m', err);
      process.exit(1);
    });
}

