import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

// Phase 4 (docs/READER_EXPERIENCE_GRAND_PLAN.md): background playback is a
// native capability (app.json) but opt-in per playback, used by reader
// listening only. Source-level checks: the audio module cannot run under node.
const root = path.join(__dirname, '..');
const read = (file: string) => fs.readFileSync(path.join(root, file), 'utf8');

test('the native config enables background audio playback', () => {
  const plugins = JSON.parse(read('app.json')).expo.plugins as unknown[];
  const audio = plugins.find((p) => Array.isArray(p) && p[0] === 'expo-audio') as [string, Record<string, unknown>];
  assert.equal(audio[1].enableBackgroundPlayback, true);
  assert.equal(audio[1].microphonePermission, false, 'no microphone permission added');
});

test('the player is foreground-only unless a playback asks for background', () => {
  const player = read('hooks/useAudioPlayer.ts');
  assert.match(player, /await configureAudioMode\(Boolean\(options\?\.background\)\);/);
  assert.match(player, /shouldPlayInBackground: background,/);
  assert.match(player, /clearLockScreenControls\(\)/, 'lock-screen controls are cleared when playback ends or stops');
  assert.match(player, /return false;/, 'a focus-invalidated request reports that playback never started');
  assert.match(player, /return true;/, 'a started request reports success');
});

test('only reader listening requests background playback', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(entry.name)) files.push(rel);
    }
  };
  for (const dir of ['app', 'components', 'hooks', 'lib']) walk(dir);
  // Playback requests carry lock-screen details next to `background: true`
  // (app/(tabs)/japa.tsx has an unrelated `loadContext({ background: true })` data refresh).
  const requesting = files.filter((file) => /background: true,[\s\S]{0,120}lock[sS]creen/.test(read(file))).sort();
  assert.deepEqual(requesting, ['app/bhakti/katha/[id].tsx', 'app/bhakti/stotram/[id].tsx']);
});

test('the sleep timer stops listening through the same control the user taps', () => {
  const shell = read('components/reader/ReaderShell.tsx');
  assert.match(shell, /if \(speakingRef\.current\) onTTSRef\.current\?\.\(\);/);
  assert.match(shell, /sleep \* 60 \* 1000/);
  assert.doesNotMatch(shell, /copy\.sleepMinutes\(60\)/, 'approved timer choices are 15, 30, and end-of-recitation');
});

test('focus-invalidated playback never publishes a false playing state', () => {
  const controls = read('hooks/useReaderControls.ts');
  const stotram = read('app/bhakti/stotram/[id].tsx');
  assert.match(controls, /const started = await loadAndPlay\([\s\S]*if \(started && requestId === ttsRequestIdRef\.current/);
  assert.match(stotram, /const started = await audio\.loadAndPlay\([\s\S]*setPlaying\(started\);/);
});
