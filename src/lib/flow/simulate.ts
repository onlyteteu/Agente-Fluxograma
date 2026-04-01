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
const fillerWords = new Set([
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
  "com",
  "que",
  "quando",
  "entao",
  "então",
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

function compactWords(input: string, maxWords: number) {
  const words = normalizeWhitespace(input).split(" ").filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return words.slice(0, maxWords).join(" ");
}

function shortenLabel(input: string, maxLength = 36) {
  const trimmed = sentenceCase(input);

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  const shortenedByWords = compactWords(trimmed, 5);

  if (shortenedByWords.length <= maxLength) {
    return shortenedByWords;
  }

  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

function cleanActionPhrase(input: string) {
  const sanitized = normalizeWhitespace(
    input
      .replace(/^(?:o|a|os|as)\s+(?:cliente|usuario|usuário|sistema|equipe|time)\s+/i, "")
      .replace(/^(?:deve|precisa|pode|vai|devera|deverá)\s+/i, "")
      .replace(/^entao\s+/i, "")
      .replace(/^então\s+/i, ""),
  );

  return sentenceCase(sanitized);
}

function toTaskLabel(input: string) {
  const normalized = normalizeText(input);

  if (normalized.includes("corrig") || normalized.includes("ajust")) {
    return "Solicitar ajuste";
  }

  if (normalized.includes("reenv")) {
    return "Aguardar reenvio";
  }

  if (normalized.includes("onboarding")) {
    return "Iniciar onboarding";
  }

  if (normalized.includes("pagamento") && normalized.includes("valid")) {
    return "Validar pagamento";
  }

  if (normalized.includes("pedido") && normalized.includes("registr")) {
    return "Registrar pedido";
  }

  if (normalized.includes("document") && normalized.includes("envi")) {
    return "Enviar documentos";
  }

  return shortenLabel(cleanActionPhrase(input));
}

function toQuestionLabel(input: string) {
  const normalized = normalizeText(input);

  if (
    normalized.includes("pagamento") &&
    (normalized.includes("aprov") || normalized.includes("valid"))
  ) {
    return "Pagamento aprovado?";
  }

  if (
    (normalized.includes("falta") || normalized.includes("faltar")) &&
    (normalized.includes("inform") || normalized.includes("dado"))
  ) {
    return "Falta alguma informação?";
  }

  if (
    (normalized.includes("inform") || normalized.includes("dado")) &&
    normalized.includes("complet")
  ) {
    return "Informações completas?";
  }

  if (normalized.includes("pedido") && normalized.includes("aprov")) {
    return "Pedido aprovado?";
  }

  if (normalized.includes("cadastro") && normalized.includes("complet")) {
    return "Cadastro completo?";
  }

  if (normalized.includes("document") && normalized.includes("complet")) {
    return "Documentação completa?";
  }

  if (normalized.includes("erro")) {
    return "Há algum erro?";
  }

  if (normalized.includes("pendenc")) {
    return "Há pendência?";
  }

  const words = normalizeWhitespace(input)
    .replace(/^se\s+/i, "")
    .replace(/^que\s+/i, "")
    .replace(/^(?:estiver|estiverem|for|forem|houver|existir)\s+/i, "")
    .split(" ")
    .filter((word) => !fillerWords.has(normalizeText(word)));

  return shortenLabel(`${sentenceCase(words.join(" "))}?`, 32);
}

function splitProcessText(input: string) {
  return input
    .replace(/\r\n/g, "\n")
    .replace(/([.;!?])\s+/g, "$1\n")
    .replace(
      /,\s+(?=(?:e\s+)?(?:o|a|os|as|um|uma|se|caso|senao|senão)\b)/gi,
      "\n",
    )
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

function stripElsePrefix(segment: string) {
  return normalizeWhitespace(
    segment.replace(
      /^(?:e\s+)?(?:senao|senão|caso contrario|caso contrário)\s*,?\s*/i,
      "",
    ),
  );
}

function summarizeSegments(segments: string[]) {
  const cleaned = segments.map((segment) => toTaskLabel(segment)).filter(Boolean);

  if (cleaned.length === 0) {
    return "";
  }

  if (cleaned.length === 1) {
    return cleaned[0];
  }

  if (cleaned.length === 2) {
    return shortenLabel(`${cleaned[0]} e ${cleaned[1].toLowerCase()}`);
  }

  return shortenLabel(`${cleaned[0]} e outras etapas`);
}

function compressLinearSegments(segments: string[]) {
  if (segments.length <= MAX_LINEAR_TASKS) {
    return segments.map((segment) => toTaskLabel(segment));
  }

  const head = segments
    .slice(0, MAX_LINEAR_TASKS - 1)
    .map((segment) => toTaskLabel(segment));
  const tail = summarizeSegments(segments.slice(MAX_LINEAR_TASKS - 1));

  return [...head, tail];
}

function extractConditionPhrase(segment: string) {
  const withoutElse = normalizeWhitespace(
    segment.replace(/\b(senao|senão|caso contrario|caso contrário)\b.*$/i, ""),
  );
  const inlineIfThenMatch = withoutElse.match(/\bse\b\s+(.+?)\s*,\s*.+$/i);

  if (inlineIfThenMatch?.[1]) {
    return inlineIfThenMatch[1];
  }

  const gatedActionMatch = withoutElse.match(
    /(?:segue|continua|prossegue|avanca|avança|vai)\s+(?:para\s+)?(.+?)\s+\bse\b\s+(.+)/i,
  );

  if (gatedActionMatch?.[2]) {
    return gatedActionMatch[2];
  }

  const standaloneIfMatch = withoutElse.match(/\bse\b\s+(.+)/i);

  return standaloneIfMatch?.[1] ?? withoutElse;
}

function buildGatewayLabel(segment: string, contextSegments: string[] = []) {
  return toQuestionLabel(`${contextSegments.join(" ")} ${extractConditionPhrase(segment)}`);
}

function buildFallbackLabel(segment?: string) {
  if (segment && isCorrectionSegment(segment)) {
    return "Solicitar ajuste";
  }

  return "Revisar dados";
}

function buildPositiveOutcome(conditionSegment: string, remainingSegments: string[]) {
  const gatedActionMatch = conditionSegment.match(
    /(?:segue(?:\s+para)?|continua(?:\s+para)?|prossegue(?:\s+para)?|avanca(?:\s+para)?|vai\s+para)\s+(.+?)\s+\bse\b/i,
  );

  if (gatedActionMatch?.[1]) {
    return toTaskLabel(gatedActionMatch[1]);
  }

  const inlineIfThenMatch = conditionSegment.match(/\bse\b\s+.+?\s*,\s*(.+)$/i);

  if (inlineIfThenMatch?.[1]) {
    const positiveAction = inlineIfThenMatch[1]
      .replace(/\b(senao|senão|caso contrario|caso contrário)\b.*$/i, "")
      .trim();

    if (positiveAction) {
      return toTaskLabel(positiveAction);
    }
  }

  const explicitNext = remainingSegments.find(
    (segment) => !isElseSegment(segment) && !isCorrectionSegment(segment),
  );

  return explicitNext ? toTaskLabel(explicitNext) : "";
}

function extractNegativeOutcome(
  conditionSegment: string,
  remainingSegments: string[],
) {
  const inlineElseMatch = conditionSegment.match(
    /\b(?:senao|senão|caso contrario|caso contrário)\b\s*,?\s*(.+)$/i,
  );

  if (inlineElseMatch?.[1]) {
    return toTaskLabel(stripElsePrefix(inlineElseMatch[1]));
  }

  const explicitElseSegment = remainingSegments.find((segment) => isElseSegment(segment));

  if (explicitElseSegment) {
    return toTaskLabel(stripElsePrefix(explicitElseSegment));
  }

  const correctionSegment = remainingSegments.find((segment) =>
    isCorrectionSegment(segment),
  );

  if (correctionSegment) {
    return buildFallbackLabel(correctionSegment);
  }

  return "";
}

function createNodeFactory() {
  const usedIds = new Map<string, number>();

  return (type: FlowNodeType, label: string) => {
    const finalLabel =
      type === "gateway" ? toQuestionLabel(label) : shortenLabel(label, 34);
    const baseId = slugify(finalLabel) || type;
    const currentCount = usedIds.get(baseId) ?? 0;
    usedIds.set(baseId, currentCount + 1);

    return {
      id: currentCount === 0 ? baseId : `${baseId}-${currentCount + 1}`,
      type,
      label: finalLabel,
    };
  };
}

function buildLinearFlowDocument(segments: string[]) {
  const makeNode = createNodeFactory();
  const nodes: FlowSchemaDocument["nodes"] = [];
  const edges: FlowSchemaDocument["edges"] = [];

  const startNode = makeNode("start", toTaskLabel(segments[0]));
  nodes.push(startNode);

  let currentNodeId = startNode.id;

  for (const label of compressLinearSegments(segments.slice(1))) {
    const taskNode = makeNode("task", label);
    nodes.push(taskNode);
    edges.push({ source: currentNodeId, target: taskNode.id });
    currentNodeId = taskNode.id;
  }

  const endNode = makeNode("end", "Processo concluído");
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
  const correctionSegment = afterCondition.find((segment) => isCorrectionSegment(segment));
  const positiveOutcome = buildPositiveOutcome(conditionSegment, afterCondition);
  const negativeOutcome = extractNegativeOutcome(conditionSegment, afterCondition);
  const hasCorrectionLoop =
    Boolean(correctionSegment) || isCorrectionSegment(negativeOutcome);

  const startNode = makeNode(
    "start",
    toTaskLabel(beforeCondition[0] ?? "Iniciar processo"),
  );
  nodes.push(startNode);

  let anchorNodeId = startNode.id;

  if (beforeCondition.length > 1) {
    const preTaskNode = makeNode("task", summarizeSegments(beforeCondition.slice(1, 3)));
    nodes.push(preTaskNode);
    edges.push({ source: startNode.id, target: preTaskNode.id });
    anchorNodeId = preTaskNode.id;
  }

  const gatewayNode = makeNode(
    "gateway",
    buildGatewayLabel(conditionSegment, beforeCondition),
  );
  nodes.push(gatewayNode);
  edges.push({ source: anchorNodeId, target: gatewayNode.id });

  const endNode = makeNode("end", "Processo concluído");
  let positiveTargetId = endNode.id;
  let negativeTargetId = endNode.id;

  if (positiveOutcome) {
    const positiveTaskNode = makeNode("task", positiveOutcome);
    nodes.push(positiveTaskNode);
    positiveTargetId = positiveTaskNode.id;
  }

  if (negativeOutcome) {
    const negativeTaskNode = makeNode("task", negativeOutcome);
    nodes.push(negativeTaskNode);
    negativeTargetId = negativeTaskNode.id;
  }

  nodes.push(endNode);

  edges.push({
    source: gatewayNode.id,
    target: positiveTargetId,
    label: "Sim",
  });
  edges.push({
    source: gatewayNode.id,
    target: negativeTargetId,
    label: "Não",
  });

  if (positiveTargetId !== endNode.id) {
    edges.push({ source: positiveTargetId, target: endNode.id });
  }

  if (negativeTargetId !== endNode.id) {
    if (hasCorrectionLoop) {
      edges.push({ source: negativeTargetId, target: gatewayNode.id });
    } else {
      edges.push({ source: negativeTargetId, target: endNode.id });
    }
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
          label: "Descrever processo",
        },
        {
          id: "end",
          type: "end",
          label: "Aguardando fluxo",
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
