import { getSmoothStepPath, Position } from "@xyflow/react";
import {
  getFlowNodeDimension,
  getFlowNodeHandleInset,
  getFlowNodeSurfaceRect,
  layoutFlowDocument,
} from "@/lib/flow/layout";
import { normalizeFlowDocument } from "@/lib/flow/normalize";
import type {
  FlowSchemaDocument,
  NormalizedFlowEdge,
  NormalizedFlowNode,
} from "@/lib/flow/types";

export const FLOW_PREVIEW_EXPORT_ID = "flowtalk-preview-export-root";

export type FlowPdfExportPayload = {
  title: string;
  processText: string;
  document: FlowSchemaDocument;
  imageFileName: string;
  exportedAt: string;
};

type PositionedFlowNode = ReturnType<typeof layoutFlowDocument>["nodes"][number];

type Bounds = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

type ExportLayout = {
  width: number;
  height: number;
  shiftX: number;
  shiftY: number;
  nodes: PositionedFlowNode[];
  edges: NormalizedFlowEdge[];
};

const EXPORT_PADDING = 88;
const EXPORT_FRAME_PADDING = 28;
const EXPORT_MIN_WIDTH = 820;
const EXPORT_MIN_HEIGHT = 560;
const EXPORT_PIXEL_RATIO = 3;
const EXPORT_BACKGROUND = "#fbf4ea";
const MONO_FONT = "500 11px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const MONO_SMALL_FONT = "500 10px ui-monospace, 'SFMono-Regular', Menlo, Consolas, monospace";
const BODY_FONT = "400 13px 'Segoe UI', system-ui, sans-serif";
const TITLE_FONT = "600 20px 'Segoe UI', system-ui, sans-serif";
const TITLE_MEDIUM_FONT = "600 16px 'Segoe UI', system-ui, sans-serif";
const TITLE_SMALL_FONT = "600 15px 'Segoe UI', system-ui, sans-serif";

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

function getNodesBounds(nodes: PositionedFlowNode[]): Bounds {
  const minX = Math.min(...nodes.map((node) => node.position.x));
  const minY = Math.min(...nodes.map((node) => node.position.y));
  const maxX = Math.max(
    ...nodes.map((node) => {
      const dimension = getFlowNodeDimension(node.data.type);
      return node.position.x + dimension.width;
    }),
  );
  const maxY = Math.max(
    ...nodes.map((node) => {
      const dimension = getFlowNodeDimension(node.data.type);
      return node.position.y + dimension.height;
    }),
  );

  return {
    minX,
    minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

function buildExportLayout(
  element: HTMLElement,
  document: FlowSchemaDocument,
): ExportLayout {
  const normalizedDocument = normalizeFlowDocument(document);
  const { nodes, metrics } = layoutFlowDocument(normalizedDocument);
  const bounds = getNodesBounds(nodes);
  const horizontalPadding = Math.max(
    EXPORT_PADDING - 8,
    Math.round(bounds.width * (metrics.fitPadding + 0.08)),
  );
  const verticalPadding = Math.max(
    EXPORT_PADDING - 2,
    Math.round(bounds.height * (metrics.fitPadding + 0.1)),
  );
  const width = Math.max(
    EXPORT_MIN_WIDTH,
    Math.ceil(bounds.width + horizontalPadding * 2 + EXPORT_FRAME_PADDING * 2),
  );
  const height = Math.max(
    EXPORT_MIN_HEIGHT,
    Math.ceil(bounds.height + verticalPadding * 2 + EXPORT_FRAME_PADDING * 2),
  );

  return {
    width,
    height,
    shiftX: (width - bounds.width) / 2 - bounds.minX,
    shiftY: (height - bounds.height) / 2 - bounds.minY,
    nodes,
    edges: normalizedDocument.edges,
  };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const boundedRadius = Math.min(radius, width / 2, height / 2);

  context.beginPath();
  context.moveTo(x + boundedRadius, y);
  context.lineTo(x + width - boundedRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + boundedRadius);
  context.lineTo(x + width, y + height - boundedRadius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - boundedRadius,
    y + height,
  );
  context.lineTo(x + boundedRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - boundedRadius);
  context.lineTo(x, y + boundedRadius);
  context.quadraticCurveTo(x, y, x + boundedRadius, y);
  context.closePath();
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fillStyle: string | CanvasGradient,
  strokeStyle?: string,
  lineWidth = 1,
) {
  context.save();
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();

  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }

  context.restore();
}

function drawCircle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  fillStyle: string | CanvasGradient,
  strokeStyle?: string,
  lineWidth = 1,
) {
  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();

  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }

  context.restore();
}

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/).filter(Boolean);

  if (words.length === 0) {
    return [""];
  }

  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;

    if (context.measureText(candidate).width <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    currentLine = word;

    if (lines.length === maxLines - 1) {
      break;
    }
  }

  if (lines.length < maxLines && currentLine) {
    lines.push(currentLine);
  }

  const usedWords = lines.join(" ").split(/\s+/).filter(Boolean).length;

  if (usedWords < words.length && lines.length > 0) {
    let lastLine = lines[lines.length - 1];

    while (
      lastLine.length > 0 &&
      context.measureText(`${lastLine}...`).width > maxWidth
    ) {
      lastLine = lastLine.slice(0, -1).trimEnd();
    }

    lines[lines.length - 1] = `${lastLine}...`;
  }

  return lines.slice(0, maxLines);
}

