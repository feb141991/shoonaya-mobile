import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { getYatraById, getYatraList } from '../lib/yatra-data';
import { computeYatraLayout } from '../lib/yatraLayout';

describe('Sacred Yatra Data & Layout Engine', () => {
  it('loads all sacred pilgrimage circuits with non-empty temples and edges', () => {
    const list = getYatraList();
    assert.ok(list.length >= 3, 'Should have at least 3 yatra circuits');

    list.forEach((yatra) => {
      assert.ok(yatra.id, 'Yatra must have an ID');
      assert.ok(yatra.title, 'Yatra must have a title');
      assert.ok(yatra.sanskritTitle, 'Yatra must have a Sanskrit title');
      assert.ok(yatra.temples.length > 0, 'Yatra must have temple sanctum nodes');
      assert.ok(yatra.edges.length > 0, 'Yatra must have pathway edges');

      // Verify each temple node has authentic spiritual data
      yatra.temples.forEach((temple) => {
        assert.ok(temple.id, 'Temple must have an ID');
        assert.ok(temple.name, 'Temple must have a name');
        assert.ok(temple.sanskritName, 'Temple must have a Sanskrit name');
        assert.ok(temple.deity, 'Temple must have a presiding deity');
        assert.ok(temple.sthalaPurana, 'Temple must have a Sthala Purana');
        assert.ok(temple.significance, 'Temple must have spiritual significance');
        assert.ok(temple.offerings.length > 0, 'Temple must have traditional offerings');
        assert.ok(typeof temple.latitude === 'number', 'Temple must have latitude');
        assert.ok(typeof temple.longitude === 'number', 'Temple must have longitude');
      });
    });
  });

  it('retrieves 12 Jyotirlingas circuit by ID and computes valid layout', () => {
    const jyotirlingas = getYatraById('12-jyotirlingas');
    assert.ok(jyotirlingas, '12 Jyotirlingas circuit must exist');
    if (!jyotirlingas) return;

    const layout = computeYatraLayout(jyotirlingas);
    assert.strictEqual(layout.nodes.length, jyotirlingas.temples.length);
    assert.strictEqual(layout.edges.length, jyotirlingas.edges.length);
    assert.ok(layout.canvasWidth >= 360, 'Canvas width must be at least 360');
    assert.ok(layout.canvasHeight > 200, 'Canvas height must be positive and high enough');

    // Root node (Somnath) should be at level 0
    const rootNode = layout.nodes.find((n) => n.data.id === 'somnath');
    assert.ok(rootNode, 'Somnath root node must exist in layout');
    assert.strictEqual(rootNode?.level, 0, 'Somnath should be at level 0');

    // Ensure all edges have valid Bezier path commands
    layout.edges.forEach((edge) => {
      assert.match(edge.pathD, /^M \d+(\.\d+)? \d+(\.\d+)? C/);
    });
  });

  it('computes valid layout for Char Dham and Sikh Panj Takht circuits', () => {
    const charDham = getYatraById('char-dham');
    assert.ok(charDham, 'Char Dham circuit must exist');
    if (charDham) {
      const layout = computeYatraLayout(charDham);
      assert.strictEqual(layout.nodes.length, 4);
      assert.strictEqual(layout.edges.length, 4);
      const badrinath = layout.nodes.find((n) => n.data.id === 'badrinath');
      assert.strictEqual(badrinath?.level, 0, 'Badrinath should be at level 0');
    }

    const panjTakht = getYatraById('sikh-panj-takht');
    assert.ok(panjTakht, 'Sikh Panj Takht circuit must exist');
    if (panjTakht) {
      const layout = computeYatraLayout(panjTakht);
      assert.strictEqual(layout.nodes.length, 4);
      assert.strictEqual(layout.edges.length, 3);
      const akalTakht = layout.nodes.find((n) => n.data.id === 'akal-takht');
      assert.strictEqual(akalTakht?.level, 0, 'Sri Akal Takht Sahib should be at level 0');
    }
  });

  it('guarantees back navigation returns to Tirtha rather than Home', () => {
    const backButtonSrc = readFileSync(new URL('../components/ui/BackButton.tsx', import.meta.url), 'utf8');
    const yatraDetailSrc = readFileSync(new URL('../app/yatra/[id].tsx', import.meta.url), 'utf8');
    const routesSrc = readFileSync(new URL('../lib/routes.ts', import.meta.url), 'utf8');

    assert.match(
      backButtonSrc,
      /pathname\.startsWith\('\/yatra'\)\) return '\/\(tabs\)\/tirtha'/,
      'BackButton inferParentFallback must return /(tabs)/tirtha for /yatra'
    );
    assert.match(
      routesSrc,
      /pathname\.startsWith\('\/yatra'\)\) return '\/\(tabs\)\/tirtha'/,
      'routes.ts resolveNativeRoute must return /(tabs)/tirtha for /yatra'
    );
    assert.match(
      yatraDetailSrc,
      /<BackButton fallbackHref="\/\(tabs\)\/tirtha" handleHardwareBack \/>/,
      'Yatra detail screen must pass explicit fallbackHref="/(tabs)/tirtha" and handleHardwareBack'
    );
  });
});
