import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { aiFlowDocumentSchema, sanitizeAiFlowDocument } from "./flow-output";

let cachedClient: OpenAI | null | undefined;

function getApiKey() {
  return process.env.OPENAI_API_KEY?.trim();
}

function getModelName() {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

export function isFlowModelConfigured() {
  return Boolean(getApiKey());
}

function getOpenAIClient() {
  if (cachedClient !== undefined) {
    return cachedClient;
  }

  const apiKey = getApiKey();
  cachedClient = apiKey ? new OpenAI({ apiKey }) : null;

  return cachedClient;
}

export async function requestStructuredFlowDocument(
  systemPrompt: string,
  userPrompt: string,
) {
  const openai = getOpenAIClient();

  if (!openai) {
    return null;
  }

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
    throw new Error("O modelo nao retornou uma estrutura utilizavel para o fluxograma.");
  }

  return sanitizeAiFlowDocument(parsed);
}
