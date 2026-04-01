import "server-only";

import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { sanitizeAiFlowDocument, aiFlowDocumentSchema } from "./flow-output";
import {
  buildFlowGenerationInstructions,
  buildFlowGenerationUserPrompt,
  buildFlowRefinementInstructions,
  buildFlowRefinementUserPrompt,
} from "./prompt";
import { FlowDocumentParseError } from "@/lib/flow/parser";
import { refineFlowDocumentWithInstruction } from "@/lib/flow/refine";
import { simulateFlowDocumentFromText } from "@/lib/flow/simulate";
import type { FlowSchemaDocument } from "@/lib/flow/types";

export type FlowGenerationSource = "ai" | "simulator";

export type FlowGenerationResult = {
  document: FlowSchemaDocument;
  message: string;
  source: FlowGenerationSource;
};

function shouldUseSimulatorFallback() {
  const configured = process.env.FLOWTALK_ENABLE_SIMULATOR_FALLBACK;

  if (configured === "true") {
    return true;
  }

  if (configured === "false") {
    return false;
  }

  return process.env.NODE_ENV !== "production";
}

function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  return new OpenAI({ apiKey });
}

function getModelName() {
  return process.env.OPENAI_MODEL ?? "gpt-4.1-mini";
}

function buildFallbackResult(processText: string, message: string): FlowGenerationResult {
  return {
    document: simulateFlowDocumentFromText(processText),
    message,
    source: "simulator",
  };
}

function buildRefinementFallbackResult(
  currentDocument: FlowSchemaDocument,
  instruction: string,
  message: string,
): FlowGenerationResult {
  return {
    document: refineFlowDocumentWithInstruction(currentDocument, instruction),
    message,
    source: "simulator",
  };
}

async function requestFlowFromModel(systemPrompt: string, userPrompt: string) {
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

export async function generateFlowFromText(
  processText: string,
): Promise<FlowGenerationResult> {
  const trimmed = processText.trim();

  if (!trimmed) {
    throw new Error("Descreva um processo antes de gerar o fluxograma.");
  }

  const fallbackEnabled = shouldUseSimulatorFallback();

  if (!getOpenAIClient()) {
    if (fallbackEnabled) {
      return buildFallbackResult(
        trimmed,
        "API de IA nao configurada. Usando o gerador temporario local.",
      );
    }

    throw new Error(
      "A integracao com IA ainda nao esta configurada neste ambiente. Defina OPENAI_API_KEY para gerar pelo modelo.",
    );
  }

  try {
    return {
      document: (await requestFlowFromModel(
        buildFlowGenerationInstructions(),
        buildFlowGenerationUserPrompt(trimmed),
      )) as FlowSchemaDocument,
      message: "Fluxograma gerado pela IA e validado com sucesso.",
      source: "ai",
    };
  } catch (error) {
    if (fallbackEnabled) {
      return buildFallbackResult(
        trimmed,
        "A resposta da IA nao ficou valida neste momento. Aplicando o gerador temporario local.",
      );
    }

    if (error instanceof FlowDocumentParseError) {
      throw new Error(
        "A IA respondeu, mas o JSON nao passou na validacao do schema.",
      );
    }

    if (error instanceof Error) {
      throw new Error(
        `Nao foi possivel gerar o fluxograma com IA agora. ${error.message}`,
      );
    }

    throw new Error(
      "Nao foi possivel gerar o fluxograma com IA agora. Tente novamente.",
    );
  }
}

export async function refineFlowFromInstruction(
  processText: string,
  currentDocument: FlowSchemaDocument,
  instruction: string,
): Promise<FlowGenerationResult> {
  const trimmedInstruction = instruction.trim();

  if (!trimmedInstruction) {
    throw new Error("Escreva uma instrucao antes de refinar o fluxograma.");
  }

  const fallbackEnabled = shouldUseSimulatorFallback();

  if (!getOpenAIClient()) {
    if (fallbackEnabled) {
      return buildRefinementFallbackResult(
        currentDocument,
        trimmedInstruction,
        "IA nao configurada. Aplicando refinamento local sobre o fluxo atual.",
      );
    }

    throw new Error(
      "A integracao com IA ainda nao esta configurada neste ambiente. Defina OPENAI_API_KEY para refinar pelo modelo.",
    );
  }

  try {
    return {
      document: (await requestFlowFromModel(
        buildFlowRefinementInstructions(),
        buildFlowRefinementUserPrompt(
          processText.trim(),
          JSON.stringify(currentDocument, null, 2),
          trimmedInstruction,
        ),
      )) as FlowSchemaDocument,
      message: "Fluxograma refinado pela IA e validado com sucesso.",
      source: "ai",
    };
  } catch (error) {
    if (fallbackEnabled) {
      return buildRefinementFallbackResult(
        currentDocument,
        trimmedInstruction,
        "A IA nao refinou o fluxo de forma valida neste momento. Aplicando o fallback local sobre a estrutura atual.",
      );
    }

    if (error instanceof FlowDocumentParseError) {
      throw new Error(
        "A IA respondeu, mas o JSON refinado nao passou na validacao do schema.",
      );
    }

    if (error instanceof Error) {
      throw new Error(
        `Nao foi possivel refinar o fluxograma com IA agora. ${error.message}`,
      );
    }

    throw new Error(
      "Nao foi possivel refinar o fluxograma com IA agora. Tente novamente.",
    );
  }
}
