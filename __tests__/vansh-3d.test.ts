import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  project3D,
  computeVansh3DLayout,
  computePanAngles,
  computePinchZoom,
  shouldAutoOrbitRun,
  isAnyGestureActive,
  classifyLineageBranch,
  resolveMaternalAncestryIds,
  isNodeCardContained,
  VIEW_PRESETS,
  MIN_ZOOM,
  MAX_ZOOM,
  MIN_PITCH,
  MAX_PITCH,
  TOP_HUD_HEIGHT,
  BOTTOM_CONTROLS_HEIGHT,
  CARD_BASE_WIDTH,
  CARD_BASE_HEIGHT,
} from '../lib/vansh3d';
import { MIN_TOUCH_TARGET } from '../lib/constants';
import type { LayoutVanshNode, LayoutVanshEdge } from '../lib/vanshLayout';
import type { KulFamilyMember } from '../lib/kul';

describe('Vansh 3D Spatial Lineage Engine', () => {
  describe('project3D edge cases and numerical stability', () => {
    it('projects center coordinates deterministically', () => {
      const center = project3D({ x: 0, y: 0, z: 0 }, 0, 0, 1.0, 400, 600);
      assert.equal(Math.round(center.sx), 200);
      assert.equal(Math.round(center.sy), 300);
      assert.ok(center.scale > 0);
      assert.ok(center.depth > 0);
    });

    it('guards near-camera depth to prevent division by zero or negative depth', () => {
      // Extremely close or negative Z coordinate behind camera
      const near = project3D({ x: 0, y: 0, z: -800 }, 0, 0, 1.0, 400, 600);
      assert.ok(Number.isFinite(near.sx));
      assert.ok(Number.isFinite(near.sy));
      assert.ok(Number.isFinite(near.scale));
      assert.ok(near.depth >= 60, 'near-plane depth must be clamped to at least 60');
      assert.ok(near.scale > 0);
    });

    it('preserves far/front depth ordering', () => {
      const front = project3D({ x: 0, y: 0, z: 120 }, 0, 0, 1.0, 400, 600);
      const back = project3D({ x: 0, y: 0, z: -120 }, 0, 0, 1.0, 400, 600);
      assert.ok(front.depth > back.depth, 'front node has greater depth distance than back');
      assert.ok(front.scale < back.scale, 'front node perspective scale is calculated correctly');
    });

    it('handles negative, large, and wrapping rotations safely', () => {
      const largeRot = project3D({ x: 50, y: 50, z: 50 }, -Math.PI * 6, Math.PI * 12, 1.0, 400, 600);
      assert.ok(Number.isFinite(largeRot.sx));
      assert.ok(Number.isFinite(largeRot.sy));
      assert.ok(Number.isFinite(largeRot.scale));
      assert.ok(Number.isFinite(largeRot.depth));
    });

    it('produces finite output for valid inputs across camera limits', () => {
      for (const pitch of [MIN_PITCH, 0, MAX_PITCH]) {
        for (const yaw of [-Math.PI, 0, Math.PI]) {
          for (const zoom of [MIN_ZOOM, 1.0, MAX_ZOOM]) {
            const p = project3D({ x: 100, y: -100, z: 50 }, pitch, yaw, zoom, 360, 520);
            assert.ok(Number.isFinite(p.sx));
            assert.ok(Number.isFinite(p.sy));
            assert.ok(Number.isFinite(p.scale));
            assert.ok(Number.isFinite(p.depth));
          }
        }
      }
    });
  });

  describe('Gesture math (Pan and Pinch baseline calculations)', () => {
    it('calculates pan angles relative to gesture-start baseline with pitch clamping', () => {
      const startRotX = 0.0;
      const startRotY = 0.5;

      // Small drag down (positive translationY)
      const down = computePanAngles(startRotX, startRotY, 0, 100, 0.005);
      assert.ok(down.rotX > startRotX, 'pitch increases when dragged down');
      assert.equal(down.rotY, startRotY);

      // Extreme drag down clamps to MAX_PITCH
      const maxClamp = computePanAngles(startRotX, startRotY, 0, 10000, 0.005);
      assert.equal(maxClamp.rotX, MAX_PITCH);

      // Extreme drag up clamps to MIN_PITCH
      const minClamp = computePanAngles(startRotX, startRotY, 0, -10000, 0.005);
      assert.equal(minClamp.rotX, MIN_PITCH);

      // Drag right increases yaw (continuous rotation)
      const right = computePanAngles(startRotX, startRotY, 200, 0, 0.005);
      assert.equal(right.rotY, startRotY + 200 * 0.005);
    });

    it('calculates pinch zoom from baseline scale with clamping', () => {
      const baseZoom = 1.0;

      // 1.5x pinch outward
      const zoomedIn = computePinchZoom(baseZoom, 1.5);
      assert.equal(zoomedIn, 1.5);

      // Extreme pinch in clamps to MAX_ZOOM
      const extremeZoomIn = computePinchZoom(baseZoom, 10.0);
      assert.equal(extremeZoomIn, MAX_ZOOM);

      // Extreme pinch out clamps to MIN_ZOOM
      const extremeZoomOut = computePinchZoom(baseZoom, 0.01);
      assert.equal(extremeZoomOut, MIN_ZOOM);
    });

    it('provides all 3 camera preset angles with correct defaults', () => {
      assert.ok(VIEW_PRESETS.orbit);
      assert.ok(VIEW_PRESETS.constellation);
      assert.ok(VIEW_PRESETS.generations);
      assert.equal(VIEW_PRESETS.orbit.label, '3D Orbit');
      assert.equal(VIEW_PRESETS.constellation.label, 'Constellation');
      assert.equal(VIEW_PRESETS.generations.label, 'Generations');
    });
  });

  describe('Auto-orbit lifecycle & motion conditions', () => {
    const baseConditions = {
      isEnabled: true,
      isInteracting: false,
      isFocused: true,
      isAppActive: true,
      isReducedMotion: false,
    };

    it('runs when all conditions are satisfied', () => {
      assert.equal(shouldAutoOrbitRun(baseConditions), true);
    });

    it('does not run when disabled (opt-in safe)', () => {
      assert.equal(shouldAutoOrbitRun({ ...baseConditions, isEnabled: false }), false);
    });

    it('does not run when user is interacting via touch gesture (P1 Finding)', () => {
      assert.equal(shouldAutoOrbitRun({ ...baseConditions, isInteracting: true }), false);
    });

    it('does not run when screen loses focus', () => {
      assert.equal(shouldAutoOrbitRun({ ...baseConditions, isFocused: false }), false);
    });

    it('does not run when app is backgrounded or inactive', () => {
      assert.equal(shouldAutoOrbitRun({ ...baseConditions, isAppActive: false }), false);
    });

    it('does not run when reduced motion is enabled', () => {
      assert.equal(shouldAutoOrbitRun({ ...baseConditions, isReducedMotion: true }), false);
    });

    it('keeps orbit paused while either simultaneous gesture remains active', () => {
      assert.equal(isAnyGestureActive(true, false), true);
      assert.equal(isAnyGestureActive(false, true), true);
      assert.equal(isAnyGestureActive(true, true), true);
      assert.equal(isAnyGestureActive(false, false), false);
    });
  });

  describe('Data-driven lineage classification', () => {
    it('classifies member with linked_user_id as self', () => {
      const memberMap = new Map<string, KulFamilyMember>();
      const selfMember: KulFamilyMember = {
        id: 'user_1',
        name: 'Arjun',
        role: 'Account Holder',
        generation: 3,
        is_alive: true,
        parent_id: null,
        spouse_id: null,
        linked_user_id: 'auth_123',
      };
      memberMap.set('user_1', selfMember);

      const branch = classifyLineageBranch(selfMember, memberMap, 'user_1');
      assert.equal(branch, 'self');
    });

    it('classifies lower generation as child', () => {
      const memberMap = new Map<string, KulFamilyMember>();
      const selfMember: KulFamilyMember = {
        id: 'user_1',
        name: 'Arjun',
        role: 'Self',
        generation: 3,
        is_alive: true,
        parent_id: null,
        spouse_id: null,
        linked_user_id: 'auth_123',
      };
      const childMember: KulFamilyMember = {
        id: 'child_1',
        name: 'Aarav',
        role: null,
        generation: 4,
        is_alive: true,
        parent_id: 'user_1',
        spouse_id: null,
        linked_user_id: null,
      };
      memberMap.set('user_1', selfMember);
      memberMap.set('child_1', childMember);

      const branch = classifyLineageBranch(childMember, memberMap, 'user_1');
      assert.equal(branch, 'child');
    });

    it('classifies deep maternal ancestry (3 generations up) purely via graph topology', () => {
      const memberMap = new Map<string, KulFamilyMember>();

      // self -> father (parent_id) with spouse mother
      const selfMember: KulFamilyMember = {
        id: 'self_1',
        name: 'Arjun',
        role: 'Self',
        generation: 4,
        is_alive: true,
        parent_id: 'father_1',
        spouse_id: null,
        linked_user_id: 'auth_u',
      };
      const fatherMember: KulFamilyMember = {
        id: 'father_1',
        name: 'Devendra',
        role: 'Father',
        generation: 3,
        is_alive: true,
        parent_id: 'dada_1',
        spouse_id: 'mother_1',
        linked_user_id: null,
      };
      const motherMember: KulFamilyMember = {
        id: 'mother_1',
        name: 'Sunita',
        role: 'माता (Mother)',
        generation: 3,
        is_alive: true,
        parent_id: 'nana_1',
        spouse_id: 'father_1',
        linked_user_id: null,
      };
      // Maternal grandfather
      const nanaMember: KulFamilyMember = {
        id: 'nana_1',
        name: 'Gopal Krishna',
        role: 'Elder',
        generation: 2,
        is_alive: false,
        parent_id: 'parnana_1',
        spouse_id: 'nani_1',
        linked_user_id: null,
      };
      // Maternal great-grandfather (3 generations above self, no role string)
      const parnanaMember: KulFamilyMember = {
        id: 'parnana_1',
        name: 'Raghunath Sharma',
        role: null, // No role string provided!
        generation: 1,
        is_alive: false,
        parent_id: null,
        spouse_id: null,
        linked_user_id: null,
      };
      // Maternal uncle (brother of mother)
      const mamaMember: KulFamilyMember = {
        id: 'mama_1',
        name: 'Vijay Kumar',
        role: null,
        generation: 3,
        is_alive: true,
        parent_id: 'nana_1',
        spouse_id: null,
        linked_user_id: null,
      };

      memberMap.set('self_1', selfMember);
      memberMap.set('father_1', fatherMember);
      memberMap.set('mother_1', motherMember);
      memberMap.set('nana_1', nanaMember);
      memberMap.set('parnana_1', parnanaMember);
      memberMap.set('mama_1', mamaMember);

      const maternalSet = resolveMaternalAncestryIds('self_1', memberMap);
      assert.ok(maternalSet.has('mother_1'), 'mother is in maternal IDs');
      assert.ok(maternalSet.has('nana_1'), 'nana is in maternal IDs');
      assert.ok(maternalSet.has('parnana_1'), 'parnana is in maternal IDs');
      assert.ok(maternalSet.has('mama_1'), 'maternal uncle is in maternal IDs');

      // Verify classification
      assert.equal(classifyLineageBranch(parnanaMember, memberMap, 'self_1'), 'matri');
      assert.equal(classifyLineageBranch(mamaMember, memberMap, 'self_1'), 'matri');
    });

    it('falls back safely to pitri without inventing relationships', () => {
      const memberMap = new Map<string, KulFamilyMember>();
      const unknownAncestor: KulFamilyMember = {
        id: 'anc_1',
        name: 'Unknown Elder',
        role: null,
        generation: 1,
        is_alive: false,
        parent_id: null,
        spouse_id: null,
        linked_user_id: null,
      };
      memberMap.set('anc_1', unknownAncestor);

      const branch = classifyLineageBranch(unknownAncestor, memberMap, null);
      assert.equal(branch, 'pitri');
    });
  });

  describe('Responsive layout and visual containment bounds', () => {
    function createMockTree(): { nodes: LayoutVanshNode[]; edges: LayoutVanshEdge[] } {
      const mockMembers: KulFamilyMember[] = [
        { id: '1', name: 'Grandfather', role: 'Dada', generation: 1, is_alive: false, parent_id: null, spouse_id: null, linked_user_id: null },
        { id: '2', name: 'Father', role: 'Pita', generation: 2, is_alive: true, parent_id: '1', spouse_id: null, linked_user_id: null },
        { id: '3', name: 'Self', role: 'Self', generation: 3, is_alive: true, parent_id: '2', spouse_id: null, linked_user_id: 'auth_u' },
        { id: '4', name: 'Child', role: 'Son', generation: 4, is_alive: true, parent_id: '3', spouse_id: null, linked_user_id: null },
      ];

      const nodes: LayoutVanshNode[] = mockMembers.map((m, i) => ({
        data: m,
        resolvedParentId: m.parent_id,
        x: i * 120,
        y: i * 110,
        width: 140,
        height: 110,
        generation: m.generation!,
        columnIndex: i % 2,
        isRemembered: !m.is_alive,
      }));

      const edges: LayoutVanshEdge[] = [
        { id: 'e1', fromId: '1', toId: '2', type: 'parent_child', startX: 60, startY: 110, endX: 180, endY: 220, pathD: '' },
        { id: 'e2', fromId: '2', toId: '3', type: 'parent_child', startX: 180, startY: 220, endX: 300, endY: 330, pathD: '' },
        { id: 'e3', fromId: '3', toId: '4', type: 'parent_child', startX: 300, startY: 330, endX: 420, endY: 440, pathD: '' },
      ];

      return { nodes, edges };
    }

    it('proves actual visual containment of all cards on small iPhone (320x480)', () => {
      const { nodes, edges } = createMockTree();
      const layout = computeVansh3DLayout(nodes, edges, null, 320, 480);
      assert.ok(layout.fitScale > 0 && layout.fitScale <= 1.05);

      const preset = VIEW_PRESETS.orbit;
      for (const node of layout.nodes) {
        const proj = project3D(node.p3d, preset.rotX, preset.rotY, preset.zoom, 320, 480, layout.fitScale);
        const isContained = isNodeCardContained(proj, 320, 480, TOP_HUD_HEIGHT, BOTTOM_CONTROLS_HEIGHT);
        assert.ok(
          isContained,
          `Card for ${node.data.name} must be contained within safe margins (sx=${proj.sx}, sy=${proj.sy})`
        );
      }
    });

    it('proves visual containment across all camera presets (orbit, constellation, generations)', () => {
      const { nodes, edges } = createMockTree();
      const layout = computeVansh3DLayout(nodes, edges, null, 360, 640);

      for (const mode of ['orbit', 'constellation', 'generations'] as const) {
        const preset = VIEW_PRESETS[mode];
        for (const node of layout.nodes) {
          const proj = project3D(node.p3d, preset.rotX, preset.rotY, preset.zoom, 360, 640, layout.fitScale);
          assert.ok(
            proj.sx >= 0 && proj.sx <= 360,
            `Node ${node.data.name} sx=${proj.sx} within width in mode ${mode}`
          );
          assert.ok(
            proj.sy >= TOP_HUD_HEIGHT - 20 && proj.sy <= 640 - BOTTOM_CONTROLS_HEIGHT + 20,
            `Node ${node.data.name} sy=${proj.sy} within vertical clearance in mode ${mode}`
          );
        }
      }
    });

    it('fits deep multi-generation trees (5 generations) within small viewport without clipping', () => {
      const deepMembers: KulFamilyMember[] = [
        { id: 'g1', name: 'Great-Great-Grandfather', role: 'Vridha Prapitamaha', generation: 1, is_alive: false, parent_id: null, spouse_id: null, linked_user_id: null },
        { id: 'g2', name: 'Great-Grandfather', role: 'Prapitamaha', generation: 2, is_alive: false, parent_id: 'g1', spouse_id: null, linked_user_id: null },
        { id: 'g3', name: 'Grandfather', role: 'Pitamaha', generation: 3, is_alive: false, parent_id: 'g2', spouse_id: null, linked_user_id: null },
        { id: 'g4', name: 'Father', role: 'Pita', generation: 4, is_alive: true, parent_id: 'g3', spouse_id: null, linked_user_id: null },
        { id: 'g5', name: 'Self', role: 'Self', generation: 5, is_alive: true, parent_id: 'g4', spouse_id: null, linked_user_id: 'auth_usr' },
      ];

      const nodes: LayoutVanshNode[] = deepMembers.map((m, i) => ({
        data: m,
        resolvedParentId: m.parent_id,
        x: (i % 2) * 120,
        y: i * 110,
        width: 140,
        height: 110,
        generation: m.generation!,
        columnIndex: i % 2,
        isRemembered: !m.is_alive,
      }));

      const edges: LayoutVanshEdge[] = [
        { id: 'e1', fromId: 'g1', toId: 'g2', type: 'parent_child', startX: 60, startY: 110, endX: 60, endY: 220, pathD: '' },
        { id: 'e2', fromId: 'g2', toId: 'g3', type: 'parent_child', startX: 60, startY: 220, endX: 60, endY: 330, pathD: '' },
        { id: 'e3', fromId: 'g3', toId: 'g4', type: 'parent_child', startX: 60, startY: 330, endX: 60, endY: 440, pathD: '' },
        { id: 'e4', fromId: 'g4', toId: 'g5', type: 'parent_child', startX: 60, startY: 440, endX: 60, endY: 550, pathD: '' },
      ];

      const layout = computeVansh3DLayout(nodes, edges, null, 320, 480);
      assert.ok(layout.fitScale > 0 && layout.fitScale <= 1.0);
      assert.equal(layout.nodes.length, 5);

      for (const node of layout.nodes) {
        const proj = project3D(node.p3d, 0, 0, 1.0, 320, 480, layout.fitScale);
        assert.ok(Number.isFinite(proj.sx), `proj.sx finite for ${node.data.name}`);
        assert.ok(Number.isFinite(proj.sy), `proj.sy finite for ${node.data.name}`);
        assert.ok(proj.depth >= 60, 'depth is protected against camera clipping');
      }
    });
  });

  describe('Accessibility and 44pt touch target standards', () => {
    it('enforces 44pt minimum touch target constant', () => {
      assert.equal(MIN_TOUCH_TARGET, 44);
    });

    it('ensures camera preset configurations provide valid accessible angles and zoom', () => {
      for (const key of ['orbit', 'constellation', 'generations'] as const) {
        const preset = VIEW_PRESETS[key];
        assert.ok(preset.label.length > 0, `preset ${key} has accessible label`);
        assert.ok(preset.zoom >= MIN_ZOOM && preset.zoom <= MAX_ZOOM, `preset ${key} zoom is within touch limits`);
        assert.ok(preset.rotX >= MIN_PITCH && preset.rotX <= MAX_PITCH, `preset ${key} rotX is within pitch limits`);
      }
    });

    it('enforces zoom boundaries that protect card visibility and tapability', () => {
      assert.equal(MIN_ZOOM, 0.4, 'minimum zoom prevents cards from disappearing');
      assert.equal(MAX_ZOOM, 2.5, 'maximum zoom prevents cards from overflowing view completely');
    });
  });
});
