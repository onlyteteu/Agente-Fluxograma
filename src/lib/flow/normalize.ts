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
    description:
      "Marca o ponto de inicio do processo e prepara a leitura do fluxo.",
    tone: "accent",
  },
  task: {
    eyebrow: "Tarefa",
    description:
      "Representa uma etapa executavel dentro do processo descrito.",
    tone: "neutral",
  },
  gateway: {
    eyebrow: "Decisao",
    description:
      "Abre caminhos condicionais para indicar validacoes ou bifurcacoes.",
    tone: "success",
  },
  end: {
    eyebrow: "Saida",
    description:
      "Indica o encerramento do fluxo em um estado pronto para entrega.",
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