function drawTextLines(
  context: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  y: number,
  lineHeight: number,
  options: {
    font: string;
    fillStyle: string;
    textAlign?: CanvasTextAlign;
    globalAlpha?: number;
  },
) {
  context.save();
  context.font = options.font;
  context.fillStyle = options.fillStyle;
  context.textAlign = options.textAlign ?? "left";
  context.textBaseline = "middle";

  if (options.globalAlpha !== undefined) {
    context.globalAlpha = options.globalAlpha;
  }

  const startY = y - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    context.fillText(line, x, startY + index * lineHeight);
  });

  context.restore();
}

function drawHandle(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  drawCircle(context, x, y, 6, color, "#ffffff", 2);
}

function getTaskPalette(
  context: CanvasRenderingContext2D,
  tone: NormalizedFlowNode["tone"],
  x: number,
  y: number,
  height: number,
) {
  const gradient = context.createLinearGradient(x, y, x, y + height);

  if (tone === "accent") {
    gradient.addColorStop(0, "#fff8f2");
    gradient.addColorStop(1, "rgba(255,255,255,0.92)");

    return {
      fill: gradient,
      stroke: "rgba(201,111,59,0.28)",
      color: "#2a211c",
    };
  }

  if (tone === "success") {
    gradient.addColorStop(0, "#f1fcf8");
    gradient.addColorStop(1, "rgba(255,255,255,0.92)");

    return {
      fill: gradient,
      stroke: "rgba(31,122,99,0.22)",
      color: "#17352d",
    };
  }

  if (tone === "dark") {
    gradient.addColorStop(0, "#2e2822");
    gradient.addColorStop(1, "#171411");

    return {
      fill: gradient,
      stroke: "rgba(16,14,12,0.12)",
      color: "#f6efe2",
    };
  }

  gradient.addColorStop(0, "#ffffff");
  gradient.addColorStop(1, "#fbf7f0");

  return {
    fill: gradient,
    stroke: "rgba(28,27,25,0.08)",
    color: "#1f1d1a",
  };
}

