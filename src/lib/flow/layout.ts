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
  start: { width: 146, height: 146 },
  task: { width: 336, height: 144 },
  gateway: { width: 204, height: 204 },
  end: { width: 150, height: 150 },
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
    ranksep: compactFlow ? 74 : mediumFlow ? 84 : 98,
    nodesep: compactFlow ? 30 : 38,
    fitPadding: compactFlow ? 0.045 : mediumFlow ? 0.06 : 0.085,
    minZoom: compactFlow ? 0.94 : mediumFlow ? 0.88 : 0.8,
    maxZoom: compactFlow ? 1.56 : mediumFlow ? 1.48 : 1.36,
    canvasHeight: compactFlow ? 560 : mediumFlow ? 630 : 740,
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
