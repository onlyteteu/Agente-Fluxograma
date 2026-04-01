import { z } from "zod";
import type { FlowSchemaDocument } from "./types";

const flowNodeTypeSchema = z.enum(["start", "task", "gateway", "end"]);

const flowDocumentResponseSchema = z.object({
  document: z.object({
    nodes: z.array(
      z.object({
        id: z.string(),
        type: flowNodeTypeSchema,
        label: z.string(),
      }),
    ),
    edges: z.array(
      z.object({
        source: z.string(),
        target: z.string(),
        label: z.string().optional(),
      }),
    ),
  }),
  message: z.string(),
  source: z.enum(["ai", "simulator"]),
});

type FlowGenerationResponse = z.infer<typeof flowDocumentResponseSchema> & {
  document: FlowSchemaDocument;
};

async function requestFlow(payload: unknown) {
  const response = await fetch("/api/generate-flow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const responsePayload = (await response.json()) as unknown;

  if (!response.ok) {
    const errorMessage =
      typeof responsePayload === "object" &&
      responsePayload !== null &&
      "error" in responsePayload &&
      typeof responsePayload.error === "string"
        ? responsePayload.error
        : "Nao foi possivel gerar o fluxograma.";

    throw new Error(errorMessage);
  }

  return flowDocumentResponseSchema.parse(
    responsePayload,
  ) as FlowGenerationResponse;
}

export async function requestFlowGeneration(processText: string) {
  return requestFlow({
    mode: "generate",
    processText,
  });
}

export async function requestFlowRefinement(
  processText: string,
  currentDocument: FlowSchemaDocument,
  instruction: string,
) {
  return requestFlow({
    mode: "refine",
    processText,
    currentDocument,
    instruction,
  });
}
