import { z } from "zod";
import { flowNodeTypes } from "./types";

const trimmedString = z.string().trim().min(1);

export const flowNodeTypeSchema = z.enum(flowNodeTypes);

export const flowSchemaNodeSchema = z.object({
  id: trimmedString,
  type: flowNodeTypeSchema,
  label: trimmedString,
});

export const flowSchemaEdgeSchema = z.object({
  source: trimmedString,
  target: trimmedString,
  label: z.string().trim().min(1).optional(),
});

export const flowSchemaDocumentSchema = z.object({
  nodes: z.array(flowSchemaNodeSchema).min(1),
  edges: z.array(flowSchemaEdgeSchema),
});
