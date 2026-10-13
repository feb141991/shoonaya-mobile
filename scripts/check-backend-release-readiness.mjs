#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const nativeRepo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siblingBackend = resolve(nativeRepo, '../Sanatan Sangam/Shoonaya');
const backendRepo = process.env.SHOONAYA_BACKEND_REPO || (existsSync(resolve(siblingBackend, 'supabase/config.toml')) ? siblingBackend : null);
if (!backendRepo) {
  console.error('Set SHOONAYA_BACKEND_REPO to the canonical backend checkout before a store build or OTA release.');
  process.exit(2);
}
const cwd = resolve(backendRepo);

const migrationChanges = spawnSync('git', ['status', '--porcelain', '--', 'supabase/migrations'], { cwd, encoding: 'utf8' });
if (migrationChanges.error || migrationChanges.status !== 0) {
  console.error('Could not inspect the backend migration working tree.');
  process.exit(migrationChanges.status || 1);
}
if (migrationChanges.stdout.trim()) {
  console.error('Backend migrations must be committed before a store build or OTA release:');
  console.error(migrationChanges.stdout.trim());
  process.exit(1);
}

const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd, encoding: 'utf8' });
if (revision.error || revision.status !== 0) {
  console.error('Could not identify the backend release revision.');
  process.exit(revision.status || 1);
}
const verification = spawnSync('npm', ['run', 'verify:migrations:linked'], { cwd, stdio: 'inherit' });
if (verification.error || verification.status !== 0) process.exit(verification.status || 1);
console.log(`Backend migration state verified at ${revision.stdout.trim()}.`);
