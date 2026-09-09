import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getLineageById, getLineageList } from '../lib/lineage-data';
import { computeLineageLayout } from '../lib/lineageLayout';

describe('Lineage Data & Layout Engine', () => {
  it('loads all sacred lineages with non-empty nodes and edges', () => {
    const list = getLineageList();
    assert.ok(list.length >= 3, 'Should have at least 3 initial lineages');

    list.forEach((lineage) => {
      assert.ok(lineage.id, 'Lineage must have an ID');
      assert.ok(lineage.title, 'Lineage must have a title');
      assert.ok(lineage.nodes.length > 0, 'Lineage must have nodes');
      assert.ok(lineage.edges.length > 0, 'Lineage must have edges');
    });
  });

  it('retrieves Advaita Shankara lineage by ID and computes valid layout', () => {
    const shankara = getLineageById('advaita-shankara');
    assert.ok(shankara, 'Advaita Shankara lineage must exist');
    if (!shankara) return;

    const layout = computeLineageLayout(shankara);
    assert.strictEqual(layout.nodes.length, shankara.nodes.length);
    assert.strictEqual(layout.edges.length, shankara.edges.length);
    assert.ok(layout.canvasWidth > 300, 'Canvas width must be positive and wide enough');
    assert.ok(layout.canvasHeight > 200, 'Canvas height must be positive and high enough');

    // Root node should be at level 0
    const rootLayout = layout.nodes.find((n) => n.data.id === 'adi-shankara');
    assert.ok(rootLayout, 'Root node must exist in layout');
    assert.strictEqual(rootLayout?.level, 0);

    // Child mathas should be at level 1
    const sringeri = layout.nodes.find((n) => n.data.id === 'sringeri-peetham');
    assert.ok(sringeri, 'Sringeri node must exist in layout');
    assert.strictEqual(sringeri?.level, 1);

    // Ensure all edges have valid Bezier path commands
    layout.edges.forEach((edge) => {
      assert.match(edge.pathD, /^M \d+(\.\d+)? \d+(\.\d+)? C/);
    });
  });

  it('handles linear Sikh Gurus lineage properly with descending levels', () => {
    const sikh = getLineageById('sikh-gurus');
    assert.ok(sikh, 'Sikh Gurus lineage must exist');
    if (!sikh) return;

    const layout = computeLineageLayout(sikh);
    assert.strictEqual(layout.nodes.length, sikh.nodes.length);

    // Nanak (level 0) -> Angad (level 1) -> ...
    const nanak = layout.nodes.find((n) => n.data.id === 'guru-nanak');
    const angad = layout.nodes.find((n) => n.data.id === 'guru-angad');
    assert.strictEqual(nanak?.level, 0);
    assert.strictEqual(angad?.level, 1);
    assert.ok((angad?.y ?? 0) > (nanak?.y ?? 0), 'Child level y-coordinate must be below parent');
  });

  it('guarantees back navigation returns to Pathshala rather than Home', () => {
    const fs = require('node:fs');
    const backButtonSrc = fs.readFileSync(new URL('../components/ui/BackButton.tsx', import.meta.url), 'utf8');
    const bottomNavSrc = fs.readFileSync(new URL('../components/ui/CollapsibleBottomNav.tsx', import.meta.url), 'utf8');
    const lineageDetailSrc = fs.readFileSync(new URL('../app/lineage/[id].tsx', import.meta.url), 'utf8');

    assert.match(
      backButtonSrc,
      /pathname\.startsWith\('\/lineage'\)\) return '\/\(tabs\)\/pathshala'/,
      'BackButton inferParentFallback must return /(tabs)/pathshala for lineage'
    );
    assert.match(
      bottomNavSrc,
      /matchesAny\(p, \['\/pathshala', '\/lineage'\]\)/,
      'CollapsibleBottomNav must associate lineage with pathshala tab'
    );
    assert.match(
      lineageDetailSrc,
      /<BackButton fallbackHref="\/\(tabs\)\/pathshala" handleHardwareBack \/>/,
      'Lineage detail screen must pass explicit fallbackHref and handleHardwareBack'
    );
  });
});
