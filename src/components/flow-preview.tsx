"use client";

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
import { FLOW_PREVIEW_EXPORT_ID } from "@/lib/export/flow-export";
import { layoutFlowDocument } from "@/lib/flow/layout";
import type {
  NormalizedFlowDocument,
  NormalizedFlowNode,
} from "@/lib/flow/types";

type FlowNodeData = NormalizedFlowNode;

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

function buildRenderableEdges(document: NormalizedFlowDocument) {
  return document.edges.map((edge) => ({
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
    <div className="relative flex h-[146px] w-[146px] items-center justify-center">
      <BaseHandles tone="start" />
      <div
        className={`flex h-full w-full items-center justify-center rounded-full border-2 shadow-[0_24px_60px_rgba(46,35,23,0.16)] ${eventPalette.start}`}
      >
        <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border border-white/60 bg-white/45 px-3 text-center backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-65">
            Inicio
          </p>
          <p className="mt-2 max-w-[82px] text-[15px] leading-[1.2] font-semibold tracking-[-0.03em] text-balance">
            {data.label}
          </p>
        </div>
      </div>
    </div>
  );
}

function EndNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative flex h-[150px] w-[150px] items-center justify-center">
      <BaseHandles tone="end" />
      <div
        className={`flex h-full w-full items-center justify-center rounded-full border-[4px] shadow-[0_28px_60px_rgba(20,16,12,0.22)] ${eventPalette.end}`}
      >
        <div className="flex h-[112px] w-[112px] flex-col items-center justify-center rounded-full border border-white/12 bg-black/10 px-3 text-center backdrop-blur-sm">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-white/58">
            Fim
          </p>
          <p className="mt-2 max-w-[84px] text-[15px] leading-[1.2] font-semibold tracking-[-0.03em] text-balance text-white">
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
      className={`relative min-h-[144px] w-[336px] rounded-[30px] border p-5 shadow-[0_24px_60px_rgba(46,35,23,0.14)] backdrop-blur ${taskPalette[data.tone]}`}
    >
      <BaseHandles tone="task" />
      <div className="pointer-events-none absolute left-4 top-4 h-10 w-10 rounded-xl border border-current/10 bg-white/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.45)]" />
      <div className="pointer-events-none absolute left-[22px] top-[24px] h-3 w-4 rounded-sm border border-current/35" />
      <div className="pointer-events-none absolute left-[22px] top-[31px] h-px w-12 bg-current/18" />

      <div className="ml-14 pr-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] opacity-65">
          {data.eyebrow}
        </p>
        <h3 className="mt-3 max-w-[236px] break-words text-[20px] leading-[1.24] font-semibold tracking-[-0.04em] text-balance">
          {data.label}
        </h3>
        <p className="mt-3 max-w-[228px] text-[13px] leading-[1.45] opacity-72">
          {data.description}
        </p>
      </div>
    </div>
  );
}

function GatewayNode({ data }: { data: FlowNodeData }) {
  return (
    <div className="relative flex h-[204px] w-[204px] items-center justify-center">
      <BaseHandles tone="gateway" />
      <div className="absolute h-[158px] w-[158px] rotate-45 rounded-[30px] border border-[rgba(31,122,99,0.28)] bg-[linear-gradient(180deg,rgba(244,252,248,0.98),rgba(255,255,255,0.92))] shadow-[0_24px_60px_rgba(24,77,63,0.14)]" />
      <div className="absolute h-[116px] w-[116px] rotate-45 rounded-[22px] border border-[rgba(31,122,99,0.12)] bg-white/72 backdrop-blur-sm" />
      <div className="relative z-10 flex max-w-[126px] flex-col items-center text-center text-[#17352d]">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] opacity-65">
          Decisao
        </p>
        <p className="mt-3 break-words text-[16px] leading-[1.22] font-semibold tracking-[-0.04em] text-balance">
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

function FlowCanvas({
  document,
  presentationMode = false,
}: {
  document: NormalizedFlowDocument;
  presentationMode?: boolean;
}) {
  const { nodes, metrics } = layoutFlowDocument(document);
  const edges: Edge[] = buildRenderableEdges(document);
  const canvasHeight = metrics.canvasHeight + (presentationMode ? 110 : 24);
  const flowKey = `${nodes
    .map((node) => `${node.id}:${node.data.label}:${node.data.type}`)
    .join("|")}::${edges
    .map((edge) => `${edge.id}:${edge.label ?? ""}`)
    .join("|")}`;

  return (
    <div
      id={FLOW_PREVIEW_EXPORT_ID}
      className="w-full overflow-hidden rounded-[2rem] border border-[rgba(28,27,25,0.08)] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),rgba(252,246,237,0.96))] shadow-[0_34px_120px_rgba(38,32,24,0.16)]"
      style={{ height: canvasHeight }}
    >
      <ReactFlow
        key={flowKey}
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
        <Background
          color="rgba(120, 105, 91, 0.14)"
          gap={22}
          size={1.1}
          variant={BackgroundVariant.Dots}
        />
        {!presentationMode ? (
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
        ) : null}
        {!presentationMode ? (
          <Controls
            showInteractive={false}
            className="!bottom-5 !left-5 !rounded-2xl !border !border-[rgba(28,27,25,0.08)] !bg-[#fffaf2]/95 !shadow-[0_20px_40px_rgba(38,32,24,0.14)]"
          />
        ) : null}
      </ReactFlow>
    </div>
  );
}

export function FlowPreview({
  document,
  presentationMode = false,
}: {
  document: NormalizedFlowDocument;
  presentationMode?: boolean;
}) {
  return (
    <ReactFlowProvider>
      <FlowCanvas
        document={document}
        presentationMode={presentationMode}
      />
    </ReactFlowProvider>
  );
}
