import type { Canvas } from "fabric";

export type PointLike = {
  x: number;
  y: number;
};

export type ViewportLike = {
  zoom: number;
  panX: number;
  panY: number;
};

export type LabelRectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export function clientToCanvasPoint(
  clientX: number,
  clientY: number,
  canvasEl: HTMLCanvasElement,
): PointLike {
  const rect = canvasEl.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

export function canvasToWorldPoint(
  canvasX: number,
  canvasY: number,
  viewport: ViewportLike,
): PointLike {
  return {
    x: (canvasX - viewport.panX) / viewport.zoom,
    y: (canvasY - viewport.panY) / viewport.zoom,
  };
}

export function worldToCanvasPoint(
  worldX: number,
  worldY: number,
  viewport: ViewportLike,
): PointLike {
  return {
    x: worldX * viewport.zoom + viewport.panX,
    y: worldY * viewport.zoom + viewport.panY,
  };
}

export function worldToLabelLocalPoint(
  worldX: number,
  worldY: number,
  labelRect: LabelRectLike,
): PointLike {
  return {
    x: worldX - labelRect.left,
    y: worldY - labelRect.top,
  };
}

export function labelLocalToWorldPoint(
  localX: number,
  localY: number,
  labelRect: LabelRectLike,
): PointLike {
  return {
    x: localX + labelRect.left,
    y: localY + labelRect.top,
  };
}

export function clientToLabelLocalPoint(
  clientX: number,
  clientY: number,
  canvasEl: HTMLCanvasElement,
  viewport: ViewportLike,
  labelRect: LabelRectLike,
): PointLike {
  const canvasPoint = clientToCanvasPoint(clientX, clientY, canvasEl);
  const worldPoint = canvasToWorldPoint(canvasPoint.x, canvasPoint.y, viewport);
  return worldToLabelLocalPoint(worldPoint.x, worldPoint.y, labelRect);
}

export function isWorldPointInLabel(
  worldX: number,
  worldY: number,
  labelRect: LabelRectLike,
): boolean {
  return (
    worldX >= labelRect.left &&
    worldX <= labelRect.left + labelRect.width &&
    worldY >= labelRect.top &&
    worldY <= labelRect.top + labelRect.height
  );
}

export function getLabelViewport(
  canvasWidth: number,
  canvasHeight: number,
  labelRect: LabelRectLike,
  paddingFactor = 0.7,
): ViewportLike {
  const zoomX = canvasWidth / labelRect.width;
  const zoomY = canvasHeight / labelRect.height;
  const zoom = Math.min(zoomX, zoomY) * paddingFactor;
  const panX = (canvasWidth - labelRect.width * zoom) / 2 - labelRect.left * zoom;
  const panY = (canvasHeight - labelRect.height * zoom) / 2 - labelRect.top * zoom;

  return { zoom, panX, panY };
}

export function getZoomToFitLabel(
  canvas: Canvas,
  labelRect: LabelRectLike,
  paddingFactor = 0.7,
) {
  const canvasWidth = canvas.getWidth()
  const canvasHeight = canvas.getHeight()
  const zoomX = canvasWidth / labelRect.width;
  const zoomY = canvasHeight / labelRect.height;
  const zoom = Math.min(zoomX, zoomY) * paddingFactor;
  return zoom;
}