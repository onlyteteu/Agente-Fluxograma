import { parseFlowDocument } from "./parser";
import type { FlowSchemaDocument, FlowSchemaNode } from "./types";

const MAX_FLOW_NODES = 7;

const stopWords = new Set([
  "o",
  "a",
  "os",
  "as",
  "um",
  "uma",
  "de",
  "do",
  "da",
  "dos",
  "das",
  "para",
  "por",
  "com",
  "e",
  "ou",
  "no",
  "na",
  "nos",
  "nas",
  "antes",
]);

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeText(input: string) {
  return normalizeWhitespace(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sentenceCase(input: string) {
  const trimmed = normalizeWhitespace(input);

  if (!trimmed) {
    return trimmed;
  }

  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function shortenLabel(input: string, maxWords = 5, maxLength = 34) {
  const words = normalizeWhitespace(input).split(" ").filter(Boolean);
  const compact = words.slice(0, maxWords).join(" ");

  if (compact.length <= maxLength) {
    return sentenceCase(compact);
  }

  return `${sentenceCase(compact.slice(0, maxLength - 3).trimEnd())}...`;
}

function slugify(input: string) {
  return normalizeText(input)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function rootTokens(input: string) {
  return normalizeText(input)
    .split(/[^a-z0-9]+/g)
    .filter((token) => token.length > 2 && !stopWords.has(token))
    .map((token) => token.slice(0, 6));
}

function scoreNodeMatch(node: FlowSchemaNode, phrase: string) {
  const label = normalizeText(node.label);
  const target = normalizeText(phrase);

  if (!target) {
    return 0;
  }

  if (label.includes(target) || target.includes(label)) {
    return 100;
  }

  const labelTokens = new Set(rootTokens(node.label));
  const targetTokens = rootTokens(phrase);
  let score = 0;

  for (const token of targetTokens) {
    if (labelTokens.has(token)) {
      score += 12;
    }
  }

  if (node.type === "task") {
    score += 2;
  }

  if (node.type === "end" && target.includes("confirm")) {
    score += 4;
  }

  return score;
}

function findBestNode(document: FlowSchemaDocument, phrase: string) {
  const candidates = document.nodes
    .map((node) => ({
      node,
      score: scoreNodeMatch(node, phrase),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.node;
}

function buildTaskLabel(input: string) {
  const normalized = normalizeText(input);

  if (normalized.includes("aprov") && normalized.includes("gerent")) {
    return "Aprovar com gerente";
  }

  if (normalized.includes("ajust")) {
    return "Solicitar ajuste";
  }

  if (normalized.includes("valid")) {
    return "Validar informacoes";
  }

  if (normalized.includes("confirm")) {
    return "Confirmar etapa";
  }

  return shortenLabel(
    normalizeWhitespace(
      input
        .replace(/^(?:uma?\s+)?etapa\s+de\s+/i, "")
        .replace(/^(?:o|a)\s+/i, ""),
    ),
  );
}

function createUniqueNodeId(document: FlowSchemaDocument, label: string) {
  const baseId = slugify(label) || "etapa";
  const existing = new Set(document.nodes.map((node) => node.id));

  if (!existing.has(baseId)) {
    return baseId;
  }

  let index = 2;
  while (existing.has(`${baseId}-${index}`)) {
    index += 1;
  }

  return `${baseId}-${index}`;
}

function replaceNodeLabel(
  document: FlowSchemaDocument,
  targetPhrase: string,
  nextLabel: string,
) {
  const targetNode = findBestNode(document, targetPhrase);

  if (!targetNode) {
    throw new Error("Nao encontrei a etapa que voce quer substituir no fluxo atual.");
  }

  return parseFlowDocument({
    nodes: document.nodes.map((node) =>
      node.id === targetNode.id
        ? {
            ...node,
            label: buildTaskLabel(nextLabel),
          }
        : node,
    ),
    edges: document.edges,
  });
}

function insertNodeBefore(
  document: FlowSchemaDocument,
  nextLabel: string,
  targetPhrase: string,
) {
  if (document.nodes.length >= MAX_FLOW_NODES) {
    throw new Error(
      "O fluxo atual ja esta no limite de etapas para o fallback local.",
    );
  }

  const targetNode = findBestNode(document, targetPhrase);

  if (!targetNode || targetNode.type === "start") {
    throw new Error("Nao encontrei um ponto claro para inserir a nova etapa.");
  }

  const incomingEdges = document.edges.filter((edge) => edge.target === targetNode.id);

  if (incomingEdges.length === 0) {
    throw new Error("Nao encontrei conexoes suficientes para inserir a nova etapa.");
  }

  const nodeLabel = buildTaskLabel(nextLabel);
  const newNodeId = createUniqueNodeId(document, nodeLabel);
  const newNode: FlowSchemaNode = {
    id: newNodeId,
    type: "task",
    label: nodeLabel,
  };

  const updatedEdges = document.edges.map((edge) =>
    edge.target === targetNode.id
      ? {
          ...edge,
          target: newNodeId,
        }
      : edge,
  );

  updatedEdges.push({
    source: newNodeId,
    target: targetNode.id,
  });

  return parseFlowDocument({
    nodes: [...document.nodes, newNode],
    edges: updatedEdges,
  });
}

function applyReplacementInstruction(
  document: FlowSchemaDocument,
  instruction: string,
) {
  const match = instruction.match(
    /\b(?:troque|substitua|altere)\b\s+(.+?)\s+\bpor\b\s+(.+)/i,
  );

  if (!match) {
    return null;
  }

  return replaceNodeLabel(document, match[1], match[2]);
}

function applyInsertionInstruction(
  document: FlowSchemaDocument,
  instruction: string,
) {
  const match = instruction.match(
    /\b(?:adicione|adicionar|inclua|incluir|insira|coloque)\b\s+(.+?)\s+\bantes d(?:e|o|a)\b\s+(.+)/i,
  );

  if (!match) {
    return null;
  }

  return insertNodeBefore(document, match[1], match[2]);
}

export function refineFlowDocumentWithInstruction(
  document: FlowSchemaDocument,
  instruction: string,
) {
  const trimmedInstruction = normalizeWhitespace(instruction);

  if (!trimmedInstruction) {
    throw new Error("Escreva uma instrucao antes de refinar o fluxograma.");
  }

  const replacement = applyReplacementInstruction(document, trimmedInstruction);

  if (replacement) {
    return replacement;
  }

  const insertion = applyInsertionInstruction(document, trimmedInstruction);

  if (insertion) {
    return insertion;
  }

  throw new Error(
    "O fallback local ainda nao conseguiu aplicar esse tipo de refinamento.",
  );
}
