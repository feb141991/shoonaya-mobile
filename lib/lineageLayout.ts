import { Lineage, LineageNode } from './lineage-data';

export interface LayoutNode {
  data: LineageNode;
  x: number; // center x
  y: number; // center y
  width: number;
  height: number;
  level: number;
  columnIndex: number;
}

export interface LayoutEdge {
  fromId: string;
  toId: string;
  label?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathD: string; // SVG path string
  labelX: number;
  labelY: number;
}

export interface LayoutResult {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface LayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  levelGap?: number;
  siblingGap?: number;
  paddingX?: number;
  paddingY?: number;
}

const DEFAULT_OPTIONS: Required<LayoutOptions> = {
  nodeWidth: 160,
  nodeHeight: 110,
  levelGap: 100,
  siblingGap: 36,
  paddingX: 40,
  paddingY: 48,
};

/**
 * Computes a deterministic Top-Down (Graph TD) layout for a Lineage.
 * Uses hierarchical BFS level assignment with centered horizontal spacing.
 */
export function computeLineageLayout(
  lineage: Lineage,
  customOptions?: LayoutOptions
): LayoutResult {
  const options: Required<LayoutOptions> = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  const { nodeWidth, nodeHeight, levelGap, siblingGap, paddingX, paddingY } = options;

  const nodeMap = new Map<string, LineageNode>();
  lineage.nodes.forEach((n) => nodeMap.set(n.id, n));

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();

  lineage.edges.forEach((edge) => {
    if (!childrenMap.has(edge.fromId)) childrenMap.set(edge.fromId, []);
    childrenMap.get(edge.fromId)!.push(edge.toId);

    if (!parentMap.has(edge.toId)) parentMap.set(edge.toId, []);
    parentMap.get(edge.toId)!.push(edge.fromId);
  });

  // Assign BFS levels starting from rootNodeId or orphan roots
  const nodeLevels = new Map<string, number>();
  const queue: { id: string; level: number }[] = [];

  const rootId = lineage.rootNodeId || lineage.nodes[0]?.id;
  if (rootId && nodeMap.has(rootId)) {
    queue.push({ id: rootId, level: 0 });
    nodeLevels.set(rootId, 0);
  }

  // Also queue any other node with no incoming parent edges
  lineage.nodes.forEach((n) => {
    if (!parentMap.has(n.id) && n.id !== rootId) {
      queue.push({ id: n.id, level: 0 });
      nodeLevels.set(n.id, 0);
    }
  });

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const children = childrenMap.get(id) || [];
    children.forEach((childId) => {
      const existingLevel = nodeLevels.get(childId);
      const nextLevel = level + 1;
      if (existingLevel === undefined || nextLevel > existingLevel) {
        nodeLevels.set(childId, nextLevel);
        queue.push({ id: childId, level: nextLevel });
      }
    });
  }

  // Group nodes by assigned level
  const levelsMap = new Map<number, string[]>();
  let maxLevel = 0;

  lineage.nodes.forEach((n) => {
    const lvl = nodeLevels.get(n.id) ?? 0;
    if (lvl > maxLevel) maxLevel = lvl;
    if (!levelsMap.has(lvl)) levelsMap.set(lvl, []);
    levelsMap.get(lvl)!.push(n.id);
  });

  // Calculate max row width to center all levels
  let maxRowWidth = 0;
  levelsMap.forEach((nodeIds) => {
    const rowWidth = nodeIds.length * nodeWidth + (nodeIds.length - 1) * siblingGap;
    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth;
  });

  const canvasWidth = Math.max(maxRowWidth + paddingX * 2, 360);
  const canvasHeight = (maxLevel + 1) * nodeHeight + maxLevel * levelGap + paddingY * 2;

  const layoutNodes: LayoutNode[] = [];
  const layoutNodePosMap = new Map<string, { x: number; y: number }>();

  // Place nodes on each level
  for (let lvl = 0; lvl <= maxLevel; lvl++) {
    const nodeIds = levelsMap.get(lvl) || [];
    const count = nodeIds.length;
    const rowWidth = count * nodeWidth + (count - 1) * siblingGap;
    const startX = (canvasWidth - rowWidth) / 2 + nodeWidth / 2;
    const y = paddingY + lvl * (nodeHeight + levelGap) + nodeHeight / 2;

    nodeIds.forEach((id, colIdx) => {
      const data = nodeMap.get(id)!;
      const x = startX + colIdx * (nodeWidth + siblingGap);
      layoutNodes.push({
        data,
        x,
        y,
        width: nodeWidth,
        height: nodeHeight,
        level: lvl,
        columnIndex: colIdx,
      });
      layoutNodePosMap.set(id, { x, y });
    });
  }

  // Compute edges with smooth cubic Bezier curves
  const layoutEdges: LayoutEdge[] = [];
  lineage.edges.forEach((edge) => {
    const fromPos = layoutNodePosMap.get(edge.fromId);
    const toPos = layoutNodePosMap.get(edge.toId);
    if (!fromPos || !toPos) return;

    const startX = fromPos.x;
    const startY = fromPos.y + nodeHeight / 2;
    const endX = toPos.x;
    const endY = toPos.y - nodeHeight / 2;

    const deltaY = endY - startY;
    const controlPointOffset = Math.max(deltaY * 0.5, 20);

    const cp1X = startX;
    const cp1Y = startY + controlPointOffset;
    const cp2X = endX;
    const cp2Y = endY - controlPointOffset;

    const pathD = `M ${startX} ${startY} C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${endX} ${endY}`;

    layoutEdges.push({
      fromId: edge.fromId,
      toId: edge.toId,
      label: edge.label,
      startX,
      startY,
      endX,
      endY,
      pathD,
      labelX: (startX + endX) / 2,
      labelY: (startY + endY) / 2 - 6,
    });
  });

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    canvasWidth,
    canvasHeight,
  };
}