function drawStartNode(
  context: CanvasRenderingContext2D,
  node: PositionedFlowNode,
  shiftX: number,
  shiftY: number,
) {
  const dimension = getFlowNodeDimension(node.data.type);
  const surface = getFlowNodeSurfaceRect(node.data.type);
  const frameX = node.position.x + shiftX;
  const frameY = node.position.y + shiftY;
  const x = frameX + surface.x;
  const y = frameY + surface.y;
  const centerX = x + surface.width / 2;
  const centerY = y + surface.height / 2;
  const outerRadius = surface.width / 2;
  const innerRadius = Math.round(outerRadius * 0.76);
  const handleInset = getFlowNodeHandleInset(node.data.type);

  drawHandle(context, frameX + dimension.width / 2, frameY + handleInset, "#c96f3b");
  drawHandle(
    context,
    frameX + dimension.width / 2,
    frameY + dimension.height - handleInset,
    "#c96f3b",
  );

  const outerGradient = context.createRadialGradient(
    x + 44,
    y + 40,
    8,
    centerX,
    centerY,
    outerRadius + 8,
  );
  outerGradient.addColorStop(0, "#fff9f2");
  outerGradient.addColorStop(0.52, "#fff2e7");
  outerGradient.addColorStop(1, "#fae4d5");

  context.save();
  context.shadowColor = "rgba(46,35,23,0.16)";
  context.shadowBlur = 32;
  context.shadowOffsetY = 24;
  drawCircle(
    context,
    centerX,
    centerY,
    outerRadius,
    outerGradient,
    "rgba(201,111,59,0.32)",
    2,
  );
  context.restore();

  drawCircle(
    context,
    centerX,
    centerY,
    innerRadius,
    "rgba(255,255,255,0.45)",
    "rgba(255,255,255,0.6)",
  );

  drawTextLines(context, ["Inicio"], centerX, y + 48, 12, {
    font: MONO_SMALL_FONT,
    fillStyle: "#8f4a22",
    textAlign: "center",
    globalAlpha: 0.65,
  });

  context.save();
  context.font = TITLE_SMALL_FONT;
  const labelLines = wrapText(context, node.data.label, 88, 2);
  context.restore();

  drawTextLines(context, labelLines, centerX, y + 84, 18, {
    font: TITLE_SMALL_FONT,
    fillStyle: "#8f4a22",
    textAlign: "center",
  });
}

function drawEndNode(
  context: CanvasRenderingContext2D,
  node: PositionedFlowNode,
  shiftX: number,
  shiftY: number,
) {
  const dimension = getFlowNodeDimension(node.data.type);
  const surface = getFlowNodeSurfaceRect(node.data.type);
  const frameX = node.position.x + shiftX;
  const frameY = node.position.y + shiftY;
  const x = frameX + surface.x;
  const y = frameY + surface.y;
  const centerX = x + surface.width / 2;
  const centerY = y + surface.height / 2;
  const outerRadius = Math.round(surface.width / 2 - 6);
  const innerRadius = Math.round(outerRadius * 0.74);
  const handleInset = getFlowNodeHandleInset(node.data.type);

  drawHandle(context, frameX + dimension.width / 2, frameY + handleInset, "#2e2822");
  drawHandle(
    context,
    frameX + dimension.width / 2,
    frameY + dimension.height - handleInset,
    "#2e2822",
  );

  const outerGradient = context.createRadialGradient(
    x + 46,
    y + 44,
    8,
    centerX,
    centerY,
    outerRadius + 10,
  );
  outerGradient.addColorStop(0, "#494036");
  outerGradient.addColorStop(0.58, "#1f1c18");
  outerGradient.addColorStop(1, "#13110e");

  context.save();
  context.shadowColor = "rgba(20,16,12,0.22)";
  context.shadowBlur = 34;
  context.shadowOffsetY = 28;
  drawCircle(
    context,
    centerX,
    centerY,
    outerRadius,
    outerGradient,
    "rgba(16,14,12,0.16)",
    4,
  );
  context.restore();

  drawCircle(
    context,
    centerX,
    centerY,
    innerRadius,
    "rgba(0,0,0,0.1)",
    "rgba(255,255,255,0.12)",
  );

  drawTextLines(context, ["Fim"], centerX, y + 49, 12, {
    font: MONO_SMALL_FONT,
    fillStyle: "#ffffff",
    textAlign: "center",
    globalAlpha: 0.58,
  });

  context.save();
  context.font = TITLE_SMALL_FONT;
  const labelLines = wrapText(context, node.data.label, 90, 2);
  context.restore();

  drawTextLines(context, labelLines, centerX, y + 86, 18, {
    font: TITLE_SMALL_FONT,
    fillStyle: "#ffffff",
    textAlign: "center",
  });
}

