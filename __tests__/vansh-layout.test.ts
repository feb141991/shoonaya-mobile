import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeVanshFitScale, computeVanshLayout, getEligibleParentIds } from '../lib/vanshLayout';
import type { KulFamilyMember, KulLineage } from '../lib/kul';

describe('KUL Vansh (Family Lineage) Layout Engine', () => {
  it('handles empty member list with lineage crest gracefully', () => {
    const lineage: KulLineage = {
      gotra: 'Kashyap',
      pravara: 'Kashyap-Avatsara-Naidhruva',
      kuldeviName: 'Shakambhari Devi',
      kuldevtaName: 'Shiva',
      kuldeviPlaceId: null,
      kuldevtaPlaceId: null,
      ancestralOrigin: 'Saharanpur, Uttar Pradesh',
      kulacharaNotes: null,
    };

    const layout = computeVanshLayout([], lineage);
    assert.strictEqual(layout.nodes.length, 0);
    assert.strictEqual(layout.edges.length, 0);
    assert.ok(layout.crest !== null);
    assert.strictEqual(layout.crest?.gotra, 'Kashyap');
    assert.strictEqual(layout.crest?.kuldeviName, 'Shakambhari Devi');
    assert.ok(layout.canvasWidth >= 340);
    assert.ok(layout.canvasHeight >= 100);
  });

  it('computes multi-generation family tree with parent-child Bezier curves', () => {
    const members: KulFamilyMember[] = [
      {
        id: 'ancestor-1',
        name: 'Pt. Hari Ram Sharma',
        role: 'Great-Grandfather',
        generation: 1,
        parent_id: null,
        spouse_id: 'ancestor-2',
        is_alive: false,
      },
      {
        id: 'ancestor-2',
        name: 'Smt. Saraswati Devi',
        role: 'Great-Grandmother',
        generation: 1,
        parent_id: null,
        spouse_id: 'ancestor-1',
        is_alive: false,
      },
      {
        id: 'gen2-1',
        name: 'Shri Ram Das Sharma',
        role: 'Grandfather',
        generation: 2,
        parent_id: 'ancestor-1',
        spouse_id: 'gen2-2',
        is_alive: false,
      },
      {
        id: 'gen2-2',
        name: 'Smt. Lakshmi Bai',
        role: 'Grandmother',
        generation: 2,
        parent_id: null,
        spouse_id: 'gen2-1',
        is_alive: true,
      },
      {
        id: 'gen3-1',
        name: 'Shri Rajesh Sharma',
        role: 'Father',
        generation: 3,
        parent_id: 'gen2-1',
        spouse_id: null,
        is_alive: true,
      },
    ];

    const lineage: KulLineage = {
      gotra: 'Kashyap',
      pravara: null,
      kuldeviName: 'Mata Amba',
      kuldevtaName: 'Mahadev',
      kuldeviPlaceId: null,
      kuldevtaPlaceId: null,
      ancestralOrigin: 'Devprayag',
      kulacharaNotes: null,
    };

    const layout = computeVanshLayout(members, lineage);

    assert.strictEqual(layout.nodes.length, 5);
    assert.ok(layout.crest !== null);
    assert.strictEqual(layout.crest?.gotra, 'Kashyap');

    // Check generational levels
    const nodeMap = new Map(layout.nodes.map((n) => [n.data.id, n]));
    const a1 = nodeMap.get('ancestor-1')!;
    const a2 = nodeMap.get('ancestor-2')!;
    const g2 = nodeMap.get('gen2-1')!;
    const g3 = nodeMap.get('gen3-1')!;

    assert.strictEqual(a1.generation, 1);
    assert.strictEqual(a2.generation, 1);
    assert.strictEqual(g2.generation, 2);
    assert.strictEqual(g3.generation, 3);

    // Verify Y positions ascend downwards
    assert.ok(a1.y < g2.y, 'Gen 1 must be higher than Gen 2');
    assert.ok(g2.y < g3.y, 'Gen 2 must be higher than Gen 3');

    // Verify spouses placed on same horizontal level
    assert.strictEqual(a1.y, a2.y, 'Spouses must be on the same horizontal level');

    // Verify Edges
    // 1. Crest to roots
    const crestEdges = layout.edges.filter((e) => e.type === 'crest_root');
    assert.ok(crestEdges.length >= 2, 'Crest connects to root ancestors');

    // 2. Spouse edges
    const spouseEdges = layout.edges.filter((e) => e.type === 'spouse');
    assert.ok(spouseEdges.length >= 2, 'Should have spouse edges for Gen 1 and Gen 2 pairs');

    // 3. Parent-child edges
    const parentChildEdges = layout.edges.filter((e) => e.type === 'parent_child');
    assert.ok(parentChildEdges.length >= 2, 'Should have parent-child edges');

    // Check SVG path format
    for (const edge of layout.edges) {
      assert.ok(edge.pathD.startsWith('M '), 'Path must start with M command');
      if (edge.type === 'parent_child' || edge.type === 'crest_root') {
        assert.ok(edge.pathD.includes(' C '), 'Vertical connectors must use cubic Bezier');
      }
    }

    // Verify canvas dimensions
    assert.ok(layout.canvasWidth > 300, 'Canvas width must be valid');
    assert.ok(layout.canvasHeight > g3.y, 'Canvas height must cover lowest node');
  });

  it('marks deceased ancestors as isRemembered', () => {
    const members: KulFamilyMember[] = [
      {
        id: 'm1',
        name: 'Late Ancestor',
        role: 'Grandfather',
        generation: 1,
        parent_id: null,
        spouse_id: null,
        is_alive: false,
      },
      {
        id: 'm2',
        name: 'Living Member',
        role: 'Self',
        generation: 2,
        parent_id: 'm1',
        spouse_id: null,
        is_alive: true,
      },
    ];

    const layout = computeVanshLayout(members);
    const nodeMap = new Map(layout.nodes.map((n) => [n.data.id, n]));

    assert.strictEqual(nodeMap.get('m1')?.isRemembered, true);
    assert.strictEqual(nodeMap.get('m2')?.isRemembered, false);
  });

  it('derives every generation from parent links when generation values are missing', () => {
    const members: KulFamilyMember[] = [
      { id: 'child', name: 'Child', role: null, generation: null, parent_id: 'parent', spouse_id: null, is_alive: true },
      { id: 'root', name: 'Root', role: null, generation: null, parent_id: null, spouse_id: null, is_alive: false },
      { id: 'parent', name: 'Parent', role: null, generation: null, parent_id: 'root', spouse_id: null, is_alive: true },
    ];

    const layout = computeVanshLayout(members);
    const nodes = new Map(layout.nodes.map((node) => [node.data.id, node]));

    assert.equal(nodes.get('root')?.generation, 1);
    assert.equal(nodes.get('parent')?.generation, 2);
    assert.equal(nodes.get('child')?.generation, 3);
    assert.equal(nodes.get('child')?.resolvedParentId, 'parent');
    assert.ok(nodes.get('root')!.y < nodes.get('parent')!.y);
    assert.ok(nodes.get('parent')!.y < nodes.get('child')!.y);
  });

  it('keeps parent links downward when entered generation numbers conflict', () => {
    const members: KulFamilyMember[] = [
      { id: 'parent', name: 'Parent', role: null, generation: 5, parent_id: null, spouse_id: null, is_alive: true },
      { id: 'child', name: 'Child', role: null, generation: 1, parent_id: 'parent', spouse_id: null, is_alive: true },
    ];

    const layout = computeVanshLayout(members);
    const nodes = new Map(layout.nodes.map((node) => [node.data.id, node]));
    const edge = layout.edges.find((candidate) => candidate.type === 'parent_child');

    assert.equal(nodes.get('child')!.generation, nodes.get('parent')!.generation + 1);
    assert.ok(edge);
    assert.ok(edge!.endY > edge!.startY);
  });

  it('drops the cycle-closing parent link and does not draw self-parent links', () => {
    const members: KulFamilyMember[] = [
      { id: 'a', name: 'A', role: null, generation: null, parent_id: 'b', spouse_id: null, is_alive: true },
      { id: 'b', name: 'B', role: null, generation: null, parent_id: 'a', spouse_id: null, is_alive: true },
      { id: 'self', name: 'Self', role: null, generation: 1, parent_id: 'self', spouse_id: null, is_alive: true },
    ];

    const layout = computeVanshLayout(members);
    const parentEdges = layout.edges.filter((edge) => edge.type === 'parent_child');

    assert.equal(parentEdges.length, 1);
    assert.notEqual(parentEdges[0].fromId, parentEdges[0].toId);
    const nodes = new Map(layout.nodes.map((node) => [node.data.id, node]));
    assert.equal(nodes.get('self')?.resolvedParentId, null);
    assert.equal(nodes.get(parentEdges[0].toId)?.resolvedParentId, parentEdges[0].fromId);
    assert.ok(nodes.get(parentEdges[0].fromId)!.y < nodes.get(parentEdges[0].toId)!.y);
  });

  it('fits the measured tree inside the viewport while reserving room for controls', () => {
    const scale = computeVanshFitScale(800, 900, 360, 480);

    assert.equal(scale, 0.39);
    assert.ok(800 * scale <= 360 - 48);
    assert.ok(900 * scale <= 480 - 72 - 48);
    assert.equal(computeVanshFitScale(180, 240, 360, 480), 1);
  });

  it('shows a crest when pravara is the only lineage detail', () => {
    const lineage: KulLineage = {
      gotra: null,
      pravara: 'Kashyapa',
      kuldeviName: null,
      kuldevtaName: null,
      kuldeviPlaceId: null,
      kuldevtaPlaceId: null,
      ancestralOrigin: null,
      kulacharaNotes: null,
    };

    assert.equal(computeVanshLayout([], lineage).crest?.pravara, 'Kashyapa');
  });

  it('prevents selecting the edited member or one of its descendants as its parent', () => {
    const members: KulFamilyMember[] = [
      { id: 'grandparent', name: 'Grandparent', role: null, generation: 1, parent_id: null, spouse_id: null, is_alive: true },
      { id: 'parent', name: 'Parent', role: null, generation: 2, parent_id: 'grandparent', spouse_id: null, is_alive: true },
      { id: 'child', name: 'Child', role: null, generation: 3, parent_id: 'parent', spouse_id: null, is_alive: true },
      { id: 'other', name: 'Other branch', role: null, generation: 1, parent_id: null, spouse_id: null, is_alive: true },
    ];

    assert.deepEqual(getEligibleParentIds(members, 'parent'), ['grandparent', 'other']);
    assert.deepEqual(getEligibleParentIds(members, null), members.map((member) => member.id));
  });
});
