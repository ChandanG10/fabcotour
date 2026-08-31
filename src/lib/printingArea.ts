import type { NormalizedPoint, NormalizedRect } from "../types/models";

export const unitRect: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 };

export function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeRect(rect: NormalizedRect): NormalizedRect {
  const x = clamp(rect.x);
  const y = clamp(rect.y);
  return { x, y, width: clamp(rect.width, 0, 1 - x), height: clamp(rect.height, 0, 1 - y) };
}

export function pointInPolygon(point: NormalizedPoint, polygon: NormalizedPoint[]) {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index];
    const b = polygon[previous];
    const intersects = ((a.y > point.y) !== (b.y > point.y)) &&
      point.x < (b.x - a.x) * (point.y - a.y) / ((b.y - a.y) || Number.EPSILON) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function rectInsidePolygon(rect: NormalizedRect, polygon: NormalizedPoint[]) {
  if (polygon.length < 3) return false;
  const samples: NormalizedPoint[] = [
    { x: rect.x, y: rect.y }, { x: rect.x + rect.width, y: rect.y },
    { x: rect.x, y: rect.y + rect.height }, { x: rect.x + rect.width, y: rect.y + rect.height },
    { x: rect.x + rect.width / 2, y: rect.y }, { x: rect.x + rect.width / 2, y: rect.y + rect.height },
    { x: rect.x, y: rect.y + rect.height / 2 }, { x: rect.x + rect.width, y: rect.y + rect.height / 2 },
    { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
  ];
  return samples.every((point) => pointInPolygon(point, polygon));
}

export function constrainRect(
  value: NormalizedRect,
  safe: NormalizedRect,
  limits: { minWidth: number; minHeight: number; maxWidth: number; maxHeight: number }
) {
  const width = clamp(value.width, limits.minWidth, Math.min(limits.maxWidth, safe.width));
  const height = clamp(value.height, limits.minHeight, Math.min(limits.maxHeight, safe.height));
  return {
    x: clamp(value.x, safe.x, safe.x + safe.width - width),
    y: clamp(value.y, safe.y, safe.y + safe.height - height),
    width,
    height
  };
}

export function containedImageBounds(containerWidth: number, containerHeight: number, naturalWidth: number, naturalHeight: number) {
  if (!containerWidth || !containerHeight || !naturalWidth || !naturalHeight) return { left: 0, top: 0, width: 0, height: 0 };
  const scale = Math.min(containerWidth / naturalWidth, containerHeight / naturalHeight);
  const width = naturalWidth * scale;
  const height = naturalHeight * scale;
  return { left: (containerWidth - width) / 2, top: (containerHeight - height) / 2, width, height };
}
