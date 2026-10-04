import type { KulFamilyMember, KulLineage } from './kul';

export interface LayoutVanshNode {
  data: KulFamilyMember;
  /** Parent link accepted by the normalized acyclic display graph. */
  resolvedParentId: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  generation: number;
  columnIndex: number;
  isRemembered: boolean;
  spouseId?: string | null;
}

export interface LayoutVanshEdge {
  id: string;
  fromId: string;
  toId: string;
  type: 'parent_child' | 'spouse' | 'crest_root';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathD: string;
}

export interface LayoutVanshCrest {
  x: number;
  y: number;
  width: number;
  height: number;
  gotra: string | null;
  pravara: string | null;
  kuldeviName: string | null;
  kuldevtaName: string | null;
  ancestralOrigin: string | null;
}

export interface VanshLayoutResult {
  nodes: LayoutVanshNode[];
  edges: LayoutVanshEdge[];
  crest: LayoutVanshCrest | null;
  canvasWidth: number;
  canvasHeight: number;
}

export interface VanshLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  levelGap?: number;
  siblingGap?: number;
  paddingX?: number;
  paddingY?: number;
}

/** Fits the complete tree into the measured viewport while reserving the
 * bottom control dock. Large trees can start below 0.12 scale; the user can
 * still zoom in, while small screens never clip the initial overview. */
export function computeVanshFitScale(
  canvasWidth: number,
  canvasHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  reservedBottom = 72,
  padding = 24
): number {
  if (
    !Number.isFinite(canvasWidth) || canvasWidth <= 0 ||
    !Number.isFinite(canvasHeight) || canvasHeight <= 0 ||
    !Number.isFinite(viewportWidth) || viewportWidth <= 0 ||
    !Number.isFinite(viewportHeight) || viewportHeight <= reservedBottom + padding * 2
  ) {
    return 1;
  }

  return Math.min(
    1,
    Math.max(0.01, (viewportWidth - padding * 2) / canvasWidth),
    Math.max(0.01, (viewportHeight - reservedBottom - padding * 2) / canvasHeight)
  );
}

const DEFAULT_OPTIONS: Required<VanshLayoutOptions> = {
  nodeWidth: 176,
  nodeHeight: 110,
  levelGap: 96,
  siblingGap: 28,
  paddingX: 48,
  paddingY: 36,
};

/** Returns parent candidates that cannot make the edited record its own ancestor. */
export function getEligibleParentIds(
  members: KulFamilyMember[],
  editingMemberId: string | null
): string[] {
  if (!editingMemberId) return members.map((member) => member.id);

  const childrenByParent = new Map<string, string[]>();
  for (const member of members) {
    if (!member.parent_id) continue;
    const children = childrenByParent.get(member.parent_id) ?? [];
    children.push(member.id);
    childrenByParent.set(member.parent_id, children);
  }

  const cannotBeParent = new Set<string>();
  const pending = [editingMemberId];
  while (pending.length > 0) {
    const current = pending.pop()!;
    if (cannotBeParent.has(current)) continue;
    cannotBeParent.add(current);
    pending.push(...(childrenByParent.get(current) ?? []));
  }

  return members
    .map((member) => member.id)
    .filter((memberId) => !cannotBeParent.has(memberId));
}

/**
 * Builds a smooth cubic Bezier SVG curve between (startX, startY) and (endX, endY)
 */
function buildCubicBezier(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  direction: 'vertical' | 'horizontal' = 'vertical'
): string {
  if (direction === 'vertical') {
    const deltaY = endY - startY;
    const cp1X = startX;
    const cp1Y = startY + deltaY * 0.45;
    const cp2X = endX;
    const cp2Y = startY + deltaY * 0.55;
    return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  } else {
    const deltaX = endX - startX;
    const cp1X = startX + deltaX * 0.5;
    const cp1Y = startY;
    const cp2X = startX + deltaX * 0.5;
    const cp2Y = endY;
    return `M ${startX.toFixed(1)} ${startY.toFixed(1)} C ${cp1X.toFixed(1)} ${cp1Y.toFixed(1)}, ${cp2X.toFixed(1)} ${cp2Y.toFixed(1)}, ${endX.toFixed(1)} ${endY.toFixed(1)}`;
  }
}

/**
 * Computes deterministic 2D spatial layout for KUL Vansh (Family Tree).
 */
