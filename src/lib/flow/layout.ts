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

export const flowNodeDimensions: Record<
  NormalizedFlowNode["type"],
  NodeDimension
> = {
  start: { width: 136, height: 136 },
  task: { width: 312, height: 130 },
  gateway: { width: 188, height: 188 },
  end: { width: 142, height: 142 },
};

type LayoutNode = Node<NormalizedFlowNode>;
type LayoutEdge = Edge<NormalizedFlowEdge>;

const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

export function getFlowNodeDimension(type: NormalizedFlowNode["type"]) {
  return flowNodeDimensions[type];
}

export function getFlowLayoutMetrics(
  document: NormalizedFlowDocument,
): FlowLayoutMetrics {
  const nodeCount = document.nodes.length;
  const compactFlow = nodeCount <= 4;
  const mediumFlow = nodeCount <= 6;

  return {
    ranksep: compactFlow ? 68 : mediumFlow ? 76 : 84,
    nodesep: compactFlow ? 28 : 36,
    fitPadding: compactFlow ? 0.09 : mediumFlow ? 0.105 : 0.12,
    minZoom: compactFlow ? 0.86 : 0.8,
    maxZoom: 1.28,
    canvasHeight: compactFlow ? 540 : mediumFlow ? 600 : 660,
  };
}

export function layoutFlowDocument(document: NormalizedFlowDocument) {
  const metrics = getFlowLayoutMetrics(document);

  graph.setGraph({
    rankdir: "TB",
    ranksep: metrics.ranksep,
    nodesep: metrics.nodesep,
    marginx: 16,
    marginy: 16,
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
