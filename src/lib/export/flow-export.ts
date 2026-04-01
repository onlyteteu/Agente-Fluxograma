import { getNodesBounds, getViewportForBounds } from "@xyflow/react";
import { toPng } from "html-to-image";
import { layoutFlowDocument } from "@/lib/flow/layout";
import { normalizeFlowDocument } from "@/lib/flow/normalize";
import type { FlowSchemaDocument } from "@/lib/flow/types";

export const FLOW_PREVIEW_EXPORT_ID = "flowtalk-preview-export-root";

export type FlowPdfExportPayload = {
  title: string;
  processText: string;
  document: FlowSchemaDocument;
  imageFileName: string;
  exportedAt: string;
};

function slugify(input: string) {
  return input
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildBaseName(processText: string) {
  const fallback = "fluxograma-flowtalk";
  const compact = processText.trim().split(/\s+/).slice(0, 6).join("-");
  const slug = slugify(compact);

  return slug ? `flowtalk-${slug}` : fallback;
}

function downloadDataUrl(dataUrl: string, fileName: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = fileName;
  link.click();
}

function resolveExportTarget(element: HTMLElement) {
  const viewport = element.querySelector(".react-flow__viewport");

  if (viewport instanceof HTMLElement) {
    return viewport;
  }

  return element;
}

export function buildPdfExportPayload(
  processText: string,
  document: FlowSchemaDocument,
): FlowPdfExportPayload {
  return {
    title: "Fluxograma FlowTalk",
    processText,
    document,
    imageFileName: `${buildBaseName(processText)}.png`,
    exportedAt: new Date().toISOString(),
  };
}

export async function exportFlowPreviewAsImage(
  element: HTMLElement,
  payload: FlowPdfExportPayload,
) {
  const fileName = payload.imageFileName;
  const exportTarget = resolveExportTarget(element);
  const bounds = element.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));
  const normalizedDocument = normalizeFlowDocument(payload.document);
  const { nodes } = layoutFlowDocument(normalizedDocument);
  const nodesBounds = getNodesBounds(nodes);
  const viewport = getViewportForBounds(
    nodesBounds,
    width,
    height,
    0.5,
    2,
    0.08,
  );

  const dataUrl = await toPng(exportTarget, {
    backgroundColor: "#fbf4ea",
    cacheBust: true,
    pixelRatio: 2,
    width,
    height,
    canvasWidth: width * 2,
    canvasHeight: height * 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      background: "#fbf4ea",
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
      transformOrigin: "0 0",
    },
    filter: (node) => {
      if (!(node instanceof HTMLElement)) {
        return true;
      }

      if (node.dataset.exportIgnore === "true") {
        return false;
      }

      return !(
        node.classList.contains("react-flow__controls") ||
        node.classList.contains("react-flow__minimap")
      );
    },
  });

  downloadDataUrl(dataUrl, fileName);

  return {
    fileName,
    dataUrl,
  };
}
