import { normalizeFlowDocument } from "./normalize";
import { parseFlowDocumentJson } from "./parser";
import type { NormalizedFlowDocument } from "./types";

export function resolveNormalizedFlowDocumentFromJson(
  input: string,
): NormalizedFlowDocument {
  return normalizeFlowDocument(parseFlowDocumentJson(input));
}
