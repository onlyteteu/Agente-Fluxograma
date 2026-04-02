import dagre from "dagre";
import { Position, type Edge, type Node } from "@xyflow/react";
import type {
  NormalizedFlowDocument,
  NormalizedFlowEdge,
  NormalizedFlowNode,
} from "./types";

export type FlowLayoutMetrics = {
  ranksep: number;
  nodesep: number;
  fitPadding: number;
  minZoom: number;
  maxZoom: number;
  canvasHeight: number;
};

type NodeDimension = {
  width: number;
  height: number;
};

type NodeSurfaceRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const flowNodeDimensions: Record<
  NormalizedFlowNode["type"],
  NodeDimension
> = {
  start: { width: 174, height: 174 },
  task: { width: 376, height: 190 },
  gateway: { width: 232, height: 236 },
  end: { width: 178, height: 178 },
};

const flowNodeSurfaceRects: Record<
  NormalizedFlowNode["type"],
  NodeSurfaceRect
> = {
  start: { x: 12, y: 12, width: 150, height: 150 },
  task: { x: 12, y: 10, width: 352, height: 162 },
  gateway: { x: 10, y: 12, width: 212, height: 212 },
  end: { x: 12, y: 12, width: 154, height: 154 },
};

const flowNodeHandleInsets: Record<NormalizedFlowNode["type"], number> = {
  start: 12,
  task: 12,
  gateway: 12,
  end: 12,
};

type LayoutNode = Node<NormalizedFlowNode>;
type LayoutEdge = Edge<NormalizedFlowEdge>;

const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

export function getFlowNodeDimension(type: NormalizedFlowNode["type"]) {
  return flowNodeDimensions[type];
}

export function getFlowNodeSurfaceRect(type: NormalizedFlowNode["type"]) {
  return flowNodeSurfaceRects[type];
}

export function getFlowNodeHandleInset(type: NormalizedFlowNode["type"]) {
  return flowNodeHandleInsets[type];
}

export function getFlowLayoutMetrics(
  document: NormalizedFlowDocument,
): FlowLayoutMetrics {
  const nodeCount = document.nodes.length;
  const compactFlow = nodeCount <= 4;
  const mediumFlow = nodeCount <= 6;

  return {
    ranksep: compactFlow ? 82 : mediumFlow ? 92 : 108,
    nodesep: compactFlow ? 34 : 42,
    fitPadding: compactFlow ? 0.055 : mediumFlow ? 0.07 : 0.09,
    minZoom: compactFlow ? 0.98 : mediumFlow ? 0.92 : 0.84,
    maxZoom: compactFlow ? 1.52 : mediumFlow ? 1.44 : 1.3,
    canvasHeight: compactFlow ? 590 : mediumFlow ? 680 : 780,
  };
}

export function layoutFlowDocument(document: NormalizedFlowDocument) {
  const metrics = getFlowLayoutMetrics(document);

  graph.setGraph({
    rankdir: "TB",
    ranksep: metrics.ranksep,
    nodesep: metrics.nodesep,
    marginx: 24,
    marginy: 28,
    ranker: "network-simplex",
    acyclicer: "greedy",
  });

  document.nodes.forEach((node) => {
    const dimension = getFlowNodeDimension(node.type);

    graph.setNode(node.id, {
      width: dimension.width,
      height: dimension.height,
    });
  });

  document.edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target, {
      weight: edge.label ? 3 : 6,
      minlen: 1,
    });
  });

  dagre.layout(graph);

  const rawNodes: LayoutNode[] = document.nodes.map((node) => {
    const position = graph.node(node.id);
    const dimension = getFlowNodeDimension(node.type);

    return {
      ...node,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      type: "flowCard",
      data: node,
      position: {
        x: position.x - dimension.width / 2,
        y: position.y - dimension.height / 2,
      },
    };
  });

  const minX = Math.min(...rawNodes.map((node) => node.position.x));
  const maxX = Math.max(
    ...rawNodes.map(
      (node) => node.position.x + getFlowNodeDimension(node.data.type).width,
    ),
  );
  const minY = Math.min(...rawNodes.map((node) => node.position.y));
  const maxY = Math.max(
    ...rawNodes.map(
      (node) => node.position.y + getFlowNodeDimension(node.data.type).height,
    ),
  );
  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;

  const nodes: LayoutNode[] = rawNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - offsetX,
      y: node.position.y - offsetY,
    },
  }));

  return {
    nodes,
    edges: document.edges as LayoutEdge[],
    metrics,
  };
}
