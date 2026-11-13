import type {
  LayoutVanshCrest,
  LayoutVanshEdge,
  LayoutVanshNode,
} from './vanshLayout';
import type { KulFamilyMember } from './kul';

export type VanshViewMode = 'orbit' | 'constellation' | 'generations';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedPoint {
  sx: number;
  sy: number;
  scale: number;
  depth: number;
}

export type VanshBranchType = 'pitri' | 'matri' | 'self' | 'child';

export interface Vansh3DNode extends LayoutVanshNode {
  p3d: Point3D;
  proj?: ProjectedPoint;
  branchType: VanshBranchType;
}

export interface Vansh3DEdge extends LayoutVanshEdge {
  p3dStart: Point3D;
  p3dEnd: Point3D;
}

export interface Vansh3DCrest extends LayoutVanshCrest {
  p3d: Point3D;
  proj?: ProjectedPoint;
}

export interface Vansh3DLayoutResult {
  nodes: Vansh3DNode[];
  edges: Vansh3DEdge[];
  crest: Vansh3DCrest | null;
  fitScale: number;
}

export interface AutoOrbitConditions {
  isEnabled: boolean;
  isInteracting: boolean;
  isFocused: boolean;
  isAppActive: boolean;
  isReducedMotion: boolean;
}

export const MIN_ZOOM = 0.4;
export const MAX_ZOOM = 2.5;
export const MIN_PITCH = -1.45;
export const MAX_PITCH = 1.45;
export const CAMERA_DIST = 520;
export const BASE_FOV = 440;

export const TOP_HUD_HEIGHT = 56;
export const BOTTOM_CONTROLS_HEIGHT = 80;
export const CARD_BASE_WIDTH = 118;
export const CARD_BASE_HEIGHT = 94;
export const CREST_BASE_WIDTH = 220;
export const CREST_BASE_HEIGHT = 36;

export const VIEW_PRESETS: Record<
  VanshViewMode,
  { rotX: number; rotY: number; zoom: number; label: string; hindiLabel: string }
> = {
  orbit: {
    rotX: -0.32,
    rotY: 0.52,
    zoom: 1.0,
    label: '3D Orbit',
    hindiLabel: 'भ्रमण (3D)',
  },
  constellation: {
    rotX: -1.35,
    rotY: 0.0,
    zoom: 0.95,
    label: 'Constellation',
    hindiLabel: 'नक्षत्र मंडल',
  },
  generations: {
    rotX: 0.0,
    rotY: 0.0,
    zoom: 1.0,
    label: 'Generations',
    hindiLabel: 'वंश वृक्ष',
  },
};

export function clamp(val: number, min: number, max: number): number {
  'worklet';
  if (val < min) return min;
  if (val > max) return max;
  return val;
}

/**
 * Computes camera pitch and yaw from a gesture-start baseline using translation offsets.
 */
export function computePanAngles(
  savedRotX: number,
  savedRotY: number,
  translationX: number,
  translationY: number,
  sensitivity = 0.005
): { rotX: number; rotY: number } {
  'worklet';
  const nextRotX = clamp(savedRotX + translationY * sensitivity, MIN_PITCH, MAX_PITCH);
  const nextRotY = savedRotY + translationX * sensitivity;
  return { rotX: nextRotX, rotY: nextRotY };
}

/**
 * Computes zoom from a gesture-start baseline using cumulative pinch scale.
 */
export function computePinchZoom(
  savedZoom: number,
  gestureScale: number,
  minZoom = MIN_ZOOM,
  maxZoom = MAX_ZOOM
): number {
  'worklet';
  return clamp(savedZoom * gestureScale, minZoom, maxZoom);
}

/**
 * Evaluates whether auto-orbit rotation is permitted to run under live system conditions.
 */
export function shouldAutoOrbitRun(conditions: AutoOrbitConditions): boolean {
  return (
    conditions.isEnabled &&
    !conditions.isInteracting &&
    conditions.isFocused &&
    conditions.isAppActive &&
    !conditions.isReducedMotion
  );
}

export function isAnyGestureActive(panActive: boolean, pinchActive: boolean): boolean {
  'worklet';
  return panActive || pinchActive;
}

/**
 * Projects a 3D coordinate (x, y, z) into 2D viewport coordinates with perspective depth and scale.
 * Handles edge cases: near-camera clamping, large/negative rotations, and viewport scale fitting.
 */
