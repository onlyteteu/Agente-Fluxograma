import { normalizeFlowDocument } from "./normalize";
import { parseFlowDocument } from "./parser";

export const mockFlowDocumentInput = {
  nodes: [
    {
      id: "capture",
      type: "start",
      label: "Usuario descreve o processo",
    },
    {
      id: "interpret",
      type: "task",
      label: "IA organiza etapas e relacoes",
    },
    {
      id: "validation",
      type: "gateway",
      label: "Estrutura valida?",
    },
    {
      id: "refine",
      type: "task",
      label: "Refina instrucoes e tenta novamente",
    },
    {
      id: "render",
      type: "task",
      label: "Monta o fluxograma com auto layout",
    },
    {
      id: "editing",
      type: "end",
      label: "Fluxograma pronto para visualizar e editar",
    },
  ],
  edges: [
    {
      source: "capture",
      target: "interpret",
    },
    {
      source: "interpret",
      target: "validation",
    },
    {
      source: "validation",
      target: "render",
      label: "Sim",
    },
    {
      source: "validation",
      target: "refine",
      label: "Nao",
    },
    {
      source: "refine",
      target: "interpret",
    },
    {
      source: "render",
      target: "editing",
    },
  ],
} as const;

export const mockFlowDocument = normalizeFlowDocument(
  parseFlowDocument(mockFlowDocumentInput),
);
