import type { FlowNodeType, FlowSchemaDocument } from "./types";

const MAX_FLOW_NODES = 7;
const MAX_LINEAR_TASKS = MAX_FLOW_NODES - 2;

const elseMarkers = ["senao", "senão", "caso contrario", "caso contrário"];
const conditionalMarkers = [" se ", "caso ", "aprov", "valid", "verific", "decis"];
const correctionMarkers = [
  "falt",
  "ajust",
  "corrig",
  "erro",
  "pendenc",
  "reenv",
  "reprov",
  "inconsisten",
];

function normalizeWhitespace(input: string) {
  return input.replace(/\s+/g, " ").trim();
}

function normalizeText(input: string) {
  return normalizeWhitespace(input)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function slugify(input: string) {
  return normalizeText(input)
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

function shortenLabel(input: string, maxLength = 48) {
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
    .replace(/,\s+(?=(?:e\s+)?(?:o|a|os|as|um|uma|se|caso|senao|senão)\b)/gi, "\n")
    .split("\n")
    .map((segment) => normalizeWhitespace(segment.replace(/[.;!?]$/g, "")))
    .filter(Boolean);
}

function containsMarker(input: string, markers: string[]) {
  const content = ` ${normalizeText(input)} `;
  return markers.some((marker) => content.includes(` ${normalizeText(marker)} `));
}

function containsFragment(input: string, fragments: string[]) {
  const content = normalizeText(input);
  return fragments.some((fragment) => content.includes(normalizeText(fragment)));
}

function isElseSegment(segment: string) {
  return containsFragment(segment, elseMarkers);
}

function isCorrectionSegment(segment: string) {
  return containsFragment(segment, correctionMarkers);
}

function looksConditional(segment: string) {
  return containsMarker(segment, conditionalMarkers) || isElseSegment(segment);
}

function summarizeSegments(segments: string[]) {
  const cleaned = segments.map((segment) => sentenceCase(segment)).filter(Boolean);

  if (cleaned.length === 0) {
    return "";
  }

  if (cleaned.length === 1) {
    return shortenLabel(cleaned[0]);
  }

  if (cleaned.length === 2) {
    return shortenLabel(`${cleaned[0]}, depois ${cleaned[1].toLowerCase()}`);
  }

  return shortenLabel(`${cleaned[0]}, ${cleaned[1]} e outras etapas`);
}

function compressLinearSegments(segments: string[]) {
  if (segments.length <= MAX_LINEAR_TASKS) {
    return segments.map((segment) => shortenLabel(segment));
  }

  const head = segments.slice(0, MAX_LINEAR_TASKS - 1).map((segment) => shortenLabel(segment));
  const tail = summarizeSegments(segments.slice(MAX_LINEAR_TASKS - 1));

  return [...head, tail];
}

function buildGatewayLabel(segment: string) {
  const withoutElse = segment
    .replace(/\b(senao|senão|caso contrario|caso contrário)\b.*$/i, "")
    .trim();
  const match = withoutElse.match(/\bse\b\s+(.+)/i);
  const rawCondition = match?.[1] ?? withoutElse;
  const cleaned = sentenceCase(rawCondition.replace(/^que\s+/i, "").trim());

  return shortenLabel(cleaned.endsWith("?") ? cleaned : `${cleaned}?`);
}

function buildFallbackLabel(segment?: string) {
  if (segment && isCorrectionSegment(segment)) {
    return "Corrigir informacoes e reenviar";
  }

  return "Revisar dados e reenviar";
}

function buildPositiveOutcome(conditionSegment: string, remainingSegments: string[]) {
  const lower = normalizeText(conditionSegment);
  const regex =
    /(?:segue(?:\s+para)?|continua(?:\s+para)?|prossegue(?:\s+para)?|avanca(?:\s+para)?|vai\s+para)\s+(.+?)\s+\bse\b/i;
  const match = conditionSegment.match(regex);

  if (match?.[1]) {
    return shortenLabel(`Seguir para ${match[1]}`);
  }

  const explicitNext = remainingSegments.find(
    (segment) => !isElseSegment(segment) && !isCorrectionSegment(segment),
  );

  if (explicitNext) {
    return shortenLabel(explicitNext);
  }

  if (lower.includes("aprov")) {
    return "Seguir com a aprovacao";
  }

  if (lower.includes("valid")) {
    return "Continuar com o processo validado";
  }

  return "Seguir para a proxima etapa";
}

function createNodeFactory() {
  const usedIds = new Map<string, number>();

  return (type: FlowNodeType, label: string) => {
    const baseId = slugify(label) || type;
    const currentCount = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, currentCount + 1);

    return {
      id: currentCount === 0 ? baseId : `${baseId}-${currentCount + 1}`,
      type,
      label: shortenLabel(label),
    };
  };
}

function buildLinearFlowDocument(segments: string[]) {
  const makeNode = createNodeFactory();
  const nodes: FlowSchemaDocument["nodes"] = [];
  const edges: FlowSchemaDocument["edges"] = [];

  const startNode = makeNode("start", segments[0]);
  nodes.push(startNode);

  let currentNodeId = startNode.id;

  for (const label of compressLinearSegments(segments.slice(1))) {
    const taskNode = makeNode("task", label);
    nodes.push(taskNode);
    edges.push({ source: currentNodeId, target: taskNode.id });
    currentNodeId = taskNode.id;
  }

  const endNode = makeNode("end", "Fluxo pronto para concluir");
  nodes.push(endNode);
  edges.push({ source: currentNodeId, target: endNode.id });

  return { nodes, edges };
}

function buildConditionalFlowDocument(segments: string[]) {
  const makeNode = createNodeFactory();
  const nodes: FlowSchemaDocument["nodes"] = [];
  const edges: FlowSchemaDocument["edges"] = [];
  const conditionIndex = segments.findIndex((segment) => looksConditional(segment));
  const conditionSegment = segments[conditionIndex] ?? segments[0];
  const beforeCondition = segments.slice(0, Math.max(conditionIndex, 0));
  const afterCondition = segments.slice(conditionIndex + 1);
  const explicitElseSegment = afterCondition.find((segment) => isElseSegment(segment));
  const correctionSegment = afterCondition.find((segment) => isCorrectionSegment(segment));
  const hasCorrectionLoop = Boolean(correctionSegment);

  const startNode = makeNode(
    "start",
    beforeCondition[0] ?? "Inicio do processo",
  );
  nodes.push(startNode);

  let loopTargetId = startNode.id;

  if (beforeCondition.length > 1) {
    const preTaskNode = makeNode(
      "task",
      summarizeSegments(beforeCondition.slice(1, 3)),
    );
    nodes.push(preTaskNode);
    edges.push({ source: startNode.id, target: preTaskNode.id });
    loopTargetId = preTaskNode.id;
  }

  const gatewayNode = makeNode("gateway", buildGatewayLabel(conditionSegment));
  nodes.push(gatewayNode);
  edges.push({ source: loopTargetId, target: gatewayNode.id });

  const positiveTaskNode = makeNode(
    "task",
    buildPositiveOutcome(conditionSegment, afterCondition),
  );
  nodes.push(positiveTaskNode);
  edges.push({
    source: gatewayNode.id,
    target: positiveTaskNode.id,
    label: "Sim",
  });

  const negativeTaskNode = makeNode(
    "task",
    explicitElseSegment && !isCorrectionSegment(explicitElseSegment)
      ? explicitElseSegment
      : buildFallbackLabel(correctionSegment ?? explicitElseSegment ?? conditionSegment),
  );
  nodes.push(negativeTaskNode);
  edges.push({
    source: gatewayNode.id,
    target: negativeTaskNode.id,
    label: "Nao",
  });

  const endNode = makeNode("end", "Fluxo pronto para concluir");
  nodes.push(endNode);
  edges.push({ source: positiveTaskNode.id, target: endNode.id });

  if (hasCorrectionLoop || isCorrectionSegment(negativeTaskNode.label)) {
    edges.push({ source: negativeTaskNode.id, target: loopTargetId });
  } else {
    edges.push({ source: negativeTaskNode.id, target: endNode.id });
  }

  return { nodes, edges };
}

export function simulateFlowDocumentFromText(input: string): FlowSchemaDocument {
  const segments = splitProcessText(input).slice(0, 10);

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

  const uniqueConditionKeys = new Set<string>();
  const hasConditionalFlow = segments.some((segment) => {
    if (!looksConditional(segment)) {
      return false;
    }

    const conditionKey = slugify(buildGatewayLabel(segment));

    if (uniqueConditionKeys.has(conditionKey)) {
      return false;
    }

    uniqueConditionKeys.add(conditionKey);
    return true;
  });

  if (!hasConditionalFlow) {
    return buildLinearFlowDocument(segments);
  }

  return buildConditionalFlowDocument(segments);
}

export function stringifyFlowDocument(document: FlowSchemaDocument) {
  return JSON.stringify(document, null, 2);
}
