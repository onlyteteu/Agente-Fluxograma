"use client";

import { useEffect } from "react";
import dagre from "dagre";
import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useNodesInitialized,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import type {
  NormalizedFlowDocument,
  NormalizedFlowNode,
} from "@/lib/flow/types";

type FlowNodeData = NormalizedFlowNode;

type NodeDimension = {
  width: number;
  height: number;
};

type LayoutMetrics = {
  ranksep: number;
  nodesep: number;
  edgesep: number;
  branchSpread: number;
  branchOffsetY: number;
  fitPadding: number;
  minZoom: number;
  maxZoom: number;
  canvasHeight: number;
};

const nodeDimensions: Record<FlowNodeData["type"], NodeDimension> = {
  start: { width: 136, height: 136 },
  task: { width: 296, height: 138 },
  gateway: { width: 196, height: 196 },
  end: { width: 142, height: 142 },
};

const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const taskPalette: Record<FlowNodeData["tone"], string> = {
  accent:
    "border-[rgba(201,111,59,0.28)] bg-[linear-gradient(180deg,rgba(255,248,242,0.98),rgba(255,255,255,0.92))] text-[#2a211c]",
  neutral:
    "border-[rgba(28,27,25,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,247,240,0.94))] text-[#1f1d1a]",
  success:
    "border-[rgba(31,122,99,0.22)] bg-[linear-gradient(180deg,rgba(241,252,248,0.98),rgba(255,255,255,0.92))] text-[#17352d]",
  dark: "border-[rgba(16,14,12,0.12)] bg-[linear-gradient(180deg,#2e2822,#171411)] text-[#f6efe2]",
};

const eventPalette: Record<"start" | "end", string> = {
  start:
    "border-[rgba(201,111,59,0.32)] bg-[radial-gradient(circle_at_30%_30%,rgba(255,249,242,1),rgba(255,242,231,0.98)_52%,rgba(250,228,213,0.96))] text-[#8f4a22]",
  end: "border-[rgba(16,14,12,0.16)] bg-[radial-gradient(circle_at_30%_30%,rgba(73,64,54,0.96),rgba(31,28,24,0.98)_58%,rgba(19,17,14,1))] text-[#f8efe1]",
};

function getNodeDimension(type: FlowNodeData["type"]) {
  return nodeDimensions[type];
}

function getLayoutMetrics(document: NormalizedFlowDocument): LayoutMetrics {
  const nodeCount = document.nodes.length;
  const branchCount = document.nodes.filter((node) => node.type === "gateway").length;
  const compactFlow = nodeCount <= 4;
  const mediumFlow = nodeCount <= 6;

  return {
    ranksep: compactFlow ? 56 : mediumFlow ? 64 : 72,
    nodesep: compactFlow ? 22 : 28,
    edgesep: 10,
    branchSpread: branchCount > 0 ? (compactFlow ? 132 : 148) : 0,
    branchOffsetY: compactFlow ? 72 : 84,
    fitPadding: compactFlow ? 0.08 : mediumFlow ? 0.1 : 0.11,
    minZoom: compactFlow ? 0.88 : 0.8,
    maxZoom: 1.32,
    canvasHeight: compactFlow ? 520 : mediumFlow ? 590 : 650,
  };
}

function distributeGatewayBranches(
  nodes: Node<FlowNodeData>[],
  edges: NormalizedFlowDocument["edges"],
  metrics: LayoutMetrics,
) {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));

  for (const gatewayNode of nodes.filter((node) => node.data.type === "gateway")) {
    const gatewayDimension = getNodeDimension(gatewayNode.data.type);
    const gatewayCenterX = gatewayNode.position.x + gatewayDimension.width / 2;
    const gatewayBottomY = gatewayNode.position.y + gatewayDimension.height;

    const outgoingEdges = edges.filter((edge) => edge.source === gatewayNode.id);
    const yesEdge = outgoingEdges.find((edge) => edge.label === "Sim");
    const noEdge = outgoingEdges.find((edge) => edge.label === "Nao");

    const yesNode = yesEdge ? nodesById.get(yesEdge.target) : undefined;
    const noNode = noEdge ? nodesById.get(noEdge.target) : undefined;

    if (yesNode && noNode && yesNode.id !== noNode.id) {
      const yesDimension = getNodeDimension(yesNode.data.type);
      const noDimension = getNodeDimension(noNode.data.type);
      const branchTopY = gatewayBottomY + metrics.branchOffsetY;

      yesNode.position = {
        x: gatewayCenterX + metrics.branchSpread / 2 - yesDimension.width / 2,
        y: Math.max(yesNode.position.y, branchTopY),
      };

      noNode.position = {
        x: gatewayCenterX - metrics.branchSpread / 2 - noDimension.width / 2,
        y: Math.max(noNode.position.y, branchTopY),
      };
      continue;
    }

    if (yesNode) {
      const yesDimension = getNodeDimension(yesNode.data.type);
      yesNode.position = {
        x: gatewayCenterX - yesDimension.width / 2,
        y: Math.max(yesNode.position.y, gatewayBottomY + metrics.branchOffsetY - 12),
      };
    }

    if (noNode) {
      const noDimension = getNodeDimension(noNode.data.type);
      noNode.position = {
        x: gatewayCenterX - noDimension.width / 2,
        y: Math.max(noNode.position.y, gatewayBottomY + metrics.branchOffsetY - 12),
      };
    }
  }
}

