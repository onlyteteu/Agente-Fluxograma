import "server-only";

import OpenAI from "openai";
import { z } from "zod";
import { zodTextFormat } from "openai/helpers/zod";
import {
  aiFlowDocumentSchema,
  sanitizeAiFlowDocument,
  type AiFlowDocument,
} from "./flow-output";

let cachedOpenAiClient: OpenAI | null | undefined;
let cachedAvailabilityIssue: string | null = null;

type ModelProvider = "gemini" | "openai";

type FlowModelErrorDetails = {
  status?: number;
  code?: string;
  message?: string;
};

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
      }>;
    };
    finishReason?: string;
  }>;
  promptFeedback?: {
    blockReason?: string;
  };
};

const geminiResponseSchema = {
  type: "object",
  properties: {
    nodes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          type: {
            type: "string",
            enum: ["start", "task", "gateway", "end"],
          },
          label: { type: "string" },
        },
        required: ["id", "type", "label"],
      },
    },
    edges: {
      type: "array",
      items: {
        type: "object",
        properties: {
          source: { type: "string" },
          target: { type: "string" },
          label: { type: "string" },
        },
        required: ["source", "target"],
      },
    },
  },
  required: ["nodes", "edges"],
} as const;

function getGeminiApiKey() {
  return process.env.GEMINI_API_KEY?.trim();
}

function getGeminiModelName() {
  return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
}

function getOpenAiApiKey() {
  return process.env.OPENAI_API_KEY?.trim();
}

function getOpenAiModelName() {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

function getPreferredProvider(): ModelProvider | null {
  if (getGeminiApiKey()) {
    return "gemini";
  }

  if (getOpenAiApiKey()) {
    return "openai";
  }

  return null;
}

export function isFlowModelConfigured() {
  return Boolean(getPreferredProvider());
}

export function getFlowModelAvailabilityIssue() {
  return cachedAvailabilityIssue;
}

function getOpenAIClient() {
  if (cachedOpenAiClient !== undefined) {
    return cachedOpenAiClient;
  }

  const apiKey = getOpenAiApiKey();
  cachedOpenAiClient = apiKey ? new OpenAI({ apiKey }) : null;

  return cachedOpenAiClient;
}

function withErrorDetails(
  message: string,
  details?: { status?: number; code?: string },
) {
  const error = new Error(message) as Error & {
    status?: number;
    code?: string;
  };

  if (typeof details?.status === "number") {
    error.status = details.status;
  }

  if (details?.code) {
    error.code = details.code;
  }

  return error;
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
    normalizedCode === "resource_exhausted" ||
    normalizedCode === "invalid_api_key" ||
    normalizedCode === "api_key_invalid" ||
    normalizedCode === "permission_denied" ||
    details.status === 401 ||
    details.status === 403 ||
    details.status === 429 ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("billing") ||
    normalizedMessage.includes("api key") ||
    normalizedMessage.includes("resource exhausted")
  );
}

export function describeFlowModelError(error: unknown) {
  const details = getFlowModelErrorDetails(error);
  const normalizedCode = details.code?.toLowerCase();
  const normalizedMessage = details.message?.toLowerCase() ?? "";

  if (
    normalizedCode === "insufficient_quota" ||
    normalizedCode === "resource_exhausted" ||
    details.status === 429 ||
    normalizedMessage.includes("quota") ||
    normalizedMessage.includes("billing") ||
    normalizedMessage.includes("resource exhausted")
  ) {
    return "A conta da IA atingiu o limite de uso ou de faturamento.";
  }

  if (
    normalizedCode === "invalid_api_key" ||
    normalizedCode === "api_key_invalid" ||
    details.status === 401 ||
    normalizedMessage.includes("api key")
  ) {
    return "A chave da IA parece invalida ou sem permissao para este projeto.";
  }

  if (
    normalizedCode === "permission_denied" ||
    details.status === 403
  ) {
    return "A chave da IA nao tem permissao para usar este recurso.";
  }

  if (
    normalizedMessage.includes("fetch failed") ||
    normalizedMessage.includes("network") ||
    normalizedMessage.includes("timed out") ||
    normalizedMessage.includes("econn") ||
    normalizedMessage.includes("enotfound")
  ) {
    return "Nao foi possivel conectar ao servico de IA.";
  }

  if (details.status && details.status >= 500) {
    return "O provedor de IA respondeu com uma falha temporaria.";
  }

  return "A IA nao ficou disponivel neste momento.";
}

function parseAiFlowDocument(document: unknown) {
  try {
    return sanitizeAiFlowDocument(
      aiFlowDocumentSchema.parse(document) as AiFlowDocument,
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error("A resposta da IA nao passou na validacao do schema.");
    }

    throw error;
  }
}

async function requestGeminiStructuredFlowDocument(
  systemPrompt: string,
  userPrompt: string,
) {
  const apiKey = getGeminiApiKey();

  if (!apiKey) {
    throw new Error("A chave do Gemini nao foi configurada.");
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${getGeminiModelName()}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: systemPrompt }],
        },
        contents: [
          {
            role: "user",
            parts: [{ text: userPrompt }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
          responseSchema: geminiResponseSchema,
        },
      }),
    },
  );

  const payload = (await response.json()) as
    | GeminiGenerateContentResponse
    | {
        error?: {
          code?: number;
          message?: string;
          status?: string;
        };
      };

  if (!response.ok) {
    const errorPayload =
      typeof payload === "object" && payload !== null && "error" in payload
        ? payload.error
        : undefined;

    throw withErrorDetails(
      errorPayload?.message ?? "O Gemini nao retornou uma resposta valida.",
      {
        status: errorPayload?.code ?? response.status,
        code: errorPayload?.status,
      },
    );
  }

  const blockReason =
    "promptFeedback" in payload ? payload.promptFeedback?.blockReason : undefined;

  if (blockReason) {
    throw withErrorDetails(
      `O Gemini bloqueou a resposta por seguranca: ${blockReason}.`,
      { status: 400, code: blockReason },
    );
  }

  const text = "candidates" in payload
    ? payload.candidates?.[0]?.content?.parts?.find((part) => part.text)?.text
    : undefined;

  if (!text) {
    throw new Error("O Gemini nao retornou um JSON utilizavel para o fluxograma.");
  }

  return parseAiFlowDocument(JSON.parse(text));
}

async function requestOpenAiStructuredFlowDocument(
  systemPrompt: string,
  userPrompt: string,
) {
  const openai = getOpenAIClient();

  if (!openai) {
    throw new Error("A chave da OpenAI nao foi configurada.");
  }

  const response = await openai.responses.parse({
    model: getOpenAiModelName(),
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
}

export async function requestStructuredFlowDocument(
  systemPrompt: string,
  userPrompt: string,
) {
  const provider = getPreferredProvider();

  if (!provider) {
    throw new Error(
      cachedAvailabilityIssue ?? "A IA nao ficou disponivel neste momento.",
    );
  }

  try {
    return provider === "gemini"
      ? await requestGeminiStructuredFlowDocument(systemPrompt, userPrompt)
      : await requestOpenAiStructuredFlowDocument(systemPrompt, userPrompt);
  } catch (error) {
    if (shouldDisableFlowModelForSession(error)) {
      cachedAvailabilityIssue = describeFlowModelError(error);

      if (provider === "openai") {
        cachedOpenAiClient = null;
      }
    }

    throw error;
  }
}
