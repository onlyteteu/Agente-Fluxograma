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

export async function requestFlowGeneration(processText: string) {
  const response = await fetch("/api/generate-flow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      processText,
    }),
  });

  const payload = (await response.json()) as unknown;

  if (!response.ok) {
    const errorMessage =
      typeof payload === "object" &&
      payload !== null &&
      "error" in payload &&
      typeof payload.error === "string"
        ? payload.error
        : "Nao foi possivel gerar o fluxograma.";

    throw new Error(errorMessage);
  }

  return flowDocumentResponseSchema.parse(payload) as FlowGenerationResponse;
}
