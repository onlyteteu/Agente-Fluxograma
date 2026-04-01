import type {
  FlowNodeType,
  FlowSchemaDocument,
  NormalizedFlowDocument,
  NormalizedFlowNode,
  NormalizedFlowTone,
} from "./types";

type FlowNodePresentation = {
  eyebrow: string;
  description: string;
  tone: NormalizedFlowTone;
};

const nodePresentationByType: Record<FlowNodeType, FlowNodePresentation> = {
  start: {
    eyebrow: "Entrada",
    description: "Ponto inicial do fluxo.",
    tone: "accent",
  },
  task: {
    eyebrow: "Tarefa",
    description: "Etapa principal do processo.",
    tone: "neutral",
  },
  gateway: {
    eyebrow: "Decisao",
    description: "Pergunta que divide o fluxo.",
    tone: "success",
  },
  end: {
    eyebrow: "Saida",
    description: "Encerramento do processo.",
    tone: "dark",
  },
};

function normalizeNode(node: FlowSchemaDocument["nodes"][number]): NormalizedFlowNode {
  return {
    ...node,
    label: node.label.trim(),
    ...nodePresentationByType[node.type],
  };
}

export function normalizeFlowDocument(
  document: FlowSchemaDocument,
): NormalizedFlowDocument {
  return {
    nodes: document.nodes.map(normalizeNode),
    edges: document.edges.map((edge, index) => ({
      ...edge,
      label: edge.label?.trim(),
      id: `edge-${edge.source}-${edge.target}-${index + 1}`,
    })),
  };
}
