import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('high-traffic screen performance contracts', () => {
  it('Pathshala uses the lightweight context endpoint without a remote auth or Home-summary waterfall', () => {
    const pathshala = source('app/(tabs)/pathshala.tsx');
    assert.doesNotMatch(pathshala, /auth\.getUser\(/);
    assert.doesNotMatch(pathshala, /api\/native\/home-summary/);
    assert.doesNotMatch(pathshala, /api\/pathshala\/progress/);
    assert.match(pathshala, /Promise\.all\(\[\s*apiFetch\('\/api\/pathshala\/paths'\),\s*apiFetch\('\/api\/pathshala\/context'/s);
    assert.match(pathshala, /if \(appIdentity\.kind === 'loading'\) return undefined;/);
  });

  it('Dharm Veer reads shared app identity and loads profile plus public roster in parallel', () => {
    const dharmVeer = source('app/dharm-veer.tsx');
    assert.doesNotMatch(dharmVeer, /auth\.getUser\(/);
    assert.match(dharmVeer, /const \[profileResult, rosterResponse\] = await Promise\.all/);
  });

  it('Vrat waits for profile resolution before making the canonical upcoming request', () => {
    const vrat = source('app/vrat.tsx');
    const section = vrat.slice(vrat.indexOf('// ── Load Canonical Upcoming'));
    const upcomingEffectStart = section.indexOf("if (loading) return;");
    const request = section.indexOf("apiFetch(`/api/calendar/upcoming?");
    assert.ok(upcomingEffectStart >= 0 && request > upcomingEffectStart);
    assert.doesNotMatch(
      vrat.slice(vrat.indexOf('// ── Load User Profile'), vrat.indexOf('// ── Progressive Profiling')),
      /if \(loading\) return;/,
    );
  });

  it('route telemetry covers Pathshala, Japa, Vrat, and Dharm Veer', () => {
    const telemetry = source('lib/telemetry.ts');
    for (const route of ['pathshala', 'japa', 'vrat', 'dharm_veer']) {
      assert.match(telemetry, new RegExp(`'${route}'`));
    }
    assert.match(source('app/(tabs)/japa.tsx'), /recordRouteOpen\([^;]*'japa'/s);
    assert.match(source('app/vrat.tsx'), /recordRouteOpen\([^;]*'vrat'/s);
    assert.match(source('app/dharm-veer.tsx'), /recordRouteOpen\([^;]*'dharm_veer'/s);
  });
});
