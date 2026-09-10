import { Canvas, FabricObject } from "fabric";

export function objectInsideCanvas(object: FabricObject, canvas: Pick<Canvas, "width" | "height">, safeMargin = 0) {
  object.setCoords();
  let box = object.getBoundingRect();
  const availableWidth = Math.max(1, canvas.width - safeMargin * 2);
  const availableHeight = Math.max(1, canvas.height - safeMargin * 2);
  if (box.width > availableWidth || box.height > availableHeight) {
    const fitScale = Math.min(availableWidth / box.width, availableHeight / box.height);
    object.set({ scaleX: (object.scaleX ?? 1) * fitScale, scaleY: (object.scaleY ?? 1) * fitScale });
    object.setCoords();
    box = object.getBoundingRect();
  }
  let nextLeft = object.left;
  let nextTop = object.top;
  if (box.left < safeMargin) nextLeft += safeMargin - box.left;
  if (box.top < safeMargin) nextTop += safeMargin - box.top;
  if (box.left + box.width > canvas.width - safeMargin) nextLeft -= box.left + box.width - (canvas.width - safeMargin);
  if (box.top + box.height > canvas.height - safeMargin) nextTop -= box.top + box.height - (canvas.height - safeMargin);
  object.set({ left: nextLeft, top: nextTop });
  object.setCoords();
}

