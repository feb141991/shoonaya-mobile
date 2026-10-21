/**
 * Renders film.html frame by frame with headless Chrome and encodes it with ffmpeg.
 *
 *   NODE_PATH=<folder with puppeteer-core in node_modules> node render.cjs --cut 45 --out silent-45.mp4
 *   node render.cjs --cut 45 --stills 0.5,2.5,5,9,15,22,28,36,40,44 --out-dir ./stills     (quick look, no video)
 *
 * puppeteer-core is not a dependency of the app; install it anywhere and point NODE_PATH at it.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('puppeteer-core');

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf('--' + name); return i >= 0 ? args[i + 1] : fallback; };
const CUT = opt('cut', '45');
const FPS = Number(opt('fps', '30'));
const OUT = opt('out', `silent-${CUT}.mp4`);
const STILLS = opt('stills', null);
const OUT_DIR = opt('out-dir', path.join(__dirname, 'stills'));
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
    args: ['--no-sandbox', '--hide-scrollbars', '--allow-file-access-from-files', '--font-render-hinting=none', '--force-color-profile=srgb'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1080, height: 1920, deviceScaleFactor: 1 });
  page.on('console', (m) => { if (m.type() === 'error') console.error('[page]', m.text()); });
  page.on('pageerror', (e) => console.error('[pageerror]', e.message));
  await page.goto('file://' + path.join(__dirname, 'film.html') + `?cut=${CUT}`);
  await page.waitForFunction('window.__ready === true', { timeout: 60000 });
  const total = await page.evaluate('window.__total');
  const timeline = await page.evaluate('SCENES.map((s) => ({ id: s.id, t0: s.t0, t1: s.t1 }))');
  fs.writeFileSync(path.join(__dirname, `timeline-${CUT}.json`), JSON.stringify({ cut: Number(CUT), total, scenes: timeline }, null, 2));
  console.log(`film ready: ${CUT}s cut, ${total.toFixed(2)} s`);

  if (STILLS) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    for (const raw of STILLS.split(',')) {
      const t = Number(raw);
      await page.evaluate((x) => window.renderFrame(x), t);
      const file = path.join(OUT_DIR, `still-${CUT}-${String(t).replace('.', '_')}.png`);
      await page.screenshot({ path: file, type: 'png' });
      console.log('wrote', file);
    }
    await browser.close();
    process.exit(0);
  }

  const frames = Math.round(total * FPS);
  const ff = spawn('ffmpeg', [
    '-y', '-v', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '4.2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
    '-movflags', '+faststart', OUT,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((resolve, reject) => { ff.on('close', (c) => (c === 0 ? resolve() : reject(new Error('ffmpeg exited ' + c)))); });

  const started = Date.now();
  for (let i = 0; i < frames; i++) {
    await page.evaluate((x) => window.renderFrame(x), i / FPS);
    const buf = await page.screenshot({ type: 'png', optimizeForSpeed: true });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (i % 90 === 0) console.log(`frame ${i}/${frames}  ${(((Date.now() - started) / 1000) | 0)}s`);
  }
  ff.stdin.end();
  await done;
  await browser.close();
  console.log('wrote', OUT, `${frames} frames`);
  process.exit(0); // headless Chrome can keep the process alive after close()
})().catch((e) => { console.error(e); process.exit(1); });