export function project3D(
  p: Point3D,
  rotX: number,
  rotY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  fitScale = 1.0,
  cameraDist = CAMERA_DIST,
  fov = BASE_FOV
): ProjectedPoint {
  // Wrap rotY to [-PI, PI] range to prevent precision loss on long auto-orbit
  const normalizedRotY = ((rotY % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
  const cosY = Math.cos(normalizedRotY);
  const sinY = Math.sin(normalizedRotY);
  const x1 = p.x * cosY - p.z * sinY;
  const z1 = p.z * cosY + p.x * sinY;

  // Clamped pitch rotation
  const clampedRotX = clamp(rotX, MIN_PITCH, MAX_PITCH);
  const cosX = Math.cos(clampedRotX);
  const sinX = Math.sin(clampedRotX);
  const y2 = p.y * cosX - z1 * sinX;
  const z2 = z1 * cosX + p.y * sinX;

  // Depth calculation with near-plane guard to prevent division by zero or negative depth inversion
  const rawDepth = z2 + cameraDist;
  const depth = Math.max(rawDepth, 60);

  // Apply fitScale to fov so small devices never clip outer nodes
  const effectiveFov = fov * zoom * fitScale;
  const scale = effectiveFov / depth;

  const sx = viewportWidth / 2 + x1 * scale;
  const sy = viewportHeight / 2 + y2 * scale;

  return { sx, sy, scale, depth };
}

/**
 * Resolves the complete set of maternal lineage IDs by traversing upward and across
 * the family graph starting from any identified maternal parent.
 */
export function resolveMaternalAncestryIds(
  selfMemberId: string | null,
  allMembers: Map<string, KulFamilyMember>
): Set<string> {
  const maternalIds = new Set<string>();
  if (!selfMemberId) return maternalIds;

  const selfMember = allMembers.get(selfMemberId);
  if (!selfMember) return maternalIds;

  const candidateMotherIds = new Set<string>();

  // Check parent and spouse of parent
  if (selfMember.parent_id) {
    const directParent = allMembers.get(selfMember.parent_id);
    if (directParent) {
      const parentRole = (directParent.role || '').toLowerCase();
      const isParentMother =
        parentRole.includes('mother') ||
        parentRole.includes('माता') ||
        parentRole.includes('माँ');
      if (isParentMother) {
        candidateMotherIds.add(directParent.id);
      } else if (directParent.spouse_id && allMembers.has(directParent.spouse_id)) {
        candidateMotherIds.add(directParent.spouse_id);
      }
    }
  }

  // Also check if any member with mother role connects to self or spouse of parent
  for (const [id, m] of allMembers) {
    const role = (m.role || '').toLowerCase();
    if (role.includes('mother') || role.includes('माता') || role.includes('माँ')) {
      if (m.spouse_id === selfMember.parent_id || m.id === selfMember.parent_id) {
        candidateMotherIds.add(id);
      }
    }
  }

  // BFS upward traversal from each candidate mother to collect all maternal ancestors and spouses
  const queue = Array.from(candidateMotherIds);
  for (const mId of queue) {
    maternalIds.add(mId);
  }

  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const current = allMembers.get(currentId);
    if (!current) continue;

    // Parents of maternal ancestor
    if (current.parent_id && !maternalIds.has(current.parent_id)) {
      maternalIds.add(current.parent_id);
      queue.push(current.parent_id);
    }

    // Spouse of maternal ancestor
    if (current.spouse_id && !maternalIds.has(current.spouse_id)) {
      maternalIds.add(current.spouse_id);
      queue.push(current.spouse_id);
    }
  }

  // Also include siblings/collateral relatives on the maternal side (children of maternal ancestors)
  for (const [id, m] of allMembers) {
    if (id === selfMemberId || m.parent_id === selfMember.parent_id) continue;
    if (m.parent_id && maternalIds.has(m.parent_id)) {
      maternalIds.add(id);
    }
  }

  return maternalIds;
}

/**
 * Classifies a family member into a lineage branch (self, child, matri, or pitri)
 * using explicit user link, complete graph topology traversal, and declared role indicators.
 */
export function classifyLineageBranch(
  member: KulFamilyMember,
  allMembers: Map<string, KulFamilyMember>,
  selfMemberId: string | null
): VanshBranchType {
  // 1. Explicit living seeker link
  if (member.linked_user_id || (selfMemberId && member.id === selfMemberId)) {
    return 'self';
  }

  const selfMember = selfMemberId ? allMembers.get(selfMemberId) : null;
  const selfGen = selfMember?.generation ?? 3;

  // 2. Generation lower than self is child / next gen
  if (member.generation != null && member.generation > selfGen) {
    return 'child';
  }

  // 3. Complete data-driven maternal ancestry topology
  const maternalIds = resolveMaternalAncestryIds(selfMemberId, allMembers);
  if (maternalIds.has(member.id)) {
    return 'matri';
  }

  // 4. Role-based fallback for disconnected or unlinked nodes
  const role = (member.role || '').toLowerCase();
  if (
    role.includes('mother') ||
    role.includes('माता') ||
    role.includes('माँ') ||
    role.includes('maternal') ||
    role.includes('मातृ') ||
    role.includes('nana') ||
    role.includes('नाना') ||
    role.includes('nani') ||
    role.includes('नानी') ||
    role.includes('mama') ||
    role.includes('मामा') ||
    role.includes('masi') ||
    role.includes('मौसी')
  ) {
    return 'matri';
  }

  if (
    role.includes('son') ||
    role.includes('daughter') ||
    role.includes('child') ||
    role.includes('पुत्र') ||
    role.includes('पुत्री') ||
    role.includes('संतान') ||
    role.includes('बच्चा')
  ) {
    return 'child';
  }

  // 5. Default: Paternal (Pitri) core of the Kul Gotra lineage
  return 'pitri';
}

/**
 * Checks whether a projected card with dimensions is fully contained inside safe viewport boundaries.
 */
export function isNodeCardContained(
  proj: ProjectedPoint,
  viewportWidth: number,
  viewportHeight: number,
  topMargin = TOP_HUD_HEIGHT,
  bottomMargin = BOTTOM_CONTROLS_HEIGHT,
  horizontalMargin = 8
): boolean {
  const scale = clamp(proj.scale, 0.65, 1.25);
  const halfW = (CARD_BASE_WIDTH * scale) / 2;
  const halfH = (CARD_BASE_HEIGHT * scale) / 2;

  const left = proj.sx - halfW;
  const right = proj.sx + halfW;
  const top = proj.sy - halfH;
  const bottom = proj.sy + halfH;

  return (
    left >= horizontalMargin &&
    right <= viewportWidth - horizontalMargin &&
    top >= topMargin &&
    bottom <= viewportHeight - bottomMargin
  );
}

/**
 * Computes the bounding envelope of all nodes and crest at given camera parameters.
 */
export function computeVisualEnvelope(
  nodes: Point3D[],
  rotX: number,
  rotY: number,
  zoom: number,
  viewportWidth: number,
  viewportHeight: number,
  fitScale: number
): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const p of nodes) {
    const proj = project3D(p, rotX, rotY, zoom, viewportWidth, viewportHeight, fitScale);
    const scale = clamp(proj.scale, 0.65, 1.25);
    const halfW = (CARD_BASE_WIDTH * scale) / 2;
    const halfH = (CARD_BASE_HEIGHT * scale) / 2;

    minX = Math.min(minX, proj.sx - halfW);
    maxX = Math.max(maxX, proj.sx + halfW);
    minY = Math.min(minY, proj.sy - halfH);
    maxY = Math.max(maxY, proj.sy + halfH);
  }

  return { minX, maxX, minY, maxY };
}

