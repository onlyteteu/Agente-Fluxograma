export const flowNodeTypes = ["start", "task", "gateway", "end"] as const;

export type FlowNodeType = (typeof flowNodeTypes)[number];

export type FlowSchemaNode = {
  id: string;
  type: FlowNodeType;
  label: string;
};

export type FlowSchemaEdge = {
  source: string;
  target: string;
  label?: string;
};

export type FlowSchemaDocument = {
  nodes: FlowSchemaNode[];
  edges: FlowSchemaEdge[];
};

export type NormalizedFlowTone = "accent" | "neutral" | "success" | "dark";

export type NormalizedFlowNode = FlowSchemaNode & {
  eyebrow: string;
  description: string;
  tone: NormalizedFlowTone;
};

export type NormalizedFlowEdge = FlowSchemaEdge & {
  id: string;
};

export type NormalizedFlowDocument = {
  nodes: NormalizedFlowNode[];
  edges: NormalizedFlowEdge[];
};