function drawTaskNode(
  context: CanvasRenderingContext2D,
  node: PositionedFlowNode,
  shiftX: number,
  shiftY: number,
) {
  const dimension = getFlowNodeDimension(node.data.type);
  const surface = getFlowNodeSurfaceRect(node.data.type);
  const frameX = node.position.x + shiftX;
  const frameY = node.position.y + shiftY;
  const x = frameX + surface.x;
  const y = frameY + surface.y;
  const palette = getTaskPalette(context, node.data.tone, x, y, surface.height);
  const handleInset = getFlowNodeHandleInset(node.data.type);

  drawHandle(context, frameX + dimension.width / 2, frameY + handleInset, "#8b7c6c");
  drawHandle(
    context,
    frameX + dimension.width / 2,
    frameY + dimension.height - handleInset,
    "#8b7c6c",
  );

  context.save();
  context.shadowColor = "rgba(46,35,23,0.14)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 24;
  fillRoundedRect(
    context,
    x,
    y,
    surface.width,
    surface.height,
    30,
    palette.fill,
    palette.stroke,
  );
  context.restore();

  fillRoundedRect(
    context,
    x + 16,
    y + 16,
    40,
    40,
    12,
    "rgba(255,255,255,0.4)",
    "rgba(255,255,255,0.45)",
  );

  context.save();
  context.strokeStyle = palette.color;
  context.globalAlpha = 0.35;
  roundedRect(context, x + 22, y + 24, 16, 12, 3);
  context.stroke();
  context.restore();

  context.save();
  context.strokeStyle = palette.color;
  context.globalAlpha = 0.18;
  context.beginPath();
  context.moveTo(x + 22, y + 31);
  context.lineTo(x + 70, y + 31);
  context.stroke();
  context.restore();

  drawTextLines(context, [node.data.eyebrow], x + 70, y + 24, 12, {
    font: MONO_FONT,
    fillStyle: palette.color,
    globalAlpha: 0.65,
  });

  context.save();
  context.font = TITLE_FONT;
  const labelLines = wrapText(context, node.data.label, 252, 3);
  context.restore();

  drawTextLines(context, labelLines, x + 70, y + 62, 22, {
    font: TITLE_FONT,
    fillStyle: palette.color,
  });

  context.save();
  context.font = BODY_FONT;
  const descriptionLines = wrapText(context, node.data.description, 244, 2);
  context.restore();

  drawTextLines(context, descriptionLines, x + 70, y + 108, 18, {
    font: BODY_FONT,
    fillStyle: palette.color,
    globalAlpha: 0.72,
  });
}