/**
 * Computes 3D spatial layout for nodes, edges, and crest with responsive fit scaling.
 */
export function computeVansh3DLayout(
  nodes: LayoutVanshNode[],
  edges: LayoutVanshEdge[],
  crest: LayoutVanshCrest | null,
  viewportWidth = 360,
  viewportHeight = 520
): Vansh3DLayoutResult {
  const memberMap = new Map<string, KulFamilyMember>();
  for (const n of nodes) {
    memberMap.set(n.data.id, n.data);
  }

  // Identify self node (linked user or role 'self')
  const selfNode = nodes.find(
    (n) => n.data.linked_user_id || (n.data.role || '').toLowerCase().includes('self')
  );
  const selfId = selfNode ? selfNode.data.id : null;

  // Determine span of generations and columns
  let minCol = 0;
  let maxCol = 1;
  let minGen = 1;
  let maxGen = 1;

  if (nodes.length > 0) {
    minCol = Math.min(...nodes.map((n) => n.columnIndex));
    maxCol = Math.max(...nodes.map((n) => n.columnIndex));
    minGen = Math.min(...nodes.map((n) => n.generation));
    maxGen = Math.max(...nodes.map((n) => n.generation));
  }

  const nodes3D: Vansh3DNode[] = nodes.map((node) => {
    const branchType = classifyLineageBranch(node.data, memberMap, selfId);
    const selfGen = selfNode ? selfNode.generation : 3;

    // Y elevation tier: Ancestors higher (negative Y), descendants lower (positive Y)
    const yTier = (node.generation - selfGen) * 110;

    // X-Z spatial radial placement
    const colCenter = (maxCol + minCol) / 2;
    const colOffset = node.columnIndex - colCenter;
    const spreadX = colOffset * 110;

    let depthZ = 0;
    if (branchType === 'self') {
      depthZ = 40;
    } else if (branchType === 'matri') {
      depthZ = 25;
    } else if (branchType === 'child') {
      depthZ = 30;
    } else {
      depthZ = -25 + (node.columnIndex % 2) * 20;
    }

    return {
      ...node,
      p3d: { x: spreadX, y: yTier, z: depthZ },
      branchType,
    };
  });

  const node3DMap = new Map<string, Vansh3DNode>();
  for (const n of nodes3D) {
    node3DMap.set(n.data.id, n);
  }

  const edges3D: Vansh3DEdge[] = edges.map((edge) => {
    const fromNode = node3DMap.get(edge.fromId);
    const toNode = node3DMap.get(edge.toId);
    const p3dStart: Point3D = fromNode ? fromNode.p3d : { x: edge.startX, y: edge.startY, z: 0 };
    const p3dEnd: Point3D = toNode ? toNode.p3d : { x: edge.endX, y: edge.endY, z: 0 };

    return {
      ...edge,
      p3dStart,
      p3dEnd,
    };
  });

  const topGenY = nodes3D.length > 0 ? Math.min(...nodes3D.map((n) => n.p3d.y)) : 0;
  const crest3D: Vansh3DCrest | null = crest
    ? {
        ...crest,
        p3d: { x: 0, y: topGenY - 80, z: 0 },
      }
    : null;

  // Fit against every supported camera preset and the maximum user zoom. The
  // crest is a fixed-size overlay, so it must use its own envelope rather than
  // the projected member-card scale.
  let fitScale = 1.0;
  const fitPoints = nodes3D.map((node) => ({ point: node.p3d, kind: 'node' as const }));
  if (crest3D) fitPoints.push({ point: crest3D.p3d, kind: 'crest' });

  if (fitPoints.length > 0) {
    const cameraSamples = [
      ...Object.values(VIEW_PRESETS).map((preset) => ({ ...preset, zoom: MAX_ZOOM })),
      ...[-1.45, -0.7, 0, 0.7, 1.45].flatMap((rotX) =>
        [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((rotY) => ({
          rotX,
          rotY,
          zoom: MAX_ZOOM,
        }))
      ),
    ];
    const safeTop = TOP_HUD_HEIGHT + 8;
    const safeBottom = viewportHeight - BOTTOM_CONTROLS_HEIGHT - 8;
    const safeLeft = 12;
    const safeRight = viewportWidth - 12;

    const containsAtScale = (candidate: number): boolean => {
      for (const camera of cameraSamples) {
        for (const item of fitPoints) {
          const proj = project3D(
            item.point,
            camera.rotX,
            camera.rotY,
            camera.zoom,
            viewportWidth,
            viewportHeight,
            candidate
          );
          const halfW = item.kind === 'crest'
            ? CREST_BASE_WIDTH / 2
            : (CARD_BASE_WIDTH * clamp(proj.scale, 0.65, 1.25)) / 2;
          const halfH = item.kind === 'crest'
            ? CREST_BASE_HEIGHT / 2
            : (CARD_BASE_HEIGHT * clamp(proj.scale, 0.65, 1.25)) / 2;

          if (
            proj.sx - halfW < safeLeft ||
            proj.sx + halfW > safeRight ||
            proj.sy - halfH < safeTop ||
            proj.sy + halfH > safeBottom
          ) {
            return false;
          }
        }
      }
      return true;
    };

    // Binary search the largest scale that contains the full visual envelope.
    let low = 0.05;
    let high = 1.05;
    for (let i = 0; i < 12; i += 1) {
      const candidate = (low + high) / 2;
      if (containsAtScale(candidate)) low = candidate;
      else high = candidate;
    }
    fitScale = low;
  }

  return {
    nodes: nodes3D,
    edges: edges3D,
    crest: crest3D,
    fitScale,
  };
}