function layoutElements(document: NormalizedFlowDocument) {
  const metrics = getLayoutMetrics(document);

  graph.setGraph({
    rankdir: "TB",
    ranksep: metrics.ranksep,
    nodesep: metrics.nodesep,
    edgesep: metrics.edgesep,
    marginx: 12,
    marginy: 12,
    ranker: "tight-tree",
    acyclicer: "greedy",
  });

  document.nodes.forEach((node) => {
    const dimension = getNodeDimension(node.type);

    graph.setNode(node.id, {
      width: dimension.width,
      height: dimension.height,
    });
  });

  document.edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target, {
      weight: edge.label ? 4 : 6,
      minlen: edge.label ? 1 : 1,
    });
  });

  dagre.layout(graph);

  const rawNodes: Node<FlowNodeData>[] = document.nodes.map((node) => {
    const position = graph.node(node.id);
    const dimension = getNodeDimension(node.type);

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

  distributeGatewayBranches(rawNodes, document.edges, metrics);

  const minX = Math.min(
    ...rawNodes.map((node) => node.position.x),
  );
  const maxX = Math.max(
    ...rawNodes.map((node) => node.position.x + getNodeDimension(node.data.type).width),
  );
  const minY = Math.min(
    ...rawNodes.map((node) => node.position.y),
  );
  const maxY = Math.max(
    ...rawNodes.map((node) => node.position.y + getNodeDimension(node.data.type).height),
  );
  const offsetX = (minX + maxX) / 2;
  const offsetY = (minY + maxY) / 2;

  const nodes: Node<FlowNodeData>[] = rawNodes.map((node) => ({
    ...node,
    position: {
      x: node.position.x - offsetX,
      y: node.position.y - offsetY,
    },
  }));

  const edges: Edge[] = document.edges.map((edge) => ({
    ...edge,
    animated: !edge.label,
    type: "smoothstep",
    style: {
      stroke: edge.label ? "#1f7a63" : "#73685d",
      strokeWidth: edge.label ? 2.6 : 2.2,
    },
    labelStyle: {
      fill: "#2d2925",
      fontWeight: 700,
      fontSize: 12,
      letterSpacing: 0.2,
    },
    labelBgStyle: {
      fill: "#fffaf0",
      fillOpacity: 0.98,
      stroke: "rgba(28,27,25,0.08)",
      strokeWidth: 1,
    },
    labelBgBorderRadius: 18,
    labelBgPadding: [12, 7] as [number, number],
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 22,
      height: 22,
      color: edge.label ? "#1f7a63" : "#73685d",
    },
  }));

  return { nodes, edges, metrics };
}

function BaseHandles({ tone }: { tone: "start" | "task" | "gateway" | "end" }) {
  const handleColor =
    tone === "start"
      ? "#c96f3b"
      : tone === "gateway"
        ? "#1f7a63"
        : tone === "end"
          ? "#2e2822"
          : "#8b7c6c";

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
        style={{ backgroundColor: handleColor }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-white !shadow-[0_4px_12px_rgba(0,0,0,0.12)]"
        style={{ backgroundColor: handleColor }}
      />
    </>
  );
}

function StartNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative flex h-[136px] w-[136px] items-center justify-center">
      <BaseHandles tone="start" />
      <div
        className={`flex h-full w-full items-center justify-center rounded-full border-2 shadow-[0_24px_60px_rgba(46,35,23,0.16)] ${eventPalette.start}`}
      >
        <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full border border-white/60 bg-white/45 text-center backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-65">
            Inicio
          </p>
          <p className="mt-2 max-w-[72px] text-[15px] leading-5 font-semibold tracking-[-0.03em]">
            {data.label}
          </p>
        </div>
      </div>
    </div>
  );
}

function EndNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative flex h-[142px] w-[142px] items-center justify-center">
      <BaseHandles tone="end" />
      <div
        className={`flex h-full w-full items-center justify-center rounded-full border-[4px] shadow-[0_28px_60px_rgba(20,16,12,0.22)] ${eventPalette.end}`}
      >
        <div className="flex h-[104px] w-[104px] flex-col items-center justify-center rounded-full border border-white/12 bg-black/10 text-center backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/58">
            Fim
          </p>
          <p className="mt-2 max-w-[76px] text-[15px] leading-5 font-semibold tracking-[-0.03em] text-white">
            {data.label}
          </p>
        </div>
      </div>
    </div>
  );
}

