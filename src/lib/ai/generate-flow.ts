import "server-only";

import {
  describeFlowModelError,
  isFlowModelConfigured,
  requestStructuredFlowDocument,
} from "./model-client";
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

type RunFlowOperationOptions = {
  inputErrorMessage: string;
  missingModelMessage: string;
  successMessage: string;
  fallbackMessage: string;
  prompt: {
    system: string;
    user: string;
  };
  fallback: () => FlowSchemaDocument;
  inputIsEmpty: boolean;
};

function appendFallbackReason(baseMessage: string, reason: string) {
  return `${baseMessage} Motivo: ${reason}`;
}

async function runFlowOperation(
  options: RunFlowOperationOptions,
): Promise<FlowGenerationResult> {
  const fallbackEnabled = shouldUseSimulatorFallback();

  if (options.inputIsEmpty) {
    throw new Error(options.inputErrorMessage);
  }

  if (!isFlowModelConfigured()) {
    if (fallbackEnabled) {
      return {
        document: options.fallback(),
        message: options.fallbackMessage,
        source: "simulator",
      };
    }

    throw new Error(options.missingModelMessage);
  }

  try {
    return {
      document: (await requestStructuredFlowDocument(
        options.prompt.system,
        options.prompt.user,
      )) as FlowSchemaDocument,
      message: options.successMessage,
      source: "ai",
    };
  } catch (error) {
    console.error("[flowtalk] AI flow operation failed", error);

    if (fallbackEnabled) {
      const fallbackReason =
        error instanceof FlowDocumentParseError
          ? "A resposta da IA nao passou na validacao do schema."
          : describeFlowModelError(error);

      return {
        document: options.fallback(),
        message: appendFallbackReason(options.fallbackMessage, fallbackReason),
        source: "simulator",
      };
    }

    if (error instanceof FlowDocumentParseError) {
      throw error;
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("O modelo nao retornou um fluxograma valido.");
  }
}

export async function generateFlowFromText(
  processText: string,
): Promise<FlowGenerationResult> {
  const trimmed = processText.trim();

  try {
    return await runFlowOperation({
      inputErrorMessage: "Descreva um processo antes de gerar o fluxograma.",
      missingModelMessage:
        "A integracao com IA ainda nao esta configurada neste ambiente. Defina OPENAI_API_KEY para gerar pelo modelo.",
      successMessage: "Fluxograma gerado pela IA e validado com sucesso.",
      fallbackMessage:
        "API de IA nao configurada ou indisponivel. Usando o gerador temporario local.",
      prompt: {
        system: buildFlowGenerationInstructions(),
        user: buildFlowGenerationUserPrompt(trimmed),
      },
      fallback: () => buildFallbackResult(trimmed, "").document,
      inputIsEmpty: !trimmed,
    });
  } catch (error) {
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

  try {
    return await runFlowOperation({
      inputErrorMessage: "Escreva uma instrucao antes de refinar o fluxograma.",
      missingModelMessage:
        "A integracao com IA ainda nao esta configurada neste ambiente. Defina OPENAI_API_KEY para refinar pelo modelo.",
      successMessage: "Fluxograma refinado pela IA e validado com sucesso.",
      fallbackMessage:
        "A IA nao refinou o fluxo de forma valida neste momento. Aplicando o fallback local sobre a estrutura atual.",
      prompt: {
        system: buildFlowRefinementInstructions(),
        user: buildFlowRefinementUserPrompt(
          processText.trim(),
          JSON.stringify(currentDocument, null, 2),
          trimmedInstruction,
        ),
      },
      fallback: () =>
        buildRefinementFallbackResult(currentDocument, trimmedInstruction, "")
          .document,
      inputIsEmpty: !trimmedInstruction,
    });
  } catch (error) {
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
