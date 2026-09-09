import type { YatraCircuit, TempleSanctumNode } from './yatra-data';

export interface LayoutYatraNode {
  data: TempleSanctumNode;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  columnIndex: number;
}

export interface LayoutYatraEdge {
  fromId: string;
  toId: string;
  label?: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  pathD: string;
  labelX: number;
  labelY: number;
}

export interface YatraLayoutResult {
  nodes: LayoutYatraNode[];
  edges: LayoutYatraEdge[];
  canvasWidth: number;
  canvasHeight: number;
}

export interface YatraLayoutOptions {
  nodeWidth?: number;
  nodeHeight?: number;
  levelGap?: number;
  siblingGap?: number;
  paddingX?: number;
  paddingY?: number;
}

const DEFAULT_OPTIONS: Required<YatraLayoutOptions> = {
  nodeWidth: 170,
  nodeHeight: 115,
  levelGap: 100,
  siblingGap: 38,
  paddingX: 44,
  paddingY: 48,
};

/**
 * Computes a deterministic Top-Down pilgrimage route layout for a YatraCircuit.
 */
export function computeYatraLayout(
  yatra: YatraCircuit,
  customOptions?: YatraLayoutOptions
): YatraLayoutResult {
  const options: Required<YatraLayoutOptions> = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  const { nodeWidth, nodeHeight, levelGap, siblingGap, paddingX, paddingY } = options;

  const nodeMap = new Map<string, TempleSanctumNode>();
  yatra.temples.forEach((t) => nodeMap.set(t.id, t));

  const childrenMap = new Map<string, string[]>();
  const parentMap = new Map<string, string[]>();

  yatra.edges.forEach((edge) => {
    if (!childrenMap.has(edge.fromId)) childrenMap.set(edge.fromId, []);
    childrenMap.get(edge.fromId)!.push(edge.toId);

    if (!parentMap.has(edge.toId)) parentMap.set(edge.toId, []);
    parentMap.get(edge.toId)!.push(edge.fromId);
  });

  const nodeLevels = new Map<string, number>();
  const visited = new Set<string>();
  const queue: { id: string; level: number }[] = [];

  const rootId = yatra.rootNodeId || yatra.temples[0]?.id;
  if (rootId && nodeMap.has(rootId)) {
    queue.push({ id: rootId, level: 0 });
    nodeLevels.set(rootId, 0);
    visited.add(rootId);
  }

  yatra.temples.forEach((t) => {
    if (!parentMap.has(t.id) && t.id !== rootId) {
      queue.push({ id: t.id, level: 0 });
      nodeLevels.set(t.id, 0);
      visited.add(t.id);
    }
  });

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    const children = childrenMap.get(id) || [];
    children.forEach((childId) => {
      if (!visited.has(childId)) {
        visited.add(childId);
        const nextLevel = level + 1;
        nodeLevels.set(childId, nextLevel);
        queue.push({ id: childId, level: nextLevel });
      }
    });
  }

  yatra.temples.forEach((t) => {
    if (!nodeLevels.has(t.id)) {
      nodeLevels.set(t.id, 0);
    }
  });

  const levelsMap = new Map<number, string[]>();
  let maxLevel = 0;

  yatra.temples.forEach((t) => {
    const lvl = nodeLevels.get(t.id) ?? 0;
    if (lvl > maxLevel) maxLevel = lvl;
    if (!levelsMap.has(lvl)) levelsMap.set(lvl, []);
    levelsMap.get(lvl)!.push(t.id);
  });

  let maxRowWidth = 0;
  levelsMap.forEach((nodeIds) => {
    const rowWidth = nodeIds.length * nodeWidth + (nodeIds.length - 1) * siblingGap;
    if (rowWidth > maxRowWidth) maxRowWidth = rowWidth;
  });

  const canvasWidth = Math.max(maxRowWidth + paddingX * 2, 360);
  const canvasHeight = (maxLevel + 1) * nodeHeight + maxLevel * levelGap + paddingY * 2;

  const layoutNodes: LayoutYatraNode[] = [];
  const layoutNodePosMap = new Map<string, { x: number; y: number }>();

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

  const layoutEdges: LayoutYatraEdge[] = [];
  yatra.edges.forEach((edge) => {
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
