import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { aiFlowDocumentSchema, sanitizeAiFlowDocument } from "./flow-output";

let cachedClient: OpenAI | null | undefined;
let cachedAvailabilityIssue: string | null = null;

type FlowModelErrorDetails = {
  status?: number;
  code?: string;
  message?: string;
};

function getApiKey() {
  return process.env.OPENAI_API_KEY?.trim();
}

function getModelName() {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

export function isFlowModelConfigured() {
  return Boolean(getApiKey());
}

export function getFlowModelAvailabilityIssue() {
  return cachedAvailabilityIssue;
}

function getOpenAIClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const apiKey = getApiKey();
  cachedClient = apiKey ? new OpenAI({ apiKey }) : null;

  return cachedClient;
}

function getFlowModelErrorDetails(error: unknown): FlowModelErrorDetails {
  if (!(error instanceof Error)) {
    return {};
  }

  const details = error as Error & {
    status?: number;
    code?: unknown;
  };

  return {
    status: typeof details.status === "number" ? details.status : undefined,
    code: typeof details.code === "string" ? details.code : undefined,
    message: error.message,
  };
}

function shouldDisableFlowModelForSession(error: unknown) {
  const details = getFlowModelErrorDetails(error);
  const normalizedCode = details.code?.toLowerCase();
  const normalizedMessage = details.message?.toLowerCase() ?? "";

  return (
    normalizedCode === "insufficient_quota" ||
    normalizedCode === "invalid_api_key" ||
    details.status === 401 ||
    details.status === 403 ||
    details.status === 429 ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("api key")
  );
}

export function describeFlowModelError(error: unknown) {
  const details = getFlowModelErrorDetails(error);
  const normalizedCode = details.code?.toLowerCase();
  const normalizedMessage = details.message?.toLowerCase() ?? "";

  if (
    normalizedCode === "insufficient_quota" ||
    details.status === 429 ||
    normalizedMessage.includes("quota")
  ) {
    return "A conta da OpenAI atingiu o limite de uso ou de faturamento.";
  }

  if (
    normalizedCode === "invalid_api_key" ||
    details.status === 401 ||
    normalizedMessage.includes("api key")
  ) {
    return "A chave da OpenAI parece invalida ou sem permissao para este projeto.";
  }

  if (details.status === 403) {
    return "A chave da OpenAI nao tem permissao para usar este recurso.";
  }

  if (
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("econn") ||
    normalizedMessage.includes("enotfound")
  ) {
    return "Nao foi possivel conectar ao servico da OpenAI.";
  }

  if (details.status && details.status >= 500) {
    return "A OpenAI respondeu com uma falha temporaria.";
  }

  return "A IA nao ficou disponivel neste momento.";
}

export async function requestStructuredFlowDocument(
  systemPrompt: string,
  userPrompt: string,
) {
  const openai = getOpenAIClient();

  if (!openai) {
    throw new Error(
      cachedAvailabilityIssue ?? "A IA nao ficou disponivel neste momento.",
    );
  }

  try {
    const response = await openai.responses.parse({
      model: getModelName(),
      input: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: userPrompt,
        },
      ],
      text: {
        format: zodTextFormat(aiFlowDocumentSchema, "flow_document"),
      },
    });

    const parsed = response.output_parsed;

    if (!parsed) {
      throw new Error(
        "O modelo nao retornou uma estrutura utilizavel para o fluxograma.",
      );
    }

    return sanitizeAiFlowDocument(parsed);
  } catch (error) {
    if (shouldDisableFlowModelForSession(error)) {
      cachedAvailabilityIssue = describeFlowModelError(error);
      cachedClient = null;
    }

    throw error;
  }
}
