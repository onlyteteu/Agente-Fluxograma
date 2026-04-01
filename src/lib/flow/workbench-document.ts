import { sampleFlowDocumentJson } from "./example";
import { normalizeFlowDocument } from "./normalize";
import { parseFlowDocumentJson } from "./parser";
import type { FlowSchemaDocument, NormalizedFlowDocument } from "./types";

export type FlowDocumentCounts = {
  nodeCount: number;
  edgeCount: number;
};

export type ResolvedWorkbenchDocument = {
  source: string;
  schemaDocument: FlowSchemaDocument;
  document: NormalizedFlowDocument;
  counts: FlowDocumentCounts;
};

function getFlowDocumentCounts(document: NormalizedFlowDocument): FlowDocumentCounts {
  return {
    nodeCount: document.nodes.length,
    edgeCount: document.edges.length,
  };
}

export function resolveWorkbenchDocumentFromJson(
  source: string,
): ResolvedWorkbenchDocument {
  const schemaDocument = parseFlowDocumentJson(source);
  const document = normalizeFlowDocument(schemaDocument);

  return {
    source,
    schemaDocument,
    document,
    counts: getFlowDocumentCounts(document),
  };
}

export function createInitialWorkbenchDocument() {
  return resolveWorkbenchDocumentFromJson(sampleFlowDocumentJson);
}