function drawGatewayNode(
  context: CanvasRenderingContext2D,
  node: PositionedFlowNode,
  shiftX: number,
  shiftY: number,
) {
  const dimension = getFlowNodeDimension(node.data.type);
  const frameX = node.position.x + shiftX;
  const frameY = node.position.y + shiftY;
  const centerX = frameX + dimension.width / 2;
  const centerY = frameY + dimension.height / 2;
  const outerSize = 164;
  const innerSize = 120;
  const handleInset = getFlowNodeHandleInset(node.data.type);

  drawHandle(context, centerX, frameY + handleInset, "#1f7a63");
  drawHandle(context, centerX, frameY + dimension.height - handleInset, "#1f7a63");

  const outerGradient = context.createLinearGradient(
    centerX,
    centerY - outerSize / 2,
    centerX,
    centerY + outerSize / 2,
  );
  outerGradient.addColorStop(0, "#f4fcf8");
  outerGradient.addColorStop(1, "rgba(255,255,255,0.92)");

  context.save();
  context.translate(centerX, centerY);
  context.rotate(Math.PI / 4);
  context.shadowColor = "rgba(24,77,63,0.14)";
  context.shadowBlur = 28;
  context.shadowOffsetY = 24;
  fillRoundedRect(
    context,
    -outerSize / 2,
    -outerSize / 2,
    outerSize,
    outerSize,
    30,
    outerGradient,
    "rgba(31,122,99,0.28)",
  );
  context.restore();

  context.save();
  context.translate(centerX, centerY);
  context.rotate(Math.PI / 4);
  fillRoundedRect(
    context,
    -innerSize / 2,
    -innerSize / 2,
    innerSize,
    innerSize,
    22,
    "rgba(255,255,255,0.72)",
    "rgba(31,122,99,0.12)",
  );
  context.restore();

  drawTextLines(context, ["Decisao"], centerX, frameY + 86, 12, {
    font: MONO_SMALL_FONT,
    fillStyle: "#17352d",
    textAlign: "center",
    globalAlpha: 0.65,
  });

  context.save();
  context.font = TITLE_MEDIUM_FONT;
  const labelLines = wrapText(context, node.data.label, 138, 3);
  context.restore();

  drawTextLines(context, labelLines, centerX, frameY + 128, 18, {
    font: TITLE_MEDIUM_FONT,
    fillStyle: "#17352d",
    textAlign: "center",
  });
}

function drawNode(
  context: CanvasRenderingContext2D,
  node: PositionedFlowNode,
  shiftX: number,
  shiftY: number,
) {
  if (node.data.type === "start") {
    drawStartNode(context, node, shiftX, shiftY);
    return;
  }

  if (node.data.type === "end") {
    drawEndNode(context, node, shiftX, shiftY);
    return;
  }

  if (node.data.type === "gateway") {
    drawGatewayNode(context, node, shiftX, shiftY);
    return;
  }

  drawTaskNode(context, node, shiftX, shiftY);
}

function getNodeCenterX(node: PositionedFlowNode) {
  const dimension = getFlowNodeDimension(node.data.type);
  return node.position.x + dimension.width / 2;
}

function getNodeSourceY(node: PositionedFlowNode) {
  const dimension = getFlowNodeDimension(node.data.type);
  return node.position.y + dimension.height - getFlowNodeHandleInset(node.data.type);
}

function getNodeTargetY(node: PositionedFlowNode) {
  return node.position.y + getFlowNodeHandleInset(node.data.type);
}

function drawArrowHead(
  context: CanvasRenderingContext2D,
  tipX: number,
  tipY: number,
  color: string,
) {
  context.save();
  context.fillStyle = color;
  context.beginPath();
  context.moveTo(tipX, tipY);
  context.lineTo(tipX - 8, tipY - 16);
  context.lineTo(tipX + 8, tipY - 16);
  context.closePath();
  context.fill();
  context.restore();
}

function drawEdge(
  context: CanvasRenderingContext2D,
  edge: NormalizedFlowEdge,
  nodeMap: Map<string, PositionedFlowNode>,
  shiftX: number,
  shiftY: number,
) {
  const sourceNode = nodeMap.get(edge.source);
  const targetNode = nodeMap.get(edge.target);

  if (!sourceNode || !targetNode) {
    return;
  }

  const sourceX = getNodeCenterX(sourceNode) + shiftX;
  const sourceY = getNodeSourceY(sourceNode) + shiftY;
  const targetX = getNodeCenterX(targetNode) + shiftX;
  const targetY = getNodeTargetY(targetNode) + shiftY;
  const strokeColor = edge.label ? "#1f7a63" : "#73685d";
  const strokeWidth = edge.label ? 2.6 : 2.2;
  const [pathData, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition: Position.Bottom,
    targetX,
    targetY,
    targetPosition: Position.Top,
    borderRadius: 22,
    offset: 24,
    stepPosition: 0.5,
  });

  context.save();
  context.strokeStyle = strokeColor;
  context.lineWidth = strokeWidth;
  context.lineJoin = "round";
  context.lineCap = "round";
  context.stroke(new Path2D(pathData));
  context.restore();

  drawArrowHead(context, targetX, targetY, strokeColor);

  if (!edge.label) {
    return;
  }

  context.save();
  context.font = "700 12px 'Segoe UI', system-ui, sans-serif";
  const labelWidth = Math.max(70, context.measureText(edge.label).width + 24);
  context.restore();

  fillRoundedRect(
    context,
    labelX - labelWidth / 2,
    labelY - 16,
    labelWidth,
    32,
    16,
    "#fffaf0",
    "rgba(28,27,25,0.08)",
  );

  drawTextLines(context, [edge.label], labelX, labelY + 1, 12, {
    font: "700 12px 'Segoe UI', system-ui, sans-serif",
    fillStyle: "#2d2925",
    textAlign: "center",
  });
}