export function computeVanshLayout(
  members: KulFamilyMember[],
  lineage?: KulLineage | null,
  customOptions?: VanshLayoutOptions
): VanshLayoutResult {
  const options: Required<VanshLayoutOptions> = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  if (!members || members.length === 0) {
    const crestWidth = 320;
    const crestHeight = 100;
    const hasCrest = !!(
      lineage?.gotra ||
      lineage?.pravara ||
      lineage?.kuldeviName ||
      lineage?.kuldevtaName ||
      lineage?.ancestralOrigin
    );

    return {
      nodes: [],
      edges: [],
      crest: hasCrest
        ? {
            x: options.paddingX,
            y: options.paddingY,
            width: crestWidth,
            height: crestHeight,
            gotra: lineage?.gotra ?? null,
            pravara: lineage?.pravara ?? null,
            kuldeviName: lineage?.kuldeviName ?? null,
            kuldevtaName: lineage?.kuldevtaName ?? null,
            ancestralOrigin: lineage?.ancestralOrigin ?? null,
          }
        : null,
      canvasWidth: hasCrest ? crestWidth + options.paddingX * 2 : 360,
      canvasHeight: hasCrest ? crestHeight + options.paddingY * 2 : 240,
    };
  }

  // 1. Normalize identities and build an acyclic parent graph. Profile data is
  // editable by family guardians, so the renderer must tolerate stale or
  // inconsistent parent/generation values without drawing backward edges.
  const uniqueMembers = Array.from(
    new Map(members.filter((member) => member.id).map((member) => [member.id, member])).values()
  );
  const memberMap = new Map<string, KulFamilyMember>();
  for (const m of uniqueMembers) {
    memberMap.set(m.id, m);
  }

  const parentById = new Map<string, string | null>();
  for (const member of uniqueMembers) {
    const candidate = member.parent_id;
    if (!candidate || candidate === member.id || !memberMap.has(candidate)) {
      parentById.set(member.id, null);
      continue;
    }

    // Accept links in stable input order and drop the link that would close a
    // cycle. This keeps the visible tree a forest even if old data is cyclic.
    const seen = new Set([member.id]);
    let ancestor: string | null = candidate;
    let closesCycle = false;
    while (ancestor) {
      if (seen.has(ancestor)) {
        closesCycle = true;
        break;
      }
      seen.add(ancestor);
      ancestor = parentById.get(ancestor) ?? null;
    }
    parentById.set(member.id, closesCycle ? null : candidate);
  }

  // Use declared generation as a baseline, but make every valid parent link
  // descend at least one tier. Resolve recursively so missing values work at
  // every depth rather than only for the first child generation.
  let minGen = Infinity;
  for (const m of uniqueMembers) {
    if (m.generation != null && Number.isInteger(m.generation) && m.generation >= 0) {
      minGen = Math.min(minGen, m.generation);
    }
  }
  if (!Number.isFinite(minGen)) {
    minGen = 1;
  }

  const declaredGenerationMap = new Map<string, number>();
  for (const member of uniqueMembers) {
    if (member.generation != null && Number.isInteger(member.generation) && member.generation >= 0) {
      declaredGenerationMap.set(member.id, Math.max(1, member.generation - minGen + 1));
    }
  }

  const memberGenMap = new Map<string, number>();
  const resolveGeneration = (memberId: string): number => {
    const cached = memberGenMap.get(memberId);
    if (cached != null) return cached;
    const declared = declaredGenerationMap.get(memberId) ?? 1;
    const parentId = parentById.get(memberId);
    const generation = parentId
      ? Math.max(declared, resolveGeneration(parentId) + 1)
      : declared;
    memberGenMap.set(memberId, generation);
    return generation;
  };
  for (const member of uniqueMembers) {
    resolveGeneration(member.id);
  }

  // Group by generation
  const generationGroups = new Map<number, KulFamilyMember[]>();
  for (const m of uniqueMembers) {
    const gen = memberGenMap.get(m.id) ?? 1;
    if (!generationGroups.has(gen)) {
      generationGroups.set(gen, []);
    }
    generationGroups.get(gen)!.push(m);
  }

  const sortedGens = Array.from(generationGroups.keys()).sort((a, b) => a - b);

  // 2. Order members within each generation: pair spouses next to each other, group siblings
  const orderedByGen = new Map<number, KulFamilyMember[]>();
  for (const gen of sortedGens) {
    const genMembers = generationGroups.get(gen)!;
    const ordered: KulFamilyMember[] = [];
    const placed = new Set<string>();

    for (const member of genMembers) {
      if (placed.has(member.id)) continue;

      ordered.push(member);
      placed.add(member.id);

      // If this member has a spouse in the same generation, place spouse adjacent
      if (member.spouse_id && !placed.has(member.spouse_id)) {
        const spouse = memberMap.get(member.spouse_id);
        if (spouse && (memberGenMap.get(spouse.id) ?? 1) === gen) {
          ordered.push(spouse);
          placed.add(spouse.id);
        }
      }
    }
    orderedByGen.set(gen, ordered);
  }

  // 3. Compute row widths and find max row width to center elements
  let maxCols = 1;
  for (const gen of sortedGens) {
    const count = orderedByGen.get(gen)?.length ?? 0;
    if (count > maxCols) maxCols = count;
  }

  const crestWidth = Math.max(340, options.nodeWidth * 1.5);
  const crestHeight = 110;
  const hasCrest = !!(
    lineage?.gotra ||
    lineage?.pravara ||
    lineage?.kuldeviName ||
    lineage?.kuldevtaName ||
    lineage?.ancestralOrigin
  );

  const totalContentWidth = Math.max(
    maxCols * options.nodeWidth + (maxCols - 1) * options.siblingGap,
    hasCrest ? crestWidth : 0
  );
  const canvasWidth = totalContentWidth + options.paddingX * 2;

  let currentY = options.paddingY;
  let layoutCrest: LayoutVanshCrest | null = null;

  if (hasCrest) {
    layoutCrest = {
      x: (canvasWidth - crestWidth) / 2,
      y: currentY,
      width: crestWidth,
      height: crestHeight,
      gotra: lineage?.gotra ?? null,
      pravara: lineage?.pravara ?? null,
      kuldeviName: lineage?.kuldeviName ?? null,
      kuldevtaName: lineage?.kuldevtaName ?? null,
      ancestralOrigin: lineage?.ancestralOrigin ?? null,
    };
    currentY += crestHeight + options.levelGap * 0.8;
  }

  // 4. Place nodes for each generation
  const nodes: LayoutVanshNode[] = [];
  const nodePositionMap = new Map<string, LayoutVanshNode>();

  for (const gen of sortedGens) {
    const genMembers = orderedByGen.get(gen)!;
    const count = genMembers.length;
    const rowWidth = count * options.nodeWidth + (count - 1) * options.siblingGap;
    const startX = (canvasWidth - rowWidth) / 2;

    for (let i = 0; i < count; i++) {
      const member = genMembers[i];
      const nodeX = startX + i * (options.nodeWidth + options.siblingGap);
      const nodeY = currentY;

      const layoutNode: LayoutVanshNode = {
        data: member,
        resolvedParentId: parentById.get(member.id) ?? null,
        x: nodeX,
        y: nodeY,
        width: options.nodeWidth,
        height: options.nodeHeight,
        generation: gen,
        columnIndex: i,
        isRemembered: !member.is_alive,
        spouseId: member.spouse_id,
      };

      nodes.push(layoutNode);
      nodePositionMap.set(member.id, layoutNode);
    }

    currentY += options.nodeHeight + options.levelGap;
  }

  const canvasHeight = currentY - options.levelGap + options.paddingY;

  // 5. Generate Edges (Parent-Child, Spouse, and Crest-Root links)
  const edges: LayoutVanshEdge[] = [];

  // Connect Crest to earliest generation roots if crest exists
  if (layoutCrest && sortedGens.length > 0) {
    const topMembers = uniqueMembers.filter((member) => !parentById.get(member.id));
    for (const member of topMembers) {
      const targetNode = nodePositionMap.get(member.id);
      if (targetNode) {
        const startX = layoutCrest.x + layoutCrest.width / 2;
        const startY = layoutCrest.y + layoutCrest.height;
        const endX = targetNode.x + targetNode.width / 2;
        const endY = targetNode.y;

        edges.push({
          id: `crest->${member.id}`,
          fromId: 'crest',
          toId: member.id,
          type: 'crest_root',
          startX,
          startY,
          endX,
          endY,
          pathD: buildCubicBezier(startX, startY, endX, endY, 'vertical'),
        });
      }
    }
  }

  // Connect parent -> child and spouse pairs
  const processedSpousePairs = new Set<string>();

  for (const node of nodes) {
    const member = node.data;

    // Parent -> Child link
    const parentId = parentById.get(member.id);
    if (parentId && nodePositionMap.has(parentId)) {
      const parentNode = nodePositionMap.get(parentId)!;
      const startX = parentNode.x + parentNode.width / 2;
      const startY = parentNode.y + parentNode.height;
      const endX = node.x + node.width / 2;
      const endY = node.y;

      edges.push({
        id: `${parentNode.data.id}->${member.id}`,
        fromId: parentNode.data.id,
        toId: member.id,
        type: 'parent_child',
        startX,
        startY,
        endX,
        endY,
        pathD: buildCubicBezier(startX, startY, endX, endY, 'vertical'),
      });
    }

    // Spouse link (horizontal)
    if (member.spouse_id && nodePositionMap.has(member.spouse_id)) {
      const pairKey = [member.id, member.spouse_id].sort().join('<->');
      if (!processedSpousePairs.has(pairKey)) {
        processedSpousePairs.add(pairKey);
        const spouseNode = nodePositionMap.get(member.spouse_id)!;

        // Draw horizontal line between adjacent borders
        const isLeft = node.x < spouseNode.x;
        const startX = isLeft ? node.x + node.width : node.x;
        const startY = node.y + node.height / 2;
        const endX = isLeft ? spouseNode.x : spouseNode.x + spouseNode.width;
        const endY = spouseNode.y + spouseNode.height / 2;

        edges.push({
          id: `spouse:${pairKey}`,
          fromId: member.id,
          toId: member.spouse_id,
          type: 'spouse',
          startX,
          startY,
          endX,
          endY,
          pathD: `M ${startX.toFixed(1)} ${startY.toFixed(1)} L ${endX.toFixed(1)} ${endY.toFixed(1)}`,
        });
      }
    }
  }

  return {
    nodes,
    edges,
    crest: layoutCrest,
    canvasWidth,
    canvasHeight,
  };
}
