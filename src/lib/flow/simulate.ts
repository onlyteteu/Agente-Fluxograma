import type { FlowNodeType, FlowSchemaDocument } from "./types";

const conditionalMarkers = [
  " se ",
  "caso ",
  "aprov",
  "valid",
  "verific",
  "falt",
  "erro",
  "pendenc",
  "decis",
];

const fallbackMarkers = [
  "falt",
  "ajust",
  "corrig",
  "erro",
  "pendenc",
  "reprov",
  "inconsisten",
];

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function slugify(input: string) {
  return normalizeWhitespace(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sentenceCase(input: string) {
  const trimmed = normalizeWhitespace(input);

  if (!trimmed) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function shortenLabel(input: string, maxLength = 46) {
  const trimmed = sentenceCase(input);

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

function splitProcessText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/([.;!?])\s+/g, "$1\n")
    .replace(/,\s+(?=(?:e\s+)?(?:o|a|os|as|um|uma|se|caso)\b)/gi, "\n")
    .split("\n")
    .map((segment) => normalizeWhitespace(segment.replace(/[.;!?]$/g, "")))
    .filter(Boolean);
}

function looksConditional(segment: string) {
  const content = ` ${segment.toLowerCase()} `;
  return conditionalMarkers.some((marker) => content.includes(marker));
}

function buildGatewayLabel(segment: string) {
  const cleaned = sentenceCase(segment.replace(/^se\s+/i, "").trim());

  if (cleaned.endsWith("?")) {
    return shortenLabel(cleaned);
  }

  return shortenLabel(`${cleaned}?`);
}

function buildFallbackLabel(segment: string) {
  const lower = segment.toLowerCase();

  if (fallbackMarkers.some((marker) => lower.includes(marker))) {
    return "Ajustar informacoes e reenviar";
  }

  return "Revisar condicoes antes de continuar";
}

function createNodeFactory() {
  const usedIds = new Map<string, number>();

  return (type: FlowNodeType, label: string) => {
    const baseId = slugify(label) || type;
    const currentCount = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, currentCount + 1);

    const suffix = currentCount === 0 ? "" : `-${currentCount + 1}`;

    return {
      id: `${baseId}${suffix}`,
      type,
      label: shortenLabel(label),
    };
  };
}

export function simulateFlowDocumentFromText(input: string): FlowSchemaDocument {
  const segments = splitProcessText(input);

  if (segments.length === 0) {
    return {
      nodes: [
        {
          id: "start",
          type: "start",
          label: "Descreva um processo para gerar o fluxo",
        },
        {
          id: "end",
          type: "end",
          label: "Fluxo aguardando descricao",
        },
      ],
      edges: [{ source: "start", target: "end" }],
    };
  }

  const makeNode = createNodeFactory();
  const nodes: FlowSchemaDocument["nodes"] = [];
  const edges: FlowSchemaDocument["edges"] = [];

  const startNode = makeNode("start", segments[0]);
  nodes.push(startNode);

  let currentNodeId = startNode.id;
  let index = 1;

  while (index < segments.length) {
    const segment = segments[index];

    if (looksConditional(segment)) {
      const gatewayNode = makeNode("gateway", buildGatewayLabel(segment));
      const fallbackNode = makeNode("task", buildFallbackLabel(segment));

      nodes.push(gatewayNode, fallbackNode);
      edges.push({ source: currentNodeId, target: gatewayNode.id });
      edges.push({
        source: gatewayNode.id,
        target: fallbackNode.id,
        label: "Nao",
      });
      edges.push({
        source: fallbackNode.id,
        target: gatewayNode.id,
      });

      const nextSegment = segments[index + 1];

      if (nextSegment) {
        const nextNode = makeNode(
          index + 1 === segments.length - 1 ? "task" : "task",
          nextSegment,
        );

        nodes.push(nextNode);
        edges.push({
          source: gatewayNode.id,
          target: nextNode.id,
          label: "Sim",
        });
        currentNodeId = nextNode.id;
        index += 2;
        continue;
      }

      currentNodeId = gatewayNode.id;
      index += 1;
      continue;
    }

    const taskNode = makeNode("task", segment);
    nodes.push(taskNode);
    edges.push({ source: currentNodeId, target: taskNode.id });
    currentNodeId = taskNode.id;
    index += 1;
  }

  const endNode = makeNode("end", "Fluxo pronto para concluir");
  nodes.push(endNode);
  edges.push({ source: currentNodeId, target: endNode.id });

  return {
    nodes,
    edges,
  };
}

export function stringifyFlowDocument(document: FlowSchemaDocument) {
  return JSON.stringify(document, null, 2);
}
