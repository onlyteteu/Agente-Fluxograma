import { z } from "zod";
import { parseFlowDocument } from "@/lib/flow/parser";
import { flowNodeTypeSchema } from "@/lib/flow/schema";
import type { FlowSchemaDocument } from "@/lib/flow/types";

export const aiFlowNodeSchema = z.object({
  id: z.string(),
  type: flowNodeTypeSchema,
  label: z.string(),
});

export const aiFlowEdgeSchema = z.object({
  source: z.string(),
  target: z.string(),
  label: z.string().nullable().optional(),
});

export const aiFlowDocumentSchema = z.object({
  nodes: z.array(aiFlowNodeSchema).min(2).max(7),
  edges: z.array(aiFlowEdgeSchema),
});

export type AiFlowDocument = z.infer<typeof aiFlowDocumentSchema>;

function normalizeNullableLabel(label: string | null | undefined) {
  const trimmed = label?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizeEdgeLabel(label: string | undefined) {
  if (!label) {
    return undefined;
  }

  const normalized = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (normalized === "sim") {
    return "Sim";
  }

  if (normalized === "nao") {
    return "Não";
  }

  return label;
}

export function sanitizeAiFlowDocument(
  document: AiFlowDocument,
): FlowSchemaDocument {
  return parseFlowDocument({
    nodes: document.nodes.map((node) => ({
      id: node.id.trim(),
      type: node.type,
      label: node.label.trim(),
    })),
    edges: document.edges.map((edge) => ({
      source: edge.source.trim(),
      target: edge.target.trim(),
      label: normalizeEdgeLabel(normalizeNullableLabel(edge.label)),
    })),
  });
}