function drawBackground(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
) {
  context.fillStyle = EXPORT_BACKGROUND;
  context.fillRect(0, 0, width, height);

  const surfaceX = EXPORT_FRAME_PADDING;
  const surfaceY = EXPORT_FRAME_PADDING;
  const surfaceWidth = width - EXPORT_FRAME_PADDING * 2;
  const surfaceHeight = height - EXPORT_FRAME_PADDING * 2;
  const surfaceGradient = context.createRadialGradient(
    width / 2,
    surfaceY,
    40,
    width / 2,
    height / 2,
    Math.max(width, height),
  );
  surfaceGradient.addColorStop(0, "rgba(255,255,255,0.88)");
  surfaceGradient.addColorStop(1, "rgba(252,246,237,0.95)");

  fillRoundedRect(
    context,
    surfaceX,
    surfaceY,
    surfaceWidth,
    surfaceHeight,
    32,
    surfaceGradient,
    "rgba(28,27,25,0.08)",
  );

  context.save();
  context.fillStyle = "rgba(120,105,91,0.14)";
  for (let y = surfaceY + 12; y < surfaceY + surfaceHeight; y += 22) {
    for (let x = surfaceX + 12; x < surfaceX + surfaceWidth; x += 22) {
      context.beginPath();
      context.arc(x, y, 1.1, 0, Math.PI * 2);
      context.fill();
    }
  }
  context.restore();

  context.save();
  context.filter = "blur(48px)";
  drawCircle(
    context,
    surfaceX + 112,
    surfaceY + 102,
    54,
    "rgba(201,111,59,0.14)",
  );
  drawCircle(
    context,
    surfaceX + surfaceWidth - 124,
    surfaceY + surfaceHeight - 116,
    66,
    "rgba(31,122,99,0.11)",
  );
  context.restore();
}

function renderFlowToCanvas(
  context: CanvasRenderingContext2D,
  layout: ExportLayout,
) {
  drawBackground(context, layout.width, layout.height);

  const nodeMap = new Map(layout.nodes.map((node) => [node.id, node]));

  layout.edges.forEach((edge) => {
    drawEdge(context, edge, nodeMap, layout.shiftX, layout.shiftY);
  });

  layout.nodes.forEach((node) => {
    drawNode(context, node, layout.shiftX, layout.shiftY);
  });
}

function createExportCanvas(layout: ExportLayout) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Nao foi possivel preparar o canvas da exportacao.");
  }

  canvas.width = layout.width * EXPORT_PIXEL_RATIO;
  canvas.height = layout.height * EXPORT_PIXEL_RATIO;
  canvas.style.width = `${layout.width}px`;
  canvas.style.height = `${layout.height}px`;

  context.scale(EXPORT_PIXEL_RATIO, EXPORT_PIXEL_RATIO);
  context.fillStyle = EXPORT_BACKGROUND;
  context.fillRect(0, 0, layout.width, layout.height);
  renderFlowToCanvas(context, layout);

  return canvas;
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
  const layout = buildExportLayout(element, payload.document);
  const canvas = createExportCanvas(layout);
  const dataUrl = canvas.toDataURL("image/png");

  downloadDataUrl(dataUrl, payload.imageFileName);

  return {
    fileName: payload.imageFileName,
    dataUrl,
  };
}