function TaskNode({ data }: { data: FlowNodeData }) {
  return (
    <div
      className={`relative w-[296px] rounded-[30px] border p-5 shadow-[0_24px_60px_rgba(46,35,23,0.14)] backdrop-blur ${taskPalette[data.tone]}`}
    >
      <BaseHandles tone="task" />
      <div className="pointer-events-none absolute left-4 top-4 h-10 w-10 rounded-xl border border-current/10 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
      <div className="pointer-events-none absolute left-[22px] top-[24px] h-3 w-4 rounded-sm border border-current/35" />
      <div className="pointer-events-none absolute left-[22px] top-[31px] h-px w-12 bg-current/18" />

      <div className="ml-14">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-65">
          {data.eyebrow}
        </p>
        <h3 className="mt-3 text-[22px] leading-7 font-semibold tracking-[-0.04em]">
          {data.label}
        </h3>
        <p className="mt-4 text-[14px] leading-6 opacity-80">{data.description}</p>
      </div>
    </div>
  );
}

function GatewayNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative flex h-[196px] w-[196px] items-center justify-center">
      <BaseHandles tone="gateway" />
      <div className="absolute h-[154px] w-[154px] rotate-45 rounded-[30px] border border-[rgba(31,122,99,0.28)] bg-[linear-gradient(180deg,rgba(244,252,248,0.98),rgba(255,255,255,0.92))] shadow-[0_24px_60px_rgba(24,77,63,0.14)]" />
      <div className="absolute h-[112px] w-[112px] rotate-45 rounded-[22px] border border-[rgba(31,122,99,0.12)] bg-white/72 backdrop-blur-sm" />
      <div className="relative z-10 flex max-w-[126px] flex-col items-center text-center text-[#17352d]">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-65">
          Decisao
        </p>
        <p className="mt-3 text-[18px] leading-6 font-semibold tracking-[-0.04em]">
          {data.label}
        </p>
      </div>
    </div>
  );
}

function FlowCardNode({ data }: NodeProps<Node<FlowNodeData>>) {
  if (data.type === "start") {
    return <StartNode data={data} />;
  }

  if (data.type === "end") {
    return <EndNode data={data} />;
  }

  if (data.type === "gateway") {
    return <GatewayNode data={data} />;
  }

  return <TaskNode data={data} />;
}

const nodeTypes: NodeTypes = {
  flowCard: FlowCardNode,
};

function FlowViewportController({
  flowKey,
  metrics,
}: {
  flowKey: string;
  metrics: LayoutMetrics;
}) {
  const initialized = useNodesInitialized();
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!initialized) {
      return;
    }

    void fitView({
      padding: metrics.fitPadding,
      duration: 280,
      minZoom: metrics.minZoom,
      maxZoom: metrics.maxZoom,
    });
  }, [fitView, flowKey, initialized, metrics]);

  return null;
}

function FlowCanvas({ document }: { document: NormalizedFlowDocument }) {
  const { nodes, edges, metrics } = layoutElements(document);
  const flowKey = `${nodes
    .map((node) => `${node.id}:${node.data.label}:${node.data.type}`)
    .join("|")}::${edges
    .map((edge) => `${edge.id}:${edge.label ?? ""}`)
    .join("|")}`;

  return (
    <div
      className="w-full overflow-hidden rounded-[2rem] border border-[rgba(28,27,25,0.08)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(252,246,237,0.95))] shadow-[0_34px_120px_rgba(38,32,24,0.16)]"
      style={{ height: metrics.canvasHeight }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{
          padding: metrics.fitPadding,
          minZoom: metrics.minZoom,
          maxZoom: metrics.maxZoom,
        }}
        minZoom={0.72}
        maxZoom={metrics.maxZoom}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        panOnScroll
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        className="bg-transparent"
      >
        <FlowViewportController flowKey={flowKey} metrics={metrics} />
        <Background
          color="rgba(120, 105, 91, 0.14)"
          gap={22}
          size={1.1}
          variant={BackgroundVariant.Dots}
        />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(244, 239, 228, 0.72)"
          nodeColor={(node) => {
            if ("type" in node && node.type === "gateway") {
              return "#1f7a63";
            }

            return "#c96f3b";
          }}
          className="!bottom-5 !right-5 !h-28 !w-40 !rounded-2xl !border !border-[rgba(28,27,25,0.08)] !bg-[#fffaf2]/95 !shadow-[0_20px_40px_rgba(38,32,24,0.14)]"
        />
        <Controls
          showInteractive={false}
          className="!bottom-5 !left-5 !rounded-2xl !border !border-[rgba(28,27,25,0.08)] !bg-[#fffaf2]/95 !shadow-[0_20px_40px_rgba(38,32,24,0.14)]"
        />
      </ReactFlow>
    </div>
  );
}

export function FlowPreview({ document }: { document: NormalizedFlowDocument }) {
  return (
    <ReactFlowProvider>
      <FlowCanvas document={document} />
    </ReactFlowProvider>
  );
}
