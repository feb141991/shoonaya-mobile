import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Pins notification settings toggles in app/settings/detail-screen.tsx.
 * Ensures Kul & lineage activity (wants_family_notifications) is fully enabled
 * and bound to authenticated accounts, rather than locked under coming-soon.
 */
const raw = readFileSync(join(__dirname, '..', 'app', 'settings', 'detail-screen.tsx'), 'utf8');
const source = raw.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '');

describe('notification settings toggles', () => {
  it('enables Family (Kul) notifications toggle without coming-soon disabled lock', () => {
    assert.match(
      source,
      /key:\s*'wants_family_notifications'[\s\S]*?label:\s*'Family'[\s\S]*?subtitle:\s*'Kul & lineage activity'[\s\S]*?requiresAccount:\s*true/,
      'expected wants_family_notifications toggle to be active with requiresAccount: true'
    );
  });
});
