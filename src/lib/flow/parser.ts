import { ZodError } from "zod";
import { flowSchemaDocumentSchema } from "./schema";
import type { FlowSchemaDocument } from "./types";

export class FlowDocumentParseError extends Error {
  issues: string[];

  constructor(message: string, issues: string[]) {
    super(message);
    this.name = "FlowDocumentParseError";
    this.issues = issues;
  }
}

function ensureUniqueNodeIds(document: FlowSchemaDocument) {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const node of document.nodes) {
    if (seen.has(node.id)) {
      duplicates.add(node.id);
      continue;
    }

    seen.add(node.id);
  }

  if (duplicates.size > 0) {
    throw new FlowDocumentParseError("Node ids must be unique.", [
      `Duplicated node ids: ${Array.from(duplicates).join(", ")}`,
    ]);
  }
}

function ensureEdgeReferencesExist(document: FlowSchemaDocument) {
  const nodeIds = new Set(document.nodes.map((node) => node.id));
  const missingReferences: string[] = [];

  document.edges.forEach((edge, index) => {
    if (!nodeIds.has(edge.source)) {
      missingReferences.push(
        `Edge ${index + 1} references missing source "${edge.source}".`,
      );
    }

    if (!nodeIds.has(edge.target)) {
      missingReferences.push(
        `Edge ${index + 1} references missing target "${edge.target}".`,
      );
    }
  });

  if (missingReferences.length > 0) {
    throw new FlowDocumentParseError(
      "Edges must reference existing node ids.",
      missingReferences,
    );
  }
}

function ensureNoDuplicateEdges(document: FlowSchemaDocument) {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const edge of document.edges) {
    const key = `${edge.source}=>${edge.target}::${edge.label ?? ""}`;

    if (seen.has(key)) {
      duplicates.push(key);
      continue;
    }

    seen.add(key);
  }

  if (duplicates.length > 0) {
    throw new FlowDocumentParseError("Edges must be unique.", duplicates);
  }
}

function formatSchemaIssues(error: ZodError) {
  return error.issues.map((issue) => {
    const path = issue.path.length > 0 ? issue.path.join(".") : "document";
    return `${path}: ${issue.message}`;
  });
}

export function parseFlowDocumentJson(input: string): FlowSchemaDocument {
  try {
    return parseFlowDocument(JSON.parse(input) as unknown);
  } catch (error) {
    if (error instanceof FlowDocumentParseError) {
      throw error;
    }

    if (error instanceof SyntaxError) {
      throw new FlowDocumentParseError("The flowchart JSON is not valid.", [
        error.message,
      ]);
    }

    throw error;
  }
}

export function parseFlowDocument(input: unknown): FlowSchemaDocument {
  try {
    const document = flowSchemaDocumentSchema.parse(input);

    ensureUniqueNodeIds(document);
    ensureEdgeReferencesExist(document);
    ensureNoDuplicateEdges(document);

    return document;
  } catch (error) {
    if (error instanceof FlowDocumentParseError) {
      throw error;
    }

    if (error instanceof ZodError) {
      throw new FlowDocumentParseError(
        "The flowchart document does not match the expected schema.",
        formatSchemaIssues(error),
      );
    }

    throw error;
  }
}
