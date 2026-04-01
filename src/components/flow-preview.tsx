"use client";

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
  type Edge,
  type Node,
  type NodeProps,
  type NodeTypes,
} from "@xyflow/react";
import { mockFlowDocument } from "@/lib/flow/mock";
import type {
  NormalizedFlowDocument,
  NormalizedFlowNode,
} from "@/lib/flow/types";

type FlowNodeData = NormalizedFlowNode;

const NODE_WIDTH = 280;
const NODE_HEIGHT = 152;

const graph = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

const nodePalette: Record<FlowNodeData["tone"], string> = {
  accent:
    "border-[rgba(201,111,59,0.28)] bg-[linear-gradient(180deg,rgba(255,248,242,0.98),rgba(255,255,255,0.92))] text-[#2a211c]",
  neutral:
    "border-[rgba(28,27,25,0.08)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(251,247,240,0.94))] text-[#1f1d1a]",
  success:
    "border-[rgba(31,122,99,0.22)] bg-[linear-gradient(180deg,rgba(241,252,248,0.98),rgba(255,255,255,0.92))] text-[#17352d]",
  dark: "border-[rgba(16,14,12,0.12)] bg-[linear-gradient(180deg,#2e2822,#171411)] text-[#f6efe2]",
};

function layoutElements(document: NormalizedFlowDocument) {
  graph.setGraph({
    rankdir: "TB",
    ranksep: 110,
    nodesep: 54,
    marginx: 28,
    marginy: 28,
  });

  document.nodes.forEach((node) => {
    graph.setNode(node.id, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  document.edges.forEach((edge) => {
    graph.setEdge(edge.source, edge.target);
  });

  dagre.layout(graph);

  const nodes: Node<FlowNodeData>[] = document.nodes.map((node) => {
    const position = graph.node(node.id);

    return {
      ...node,
      sourcePosition: Position.Bottom,
      targetPosition: Position.Top,
      type: "flowCard",
      data: node,
      position: {
        x: position.x - NODE_WIDTH / 2,
        y: position.y - NODE_HEIGHT / 2,
      },
    };
  });

  const edges: Edge[] = document.edges.map((edge) => ({
    ...edge,
    animated: edge.id !== "render-editing",
    style: {
      stroke: edge.label ? "#1f7a63" : "#7b6f62",
      strokeWidth: edge.label ? 2.4 : 2,
    },
    labelStyle: {
      fill: "#3b352f",
      fontWeight: 700,
      fontSize: 12,
    },
    labelBgStyle: {
      fill: "#fffaf0",
      fillOpacity: 0.96,
    },
    labelBgBorderRadius: 16,
    labelBgPadding: [10, 6] as [number, number],
  }));

  return { nodes, edges };
}

function FlowCardNode({ data }: NodeProps<Node<FlowNodeData>>) {
  return (
    <div
      className={`relative w-[280px] rounded-[28px] border p-5 shadow-[0_24px_60px_rgba(46,35,23,0.14)] backdrop-blur ${nodePalette[data.tone]}`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#c96f3b]"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !border-2 !border-white !bg-[#1f7a63]"
      />

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-65">
            {data.eyebrow}
          </p>
          <h3 className="mt-3 text-[22px] leading-7 font-semibold tracking-[-0.04em]">
            {data.label}
          </h3>
        </div>
        <span className="mt-1 h-3.5 w-3.5 rounded-full bg-current opacity-70" />
      </div>

      <p className="text-[14px] leading-6 opacity-80">{data.description}</p>
    </div>
  );
}

const nodeTypes: NodeTypes = {
  flowCard: FlowCardNode,
};

function FlowCanvas() {
  const { nodes, edges } = layoutElements(mockFlowDocument);

  return (
    <div className="h-[720px] w-full overflow-hidden rounded-[2rem] border border-[rgba(28,27,25,0.08)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(252,246,237,0.95))] shadow-[0_34px_120px_rgba(38,32,24,0.16)]">
      <ReactFlow
        defaultNodes={nodes}
        defaultEdges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.16, minZoom: 0.8 }}
        minZoom={0.6}
        maxZoom={1.4}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        panOnScroll
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        className="bg-transparent"
        defaultEdgeOptions={{
          type: "smoothstep",
          markerEnd: { type: MarkerType.ArrowClosed },
        }}
      >
        <Background
          color="rgba(120, 105, 91, 0.16)"
          gap={28}
          size={1.2}
          variant={BackgroundVariant.Dots}
        />
        <MiniMap
          pannable
          zoomable
          maskColor="rgba(244, 239, 228, 0.72)"
          nodeColor="#c96f3b"
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

export function FlowPreview() {
  return (
    <ReactFlowProvider>
      <FlowCanvas />
    </ReactFlowProvider>
  );
}
