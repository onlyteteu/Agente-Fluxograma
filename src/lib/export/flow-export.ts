import { toPng } from "html-to-image";
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

  const dataUrl = await toPng(element, {
    backgroundColor: "#fbf4ea",
    cacheBust: true,
    pixelRatio: 2,
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
