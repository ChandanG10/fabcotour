import {
  ArrowLeft, BringToFront, Check, ChevronDown, Copy, ImagePlus, Layers3, Lock, LockOpen, Mail,
  Minus, Package, Plus, Redo2, RotateCcw, Save, ShoppingBag, Trash2, Type, Undo2, X
} from "lucide-react";
import { Canvas, FabricImage, FabricObject, FabricText } from "fabric";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { BrandLogo } from "../components/common/BrandLogo";
import { Product360Viewer } from "../components/customisation/Product360Viewer";
import { ImageCropper } from "../components/customisation/ImageCropper";
import { EmptyState, LoadingState } from "../components/common/Ui";
import { useAsyncData } from "../hooks/useAsyncData";
import { customisationService } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { containedImageBounds, constrainRect, rectInsidePolygon } from "../lib/printingArea";
import type { CustomPrintArea, CustomPricingBreakdown, ProductSide, CustomisedCartData } from "../types/models";
import { currencyFormatter } from "../utils/format";

type CanvasJson = Record<string, unknown> | null;
interface FrameRect { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number }
interface SideState { canvasJson: CanvasJson; history: CanvasJson[]; historyIndex: number; previewUrl: string | null; frame: FrameRect | null }
type SideStates = Record<ProductSide, SideState>;
type PanelName = "products" | "text" | "image" | "layers" | "order" | null;

const sides: ProductSide[] = ["front", "back", "right", "left"];
const blankSide = (): SideState => ({ canvasJson: null, history: [null], historyIndex: 0, previewUrl: null, frame: null });
const blankSides = (): SideStates => ({ front: blankSide(), back: blankSide(), right: blankSide(), left: blankSide() });
const acceptedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

function frameFromArea(area: CustomPrintArea): FrameRect {
  if (area.defaultArea) return { xPercent: area.defaultArea.x * 100, yPercent: area.defaultArea.y * 100, widthPercent: area.defaultArea.width * 100, heightPercent: area.defaultArea.height * 100 };
  return {
    xPercent: area.xPercent ?? area.x / area.referenceWidth * 100,
    yPercent: area.yPercent ?? area.y / area.referenceHeight * 100,
    widthPercent: area.widthPercent ?? area.width / area.referenceWidth * 100,
    heightPercent: area.heightPercent ?? area.height / area.referenceHeight * 100
  };
}

function normalizeStoredFrame(frame: FrameRect | ({ x: number; y: number; width: number; height: number } & Partial<FrameRect>) | null | undefined, area: CustomPrintArea): FrameRect {
  if (!frame) return frameFromArea(area);
  if (Number.isFinite(frame.xPercent) && Number.isFinite(frame.yPercent) && Number.isFinite(frame.widthPercent) && Number.isFinite(frame.heightPercent)) {
    return { xPercent: frame.xPercent!, yPercent: frame.yPercent!, widthPercent: frame.widthPercent!, heightPercent: frame.heightPercent! };
  }
  const legacy = frame as { x: number; y: number; width: number; height: number };
  if (legacy.x <= 1 && legacy.y <= 1 && legacy.width <= 1 && legacy.height <= 1) return { xPercent: legacy.x * 100, yPercent: legacy.y * 100, widthPercent: legacy.width * 100, heightPercent: legacy.height * 100 };
  return {
    xPercent: legacy.x / area.referenceWidth * 100,
    yPercent: legacy.y / area.referenceHeight * 100,
    widthPercent: legacy.width / area.referenceWidth * 100,
    heightPercent: legacy.height / area.referenceHeight * 100
  };
}

function frameToNormalized(frame: FrameRect) {
  return { x: frame.xPercent / 100, y: frame.yPercent / 100, width: frame.widthPercent / 100, height: frame.heightPercent / 100 };
}

function normalizedToFrame(frame: { x: number; y: number; width: number; height: number }): FrameRect {
  return { xPercent: frame.x * 100, yPercent: frame.y * 100, widthPercent: frame.width * 100, heightPercent: frame.height * 100 };
}

function constrainFrame(frame: FrameRect, area: CustomPrintArea) {
  return normalizedToFrame(constrainRect(frameToNormalized(frame), area.garmentSafeArea ?? { x: 0, y: 0, width: 1, height: 1 }, {
    minWidth: area.minWidthNormalized ?? .05, minHeight: area.minHeightNormalized ?? .05,
    maxWidth: area.maxWidthNormalized ?? 1, maxHeight: area.maxHeightNormalized ?? 1
  }));
}

function framePassesBoundary(frame: FrameRect, area: CustomPrintArea) {
  if (area.safeBoundaryType === "rectangle") return true;
  return area.garmentSafePolygon?.length >= 3 && rectInsidePolygon(frameToNormalized(frame), area.garmentSafePolygon);
}

function framePixelSize(frame: FrameRect, area: CustomPrintArea) {
  return {
    width: Math.max(40, Math.round(frame.widthPercent / 100 * area.referenceWidth)),
    height: Math.max(40, Math.round(frame.heightPercent / 100 * area.referenceHeight))
  };
}

function objectInsideCanvas(object: FabricObject, canvas: Canvas, safeMargin = 0) {
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

function usedSidesFrom(states: SideStates) {
  return sides.filter((side) => {
    const objects = states[side].canvasJson?.objects;
    return Array.isArray(objects) && objects.length > 0;
  });
}

function StudioButton({ label, onClick, disabled, children }: { label: string; onClick?: () => void; disabled?: boolean; children: React.ReactNode }) {
  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className="studio-icon-button">{children}<span>{label}</span></button>;
}

export default function CustomDesignerPage() {
  const { productSlug = "" } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const canvasElement = useRef<HTMLCanvasElement | null>(null);
  const canvasStageElement = useRef<HTMLDivElement | null>(null);
  const productImageElement = useRef<HTMLImageElement | null>(null);
  const fabricCanvas = useRef<Canvas | null>(null);
  const statesRef = useRef<SideStates>(blankSides());
  const applyingHistory = useRef(false);
  const copiedObject = useRef<Record<string, unknown> | null>(null);
  const uploadController = useRef<AbortController | null>(null);
  const [activeSide, setActiveSide] = useState<ProductSide>("front");
  const activeSideRef = useRef<ProductSide>("front");
  const [panel, setPanel] = useState<PanelName>("text");
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [textValue, setTextValue] = useState("Your idea");
  const [fontSize, setFontSize] = useState(42);
  const [textColour, setTextColour] = useState("#07163d");
  const [textBold, setTextBold] = useState(true);
  const [textItalic, setTextItalic] = useState(false);
  const [textUnderline, setTextUnderline] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingFrame, setEditingFrame] = useState(false);
  const [drawingFrame, setDrawingFrame] = useState(false);
  const [pendingFrame, setPendingFrame] = useState<FrameRect | null>(null);
  const frameBeforeEdit = useRef<FrameRect | null>(null);
  const drawStart = useRef<{ x: number; y: number } | null>(null);
  const [cropFile, setCropFile] = useState<File | null>(null);
  const [dpiNotice, setDpiNotice] = useState<{ dpi: number; status: "ok" | "warning" } | null>(null);
  const [frameRevision, setFrameRevision] = useState(0);
  const [imageBounds, setImageBounds] = useState({ left: 0, top: 0, width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [size, setSize] = useState("");
  const [methodId, setMethodId] = useState("");
  const [pricing, setPricing] = useState<CustomPricingBreakdown | null>(null);
  const [pricingBusy, setPricingBusy] = useState(false);
  const [customerNote, setCustomerNote] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const tutorialTrigger = useRef<HTMLButtonElement | null>(null);
  const [preview360Open, setPreview360Open] = useState(false);
  const preview360Trigger = useRef<HTMLButtonElement | null>(null);
  const [dirty, setDirty] = useState(false);
  const [draftRevision, setDraftRevision] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const addToCart = useAppStore((state) => state.addToCart);
  const updateCustomCartItem = useAppStore((state) => state.updateCustomCartItem);
  const cartItemId = searchParams.get("cartItem");
  const editingCartItem = useAppStore((state) => cartItemId ? state.cart.find((item) => item.id === cartItemId && item.customisation)?.customisation : undefined);
  const { data: configuration, loading, error } = useAsyncData(() => customisationService.getConfiguration(productSlug), [productSlug]);

  useEffect(() => {
    setPreview360Open(false); setActiveSide("front"); activeSideRef.current = "front"; statesRef.current = blankSides();
    setSelectedObject(null); setDirty(false); setZoom(1); setEditingFrame(false); setDrawingFrame(false); setPendingFrame(null); setCropFile(null);
  }, [productSlug]);

  const selectedColour = useMemo(() => {
    if (!configuration) return undefined;
    const requested = searchParams.get("colour");
    return configuration.colours.find((colour) => colour.slug === requested) ?? configuration.colours.find((colour) => colour.isDefault) ?? configuration.colours[0];
  }, [configuration, searchParams]);
  const activeView = selectedColour?.views.find((view) => view.side === activeSide);
  const activeArea = configuration?.printAreas.find((area) => area.side === activeSide && area.colourId === selectedColour?.id)
    ?? configuration?.printAreas.find((area) => area.side === activeSide && !area.colourId);
  void frameRevision;
  const activeFrame = activeArea ? (pendingFrame ?? statesRef.current[activeSide].frame ?? frameFromArea(activeArea)) : null;
  const draftKey = configuration ? `fabpodd-custom-draft:${configuration.id}` : "";

  const syncCurrentJson = useCallback(() => {
    const canvas = fabricCanvas.current;
    if (!canvas) return null;
    const json = canvas.toJSON() as CanvasJson;
    const side = activeSideRef.current;
    if (json) (json as Record<string, unknown>).__printingArea = statesRef.current[side].frame;
    statesRef.current[side].canvasJson = json;
    statesRef.current[side].previewUrl = canvas.getObjects().length ? canvas.toDataURL({ format: "png", multiplier: 0.55 }) : null;
    return json;
  }, []);

  const pushHistory = useCallback(() => {
    if (applyingHistory.current) return;
    const json = syncCurrentJson();
    const side = activeSideRef.current;
    const current = statesRef.current[side];
    const history = current.history.slice(0, current.historyIndex + 1);
    history.push(json);
    statesRef.current[side] = { ...current, canvasJson: json, history: history.slice(-40), historyIndex: Math.min(history.length - 1, 39) };
    setDirty(true);
    setDraftRevision((value) => value + 1);
  }, [syncCurrentJson]);

  const loadSide = useCallback(async (side: ProductSide) => {
    const canvas = fabricCanvas.current;
    if (!canvas || !configuration || !selectedColour) return;
    const sideArea = configuration.printAreas.find((area) => area.side === side && area.colourId === selectedColour.id)
      ?? configuration.printAreas.find((area) => area.side === side && !area.colourId);
    if (!sideArea) return;
    const frame = constrainFrame(normalizeStoredFrame(statesRef.current[side].frame, sideArea), sideArea);
    statesRef.current[side].frame = frame;
    const frameSize = framePixelSize(frame, sideArea);
    applyingHistory.current = true;
    canvas.clear();
    canvas.setDimensions(frameSize);
    const json = statesRef.current[side].canvasJson;
    if (json) await canvas.loadFromJSON(json);
    canvas.getObjects().forEach((object) => objectInsideCanvas(object, canvas, sideArea.safeMargin));
    canvas.requestRenderAll();
    applyingHistory.current = false;
    setSelectedObject(null);
  }, [configuration, selectedColour]);

  useEffect(() => {
    activeSideRef.current = activeSide;
  }, [activeSide]);

  const measureImageBounds = useCallback(() => {
    const stage = canvasStageElement.current;
    const image = productImageElement.current;
    if (!stage || !activeView) return;
    const naturalWidth = image?.naturalWidth || activeView.naturalWidth;
    const naturalHeight = image?.naturalHeight || activeView.naturalHeight;
    if (!naturalWidth || !naturalHeight || !stage.clientWidth || !stage.clientHeight) return;
    setImageBounds(containedImageBounds(stage.clientWidth, stage.clientHeight, naturalWidth, naturalHeight));
  }, [activeView]);

  useEffect(() => {
    const stage = canvasStageElement.current;
    if (!stage) return;
    measureImageBounds();
    const observer = new ResizeObserver(measureImageBounds);
    observer.observe(stage);
    return () => observer.disconnect();
  }, [measureImageBounds, panel, zoom]);

  useEffect(() => {
    if (!configuration || !selectedColour || !canvasElement.current) return;
    const initialArea = configuration.printAreas.find((area) => area.side === "front" && area.colourId === selectedColour.id)
      ?? configuration.printAreas.find((area) => area.side === "front" && !area.colourId);
    if (!initialArea) return;
    setSize((value) => value || configuration.sizes[0]?.name || "");
    setMethodId((value) => value || configuration.printingMethods[0]?.id || "");
    const stored = window.localStorage.getItem(draftKey);
    statesRef.current = blankSides();
    if (editingCartItem && editingCartItem.customProductId === configuration.id) {
      statesRef.current = Object.fromEntries(sides.map((side) => [side, {
        canvasJson: editingCartItem.canvasJson[side], previewUrl: editingCartItem.previewUrls[side],
        history: [null, editingCartItem.canvasJson[side]], historyIndex: 1,
        frame: (() => {
          const area = configuration.printAreas.find((entry) => entry.side === side && entry.colourId === selectedColour.id)
            ?? configuration.printAreas.find((entry) => entry.side === side && !entry.colourId)!;
          return normalizeStoredFrame(editingCartItem.framePlacements?.[side] as FrameRect | ({ x: number; y: number; width: number; height: number } & Partial<FrameRect>) | undefined, area);
        })()
      }])) as SideStates;
      setSize(editingCartItem.size); setMethodId(editingCartItem.printingMethodId); setQuantity(editingCartItem.quantity); setCustomerNote(editingCartItem.customerNote);
      window.sessionStorage.setItem(`${draftKey}:uploads`, JSON.stringify(editingCartItem.originalArtworkUrls));
      toast.success("Your customised cart item is ready to edit.");
    } else if (stored) {
      try {
        const restored = JSON.parse(stored) as SideStates;
        statesRef.current = Object.fromEntries(sides.map((side) => {
          const area = configuration.printAreas.find((entry) => entry.side === side && entry.colourId === selectedColour.id)
            ?? configuration.printAreas.find((entry) => entry.side === side && !entry.colourId)!;
          return [side, { ...blankSide(), ...restored[side], frame: normalizeStoredFrame(restored[side]?.frame as FrameRect | ({ x: number; y: number; width: number; height: number } & Partial<FrameRect>) | undefined, area) }];
        })) as SideStates;
        toast.success("Your local design draft was restored.");
      } catch { window.localStorage.removeItem(draftKey); }
    }
    const canvas = new Canvas(canvasElement.current, {
      width: initialArea.width,
      height: initialArea.height,
      preserveObjectStacking: true,
      selectionColor: "rgba(8,185,212,.12)",
      selectionBorderColor: "#08b9d4"
    });
    fabricCanvas.current = canvas;
    const selectObject = (object?: FabricObject) => {
      if (object instanceof FabricText) {
        setTextValue(object.text);
        setFontSize(Number(object.fontSize || 42));
        setTextColour(String(object.fill || "#07163d"));
        setTextBold(Number(object.fontWeight || 400) >= 700);
        setTextItalic(object.fontStyle === "italic");
        setTextUnderline(Boolean(object.underline));
      }
      setSelectedObject(object ?? null);
    };
    const constrain = ({ target }: { target?: FabricObject }) => {
      const currentArea = configuration.printAreas.find((area) => area.side === activeSideRef.current && area.colourId === selectedColour.id)
        ?? configuration.printAreas.find((area) => area.side === activeSideRef.current && !area.colourId);
      if (target) objectInsideCanvas(target, canvas, currentArea?.safeMargin ?? 0);
    };
    canvas.on("object:moving", constrain);
    canvas.on("object:scaling", constrain);
    canvas.on("object:rotating", constrain);
    canvas.on("object:modified", pushHistory);
    canvas.on("object:added", pushHistory);
    canvas.on("object:removed", pushHistory);
    canvas.on("selection:created", (event) => selectObject(event.selected?.[0]));
    canvas.on("selection:updated", (event) => selectObject(event.selected?.[0]));
    canvas.on("selection:cleared", () => setSelectedObject(null));
    void loadSide("front");
    return () => { syncCurrentJson(); canvas.dispose(); fabricCanvas.current = null; };
  }, [configuration, selectedColour, draftKey, editingCartItem, loadSide, pushHistory, syncCurrentJson]);

  useEffect(() => {
    if (!draftKey || !dirty) return;
    const timeout = window.setTimeout(() => { syncCurrentJson(); window.localStorage.setItem(draftKey, JSON.stringify(statesRef.current)); }, 550);
    return () => window.clearTimeout(timeout);
  }, [dirty, draftKey, activeSide, selectedObject, draftRevision, syncCurrentJson]);

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (dirty) event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const switchSide = async (side: ProductSide) => {
    if (side === activeSide) return;
    setEditingFrame(false); setDrawingFrame(false); setPendingFrame(null);
    syncCurrentJson();
    activeSideRef.current = side;
    setActiveSide(side);
    await loadSide(side);
  };

  const frameFromRendered = (rendered: { x: number; y: number; width: number; height: number }): FrameRect => ({
      xPercent: Math.max(0, rendered.x / imageBounds.width * 100),
      yPercent: Math.max(0, rendered.y / imageBounds.height * 100),
      widthPercent: Math.max(5, rendered.width / imageBounds.width * 100),
      heightPercent: Math.max(5, rendered.height / imageBounds.height * 100)
    });

  const commitFrame = (requested: FrameRect) => {
    if (!activeArea || !imageBounds.width || !imageBounds.height) return false;
    const next = constrainFrame(requested, activeArea);
    if (!framePassesBoundary(next, activeArea)) { toast.error("Keep the complete printing area inside the configured garment boundary."); return false; }
    statesRef.current[activeSide].frame = next;
    const canvas = fabricCanvas.current;
    if (canvas) {
      const previousWidth = Math.max(1, canvas.width);
      const previousHeight = Math.max(1, canvas.height);
      const nextSize = framePixelSize(next, activeArea);
      const nextWidth = nextSize.width;
      const nextHeight = nextSize.height;
      const scaleX = nextWidth / previousWidth;
      const scaleY = nextHeight / previousHeight;
      const uniformScale = Math.min(scaleX, scaleY);
      canvas.getObjects().forEach((object) => {
        object.set({
          left: (object.left ?? 0) * scaleX,
          top: (object.top ?? 0) * scaleY,
          scaleX: (object.scaleX ?? 1) * uniformScale,
          scaleY: (object.scaleY ?? 1) * uniformScale
        });
      });
      canvas.setDimensions({ width: nextWidth, height: nextHeight });
      canvas.getObjects().forEach((object) => objectInsideCanvas(object, canvas, activeArea.safeMargin));
      canvas.requestRenderAll();
      syncCurrentJson();
    }
    setDirty(true);
    setFrameRevision((value) => value + 1);
    setDraftRevision((value) => value + 1);
    pushHistory();
    return true;
  };

  const resetFrame = () => {
    if (!activeArea) return;
    setPendingFrame(constrainFrame(frameFromArea(activeArea), activeArea));
  };

  const beginPrintingArea = () => {
    if (!activeArea || activeArea.printingAreaMode !== "customer_adjustable" || !activeArea.allowCustomAreaSelection) return;
    const current = statesRef.current[activeSide].frame ?? frameFromArea(activeArea);
    statesRef.current[activeSide].frame = current;
    const baseline = syncCurrentJson();
    const sideState = statesRef.current[activeSide];
    if (sideState.history.length === 1 && sideState.history[0] === null) {
      sideState.history = [baseline]; sideState.historyIndex = 0;
    }
    frameBeforeEdit.current = current; setPendingFrame(current); setEditingFrame(true); setDrawingFrame(true); setSelectedObject(null); setPanel(null);
  };

  const cancelPrintingArea = () => { setPendingFrame(null); setEditingFrame(false); setDrawingFrame(false); drawStart.current = null; };
  const confirmPrintingArea = () => {
    if (!pendingFrame) return;
    if (commitFrame(pendingFrame)) { setPendingFrame(null); setEditingFrame(false); setDrawingFrame(false); setAnnouncement(`${activeSide} printing area confirmed.`); }
  };
  const drawingPoint = (event: React.PointerEvent<HTMLDivElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - bounds.left) / bounds.width)), y: Math.max(0, Math.min(1, (event.clientY - bounds.top) / bounds.height)) };
  };
  const startAreaDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawingFrame || !activeArea) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = drawingPoint(event); drawStart.current = point;
    const minimum = constrainRect({ x: point.x, y: point.y, width: activeArea.minWidthNormalized, height: activeArea.minHeightNormalized }, activeArea.garmentSafeArea, { minWidth: activeArea.minWidthNormalized, minHeight: activeArea.minHeightNormalized, maxWidth: activeArea.maxWidthNormalized, maxHeight: activeArea.maxHeightNormalized });
    setPendingFrame(normalizedToFrame(minimum));
  };
  const moveAreaDrawing = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!drawStart.current || !activeArea) return;
    const point = drawingPoint(event); const start = drawStart.current;
    const rect = constrainRect({ x: Math.min(start.x, point.x), y: Math.min(start.y, point.y), width: Math.abs(point.x - start.x), height: Math.abs(point.y - start.y) }, activeArea.garmentSafeArea, { minWidth: activeArea.minWidthNormalized, minHeight: activeArea.minHeightNormalized, maxWidth: activeArea.maxWidthNormalized, maxHeight: activeArea.maxHeightNormalized });
    setPendingFrame(normalizedToFrame(rect));
  };
  const finishAreaDrawing = () => {
    if (!drawStart.current || !activeArea || !pendingFrame) return;
    drawStart.current = null;
    if (!framePassesBoundary(pendingFrame, activeArea)) { setPendingFrame(frameBeforeEdit.current); toast.error("That selection reaches outside the printable garment surface."); }
    setDrawingFrame(false);
  };

  const addText = () => {
    const canvas = fabricCanvas.current;
    if (!canvas || !textValue.trim()) return;
    const text = new FabricText(textValue.trim(), { left: canvas.width / 2, top: canvas.height / 2, originX: "center", originY: "center", fill: textColour, fontFamily: "Manrope", fontSize, fontWeight: textBold ? 800 : 400, fontStyle: textItalic ? "italic" : "normal", underline: textUnderline });
    if (text.width > canvas.width * 0.86) text.scaleToWidth(canvas.width * 0.86);
    canvas.add(text); canvas.setActiveObject(text); objectInsideCanvas(text, canvas, activeArea?.safeMargin ?? 0); canvas.requestRenderAll(); setSelectedObject(text);
  };

  useEffect(() => {
    if (!(selectedObject instanceof FabricText)) return;
    selectedObject.set({ text: textValue, fill: textColour, fontSize, fontWeight: textBold ? 800 : 400, fontStyle: textItalic ? "italic" : "normal", underline: textUnderline });
    if (fabricCanvas.current) objectInsideCanvas(selectedObject, fabricCanvas.current, activeArea?.safeMargin ?? 0);
    selectedObject.setCoords(); fabricCanvas.current?.requestRenderAll();
    const timeout = window.setTimeout(pushHistory, 220);
    return () => window.clearTimeout(timeout);
  }, [textValue, textColour, fontSize, textBold, textItalic, textUnderline, selectedObject, activeArea?.safeMargin, pushHistory]);

  const uploadArtwork = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
    if (!acceptedTypes.has(file.type) || !/\.(png|jpe?g|webp)$/i.test(file.name)) { toast.error("Upload a valid PNG, JPG, JPEG or WebP file."); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Artwork must be 5 MB or smaller."); return; }
    setCropFile(file);
  };

  const uploadCroppedArtwork = async (file: File) => {
    setCropFile(null);
    const controller = new AbortController(); uploadController.current = controller; setUploading(true);
    try {
      const uploaded = await customisationService.uploadArtwork(file, controller.signal);
      const image = await FabricImage.fromURL(uploaded.url, { crossOrigin: "anonymous" });
      const canvas = fabricCanvas.current; if (!canvas) return;
      const margin = activeArea?.safeMargin ?? 0;
      const fitScale = Math.min((canvas.width - margin * 2) / Math.max(1, image.width), (canvas.height - margin * 2) / Math.max(1, image.height));
      image.set({ left: canvas.width / 2, top: canvas.height / 2, originX: "center", originY: "center", scaleX: fitScale, scaleY: fitScale, cornerColor: "#08b9d4", cornerStrokeColor: "#07163d", borderColor: "#08b9d4", cornerStyle: "circle", transparentCorners: false });
      canvas.add(image); canvas.setActiveObject(image); objectInsideCanvas(image, canvas, margin); canvas.requestRenderAll();
      const artworkUrls = JSON.parse(window.sessionStorage.getItem(`${draftKey}:uploads`) || "[]") as string[];
      window.sessionStorage.setItem(`${draftKey}:uploads`, JSON.stringify([...new Set([...artworkUrls, uploaded.url])]));
      const currentFrame = statesRef.current[activeSide].frame ?? (activeArea ? frameFromArea(activeArea) : null);
      if (activeArea && currentFrame && uploaded.width && uploaded.height) {
        const base = activeArea.defaultArea ?? frameToNormalized(frameFromArea(activeArea));
        const selected = frameToNormalized(currentFrame);
        const outputWidthIn = activeArea.realWidthCm * selected.width / base.width / 2.54;
        const outputHeightIn = activeArea.realHeightCm * selected.height / base.height / 2.54;
        const dpi = Math.round(Math.min(uploaded.width / Math.max(.1, outputWidthIn), uploaded.height / Math.max(.1, outputHeightIn)));
        setDpiNotice({ dpi, status: dpi < 150 ? "warning" : "ok" });
      }
      toast.success("Artwork uploaded at print resolution.");
    } catch (uploadError) { if (!(uploadError instanceof DOMException && uploadError.name === "AbortError")) toast.error(uploadError instanceof Error ? uploadError.message : "Artwork upload failed."); }
    finally { setUploading(false); uploadController.current = null; }
  };

  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvas.current; const active = canvas?.getActiveObject(); if (!canvas || !active) return;
    canvas.remove(active); canvas.discardActiveObject(); canvas.requestRenderAll(); setSelectedObject(null);
  }, []);
  const duplicateSelected = async () => {
    const canvas = fabricCanvas.current; const active = canvas?.getActiveObject(); if (!canvas || !active) return;
    const clone = await active.clone(); clone.set({ left: (active.left ?? 0) + 14, top: (active.top ?? 0) + 14 }); canvas.add(clone); canvas.setActiveObject(clone); objectInsideCanvas(clone, canvas, activeArea?.safeMargin ?? 0); canvas.requestRenderAll();
  };
  const changeHistory = async (delta: number) => {
    const canvas = fabricCanvas.current; if (!canvas) return; const state = statesRef.current[activeSide];
    const nextIndex = Math.max(0, Math.min(state.history.length - 1, state.historyIndex + delta)); if (nextIndex === state.historyIndex) return;
    applyingHistory.current = true; canvas.clear(); const json = state.history[nextIndex]; if (json) await canvas.loadFromJSON(json);
    const historyFrame = json && (json as Record<string, unknown>).__printingArea as FrameRect | undefined;
    if (historyFrame && activeArea) {
      statesRef.current[activeSide].frame = constrainFrame(historyFrame, activeArea);
      const nextSize = framePixelSize(statesRef.current[activeSide].frame!, activeArea); canvas.setDimensions(nextSize); setFrameRevision((value) => value + 1);
    }
    canvas.requestRenderAll(); statesRef.current[activeSide] = { ...state, frame: statesRef.current[activeSide].frame, canvasJson: json, historyIndex: nextIndex }; applyingHistory.current = false; setSelectedObject(null); setDirty(true); setDraftRevision((value) => value + 1);
  };

  const pasteCopied = async () => {
    const canvas = fabricCanvas.current; if (!canvas || !copiedObject.current) return;
    const clone = await FabricObject.fromObject(copiedObject.current) as FabricObject;
    clone.set({ left: (clone.left ?? 0) + 14, top: (clone.top ?? 0) + 14 });
    canvas.add(clone); canvas.setActiveObject(clone); objectInsideCanvas(clone, canvas, activeArea?.safeMargin ?? 0); canvas.requestRenderAll();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement; if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      const modifier = event.metaKey || event.ctrlKey;
      if (modifier && event.key.toLowerCase() === "z") { event.preventDefault(); void changeHistory(event.shiftKey ? 1 : -1); }
      else if (modifier && event.key.toLowerCase() === "c") { event.preventDefault(); const active = fabricCanvas.current?.getActiveObject(); copiedObject.current = active ? active.toObject() : null; }
      else if (modifier && event.key.toLowerCase() === "v" && copiedObject.current) { event.preventDefault(); void pasteCopied(); }
      else if (event.key === "Delete" || event.key === "Backspace") { event.preventDefault(); deleteSelected(); }
      else if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) {
        const canvas = fabricCanvas.current; const active = canvas?.getActiveObject(); if (!canvas || !active || active.lockMovementX) return;
        event.preventDefault(); const amount = event.shiftKey ? 10 : 1;
        active.set({ left: (active.left ?? 0) + (event.key === "ArrowLeft" ? -amount : event.key === "ArrowRight" ? amount : 0), top: (active.top ?? 0) + (event.key === "ArrowUp" ? -amount : event.key === "ArrowDown" ? amount : 0) });
        objectInsideCanvas(active, canvas, activeArea?.safeMargin ?? 0); canvas.requestRenderAll(); pushHistory();
      }
      else if (event.key === "Escape") { fabricCanvas.current?.discardActiveObject(); fabricCanvas.current?.requestRenderAll(); setPanel(null); }
    };
    window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey);
  });

  const saveDraft = () => { syncCurrentJson(); window.localStorage.setItem(draftKey, JSON.stringify(statesRef.current)); setDirty(false); toast.success("Design saved on this device."); };
  const updatePricing = useCallback(async () => {
    if (!configuration || !selectedColour || !size || !methodId) return;
    syncCurrentJson(); setPricingBusy(true);
    try { const result = await customisationService.price({ customProductId: configuration.id, customColourId: selectedColour.id, size, quantity, printingMethodId: methodId, usedSides: usedSidesFrom(statesRef.current), canvasJson: Object.fromEntries(sides.map((side) => [side, statesRef.current[side].canvasJson])) as CustomisedCartData["canvasJson"] }); setPricing(result); setAnnouncement(`Price updated: ${currencyFormatter.format(result.total)} total.`); }
    catch (priceError) { const message = priceError instanceof Error ? priceError.message : "Price could not be calculated."; setAnnouncement(message); toast.error(message); }
    finally { setPricingBusy(false); }
  }, [configuration, selectedColour, size, methodId, quantity, syncCurrentJson]);
  useEffect(() => { if (panel === "order") void updatePricing(); }, [panel, updatePricing]);

  const addCustomItem = async () => {
    if (!configuration || !selectedColour || !activeView || !size || !methodId) return;
    await updatePricing();
    const nextPricing = await customisationService.price({ customProductId: configuration.id, customColourId: selectedColour.id, size, quantity, printingMethodId: methodId, usedSides: usedSidesFrom(statesRef.current), canvasJson: Object.fromEntries(sides.map((side) => [side, statesRef.current[side].canvasJson])) as CustomisedCartData["canvasJson"] });
    const method = configuration.printingMethods.find((entry) => entry.id === methodId)!;
    const frontView = selectedColour.views.find((view) => view.side === "front") ?? activeView;
    const frontArea = configuration.printAreas.find((area) => area.side === "front" && area.colourId === selectedColour.id)
      ?? configuration.printAreas.find((area) => area.side === "front" && !area.colourId) ?? activeArea!;
    const frontFrame = statesRef.current.front.frame ?? frameFromArea(frontArea);
    const printingAreas = Object.fromEntries(sides.map((side) => {
      const area = configuration.printAreas.find((entry) => entry.side === side && entry.colourId === selectedColour.id) ?? configuration.printAreas.find((entry) => entry.side === side && !entry.colourId)!;
      return [side, frameToNormalized(statesRef.current[side].frame ?? frameFromArea(area))];
    })) as NonNullable<CustomisedCartData["printingAreas"]>;
    const safeAreaVersions = Object.fromEntries(sides.map((side) => {
      const area = configuration.printAreas.find((entry) => entry.side === side && entry.colourId === selectedColour.id) ?? configuration.printAreas.find((entry) => entry.side === side && !entry.colourId)!;
      return [side, area.safeAreaVersion ?? "legacy-1"];
    })) as NonNullable<CustomisedCartData["safeAreaVersions"]>;
    const physicalOutputDimensions = Object.fromEntries(sides.map((side) => {
      const area = configuration.printAreas.find((entry) => entry.side === side && entry.colourId === selectedColour.id) ?? configuration.printAreas.find((entry) => entry.side === side && !entry.colourId)!;
      const selected = printingAreas[side]; const base = area.defaultArea ?? frameToNormalized(frameFromArea(area));
      return [side, { widthCm: area.realWidthCm * selected.width / base.width, heightCm: area.realHeightCm * selected.height / base.height }];
    })) as NonNullable<CustomisedCartData["physicalOutputDimensions"]>;
    const originalArtworkUrls = JSON.parse(window.sessionStorage.getItem(`${draftKey}:uploads`) || "[]") as string[];
    const customisation: CustomisedCartData = { type: "CUSTOMISED_PRODUCT", customProductId: configuration.id, customColourId: selectedColour.id, productName: configuration.name, productSlug: configuration.slug, colourSlug: selectedColour.slug, colourName: selectedColour.name, size, quantity, printingMethodId: method.id, printingMethodName: method.name, usedSides: usedSidesFrom(statesRef.current), canvasJson: Object.fromEntries(sides.map((side) => [side, statesRef.current[side].canvasJson])) as CustomisedCartData["canvasJson"], previewUrls: Object.fromEntries(sides.map((side) => [side, statesRef.current[side].previewUrl])) as CustomisedCartData["previewUrls"], originalArtworkUrls, highResolutionFiles: originalArtworkUrls, printingAreas, safeAreaVersions, dpiWarningStatus: Object.fromEntries(sides.map((side) => [side, side === activeSide && dpiNotice ? dpiNotice.status : "unknown"])) as Record<ProductSide, "ok" | "warning" | "unknown">, physicalOutputDimensions, pricingBreakdown: nextPricing, customerNote, productImage: frontView.imageUrl, previewPlacement: { left: frontFrame.xPercent, top: frontFrame.yPercent, width: frontFrame.widthPercent, height: frontFrame.heightPercent }, framePlacements: Object.fromEntries(sides.map((side) => {
      const area = configuration.printAreas.find((entry) => entry.side === side && entry.colourId === selectedColour.id) ?? configuration.printAreas.find((entry) => entry.side === side && !entry.colourId)!;
      return [side, statesRef.current[side].frame ?? frameFromArea(area)];
    })) as Record<ProductSide, FrameRect> };
    if (cartItemId) updateCustomCartItem(cartItemId, customisation);
    else addToCart({ productId: "", variantId: "", quantity, selectedColor: selectedColour.name, selectedSize: size, customisation });
    const message = cartItemId ? "Customised cart item updated." : "Customised product added to your bag.";
    setDirty(false); setAnnouncement(message); toast.success(message); navigate("/cart");
  };
  const closeTutorial = () => {
    setTutorialOpen(false);
    window.setTimeout(() => tutorialTrigger.current?.focus(), 0);
  };
  const open360Preview = () => {
    syncCurrentJson();
    setPreview360Open(true);
  };
  const close360Preview = () => {
    setPreview360Open(false);
    window.setTimeout(() => preview360Trigger.current?.focus(), 0);
  };

  if (loading) return <div className="grid min-h-screen place-items-center bg-[#f7f8fa]"><LoadingState label="Opening design studio" /></div>;
  if (error || !configuration || !selectedColour || !activeView || !activeArea || configuration.colours.some((colour) => sides.some((side) => !colour.views.some((view) => view.side === side)))) return <div className="grid min-h-screen place-items-center bg-[#f7f8fa] p-6"><EmptyState title="This product is not ready for design" description={error ?? "A four-side mockup or print area is missing. Ask an administrator to complete the product configuration."} action={<Link to="/customise" className="button-primary">Back to products</Link>} /></div>;

  const displayFrame = activeFrame ? {
    x: activeFrame.xPercent / 100 * imageBounds.width,
    y: activeFrame.yPercent / 100 * imageBounds.height,
    width: activeFrame.widthPercent / 100 * imageBounds.width,
    height: activeFrame.heightPercent / 100 * imageBounds.height
  } : { x: 0, y: 0, width: 0, height: 0 };
  const areaAdjustable = activeArea.printingAreaMode === "customer_adjustable" && activeArea.allowCustomAreaSelection;
  const polygonClip = activeArea.safeBoundaryType !== "rectangle" && activeArea.garmentSafePolygon?.length && activeFrame
    ? `polygon(${activeArea.garmentSafePolygon.map((point) => `${(point.x - activeFrame.xPercent / 100) / (activeFrame.widthPercent / 100) * 100}% ${(point.y - activeFrame.yPercent / 100) / (activeFrame.heightPercent / 100) * 100}%`).join(",")})`
    : undefined;
  const artworkClipStyle: React.CSSProperties = activeArea.safeBoundaryType === "mask" && activeArea.garmentMaskUrl ? {
    WebkitMaskImage: `url(${activeArea.garmentMaskUrl})`, maskImage: `url(${activeArea.garmentMaskUrl})`,
    WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskSize: `${imageBounds.width / Math.max(1, displayFrame.width) * 100}% ${imageBounds.height / Math.max(1, displayFrame.height) * 100}%`, maskSize: `${imageBounds.width / Math.max(1, displayFrame.width) * 100}% ${imageBounds.height / Math.max(1, displayFrame.height) * 100}%`,
    WebkitMaskPosition: `${-displayFrame.x}px ${-displayFrame.y}px`, maskPosition: `${-displayFrame.x}px ${-displayFrame.y}px`
  } : polygonClip ? { clipPath: polygonClip } : {};
  const tools = [{ id: "products" as const, label: "Products", icon: Package }, { id: "text" as const, label: "Text", icon: Type }, { id: "image" as const, label: "Image", icon: ImagePlus }, { id: "layers" as const, label: "Layers", icon: Layers3 }, { id: "order" as const, label: "Order", icon: ShoppingBag }];
  const historyState = statesRef.current[activeSide];
  const viewerViews = Object.fromEntries(sides.map((side) => [side, selectedColour.views.find((view) => view.side === side)]));
  const viewerFrames = Object.fromEntries(sides.map((side) => {
    const area = configuration.printAreas.find((entry) => entry.side === side && entry.colourId === selectedColour.id)
      ?? configuration.printAreas.find((entry) => entry.side === side && !entry.colourId)!;
    return [side, statesRef.current[side].frame ?? frameFromArea(area)];
  }));
  const viewerPreviews = Object.fromEntries(sides.map((side) => [side, statesRef.current[side].previewUrl])) as Record<ProductSide, string | null>;

  return <div className="designer-shell">
    <header className="designer-topbar">
      <button type="button" aria-label="Return to custom products" className="designer-logo" onClick={() => { if (!dirty || window.confirm("Leave the studio? Your latest changes are saved locally, but have not been added to the bag.")) navigate("/customise"); }}><BrandLogo className="h-10 w-[120px]" /></button>
      <div className="designer-history"><StudioButton label="Undo" disabled={historyState.historyIndex <= 0} onClick={() => void changeHistory(-1)}><Undo2 /></StudioButton><StudioButton label="Redo" disabled={historyState.historyIndex >= historyState.history.length - 1} onClick={() => void changeHistory(1)}><Redo2 /></StudioButton><StudioButton label="Save" onClick={saveDraft}><Save /></StudioButton></div>
      <div className="designer-actions"><a className="studio-icon-button" href="mailto:support@fabpodd.com"><Mail /><span>Contact</span></a><button ref={tutorialTrigger} type="button" className="studio-text-button" onClick={() => setTutorialOpen(true)}>Tutorials</button><button type="button" className="studio-order-button" onClick={() => setPanel("order")}><ShoppingBag className="h-4 w-4" /><span>Order</span></button></div>
    </header>
    <div className="designer-body">
      <aside className="designer-toolrail" aria-label="Design tools">{tools.map((tool) => { const Icon = tool.icon; return <button key={tool.id} type="button" className={panel === tool.id ? "active" : ""} onClick={() => { const opening = panel !== tool.id; setPanel(opening ? tool.id : null); if (!opening) cancelPrintingArea(); }}><Icon /><span>{tool.label}</span></button>; })}</aside>
      {panel ? <section className={`designer-panel ${panel === "order" ? "order-panel" : ""}`} aria-label={`${panel} panel`}>
        <div className="designer-panel-heading"><h2>{panel === "order" ? "Review your order" : panel}</h2><button type="button" aria-label={`Close ${panel} panel`} onClick={() => { setPanel(null); cancelPrintingArea(); }}><X /></button></div>
        {panel === "products" ? <div className="studio-form"><div><span className="studio-label">Current product</span><strong>{configuration.name}</strong><p>{configuration.specification}</p></div><Link to="/customise" className="studio-outline-button"><ArrowLeft className="h-4 w-4" /> Change product</Link><label><span className="studio-label">Colour</span><div className="colour-grid">{configuration.colours.map((colour) => <button key={colour.id} type="button" aria-label={`Use ${colour.name}`} className={selectedColour.id === colour.id ? "active" : ""} onClick={() => { if (!dirty || window.confirm("Change colour and keep the current artwork aligned to the new mockups?")) { syncCurrentJson(); window.localStorage.setItem(draftKey, JSON.stringify(statesRef.current)); const next = new URLSearchParams(searchParams); next.set("colour", colour.slug); setSearchParams(next); } }}><i style={{ background: colour.hexCode }} />{colour.name}</button>)}</div></label><label><span className="studio-label">Size</span><select value={size} onChange={(event) => setSize(event.target.value)}>{configuration.sizes.map((entry) => <option key={entry.id} value={entry.name}>{entry.name}</option>)}</select></label><p className="studio-note">Blank mockup imagery and print areas come only from the separate Customisation catalogue.</p></div> : null}
        {panel === "text" ? <div className="studio-form"><label><span className="studio-label">Text</span><textarea value={textValue} onChange={(event) => setTextValue(event.target.value)} rows={3} maxLength={120} /></label><div className="studio-grid-two"><label><span className="studio-label">Size</span><input type="number" min="8" max="180" value={fontSize} onChange={(event) => setFontSize(Number(event.target.value))} /></label><label><span className="studio-label">Colour</span><input type="color" value={textColour} onChange={(event) => setTextColour(event.target.value)} /></label></div><div className="studio-toggle-row"><button type="button" className={textBold ? "active" : ""} onClick={() => setTextBold(!textBold)}>Bold</button><button type="button" className={textItalic ? "active" : ""} onClick={() => setTextItalic(!textItalic)}>Italic</button><button type="button" className={textUnderline ? "active" : ""} onClick={() => setTextUnderline(!textUnderline)}>Underline</button></div><button type="button" className="studio-primary-button" onClick={addText}>Add text</button></div> : null}
        {panel === "image" ? <div className="studio-form image-workflow">
          <div className={`frame-setup-card ${editingFrame ? "active" : ""}`}><span className="workflow-step">1</span><div><strong>Printing area · {activeSide}</strong><p>{areaAdjustable ? "Draw directly on the product, then move or resize the selection within the safe garment surface." : "This product view uses the production-approved fixed printing area."}</p></div>{areaAdjustable ? <button type="button" className="studio-primary-button" disabled={editingFrame} onClick={beginPrintingArea}>Set Printing Area</button> : <span className="fixed-area-badge"><Lock className="h-4 w-4" />Fixed by production</span>}</div>
          <div className={`upload-zone ${editingFrame ? "waiting" : ""}`}><span className="workflow-step">2</span><ImagePlus /><strong>Crop and add artwork</strong><p>Image crop chooses what is used. The printing area controls where it can be placed · maximum 5 MB.</p><label className="studio-primary-button" aria-disabled={editingFrame || uploading}><input type="file" className="sr-only" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" onChange={(event) => void uploadArtwork(event)} disabled={editingFrame || uploading} />{uploading ? "Uploading…" : editingFrame ? "Confirm area first" : "Choose image"}</label>{uploading ? <button type="button" className="studio-outline-button" onClick={() => uploadController.current?.abort()}>Cancel upload</button> : null}</div>
          {dpiNotice ? <p className={`dpi-notice ${dpiNotice.status}`}>{dpiNotice.status === "warning" ? `Low resolution: about ${dpiNotice.dpi} DPI. Use a larger image; 300 DPI is preferred and 150 DPI is the minimum.` : `Artwork resolution is about ${dpiNotice.dpi} DPI. 300 DPI is preferred.`}</p> : null}
          <p className="studio-note">After uploading, select the image to drag, resize, or rotate it within your chosen dotted area.</p>
        </div> : null}
        {panel === "layers" ? <div className="studio-form"><p className="studio-note">Layers are shown in print order for the active {activeSide} side.</p>{fabricCanvas.current?.getObjects().length ? <div className="layer-list">{fabricCanvas.current.getObjects().map((object, index) => <button key={`${object.type}-${index}`} type="button" onClick={() => { fabricCanvas.current?.setActiveObject(object); fabricCanvas.current?.requestRenderAll(); setSelectedObject(object); }}><span>{object.type === "text" ? "Text" : "Image"} {index + 1}</span><ChevronDown /></button>)}</div> : <p>No objects on this side yet.</p>}</div> : null}
        {panel === "order" ? <div className="studio-form order-form"><img src={activeView.imageUrl} alt={`Blank ${configuration.name} ${activeSide} view`} /><dl><div><dt>Product</dt><dd>{configuration.name}</dd></div><div><dt>Colour</dt><dd>{selectedColour.name}</dd></div><div><dt>Printed sides</dt><dd>{usedSidesFrom(statesRef.current).join(", ") || "None yet"}</dd></div></dl><div className="studio-grid-two"><label><span className="studio-label">Size</span><select value={size} onChange={(event) => setSize(event.target.value)}>{configuration.sizes.map((entry) => <option key={entry.id}>{entry.name}</option>)}</select></label><label><span className="studio-label">Quantity</span><input type="number" min="1" max="500" value={quantity} onChange={(event) => setQuantity(Math.max(1, Number(event.target.value)))} /></label></div><label><span className="studio-label">Printing method</span><select value={methodId} onChange={(event) => setMethodId(event.target.value)}>{configuration.printingMethods.map((method) => <option key={method.id} value={method.id}>{method.name}</option>)}</select></label><label><span className="studio-label">Note for production</span><textarea rows={3} maxLength={1000} value={customerNote} onChange={(event) => setCustomerNote(event.target.value)} /></label>{pricingBusy ? <p>Calculating on the server…</p> : pricing ? <div className="price-breakdown"><div><span>Blank products</span><strong>{currencyFormatter.format(pricing.baseProduct)}</strong></div><div><span>Colour charge</span><strong>{currencyFormatter.format(pricing.additionalColour)}</strong></div><div><span>Printing</span><strong>{currencyFormatter.format(pricing.printingBase + pricing.printingSides)}</strong></div><div><span>Delivery</span><strong>{pricing.delivery ? currencyFormatter.format(pricing.delivery) : "Free"}</strong></div><div className="total"><span>Total</span><strong>{currencyFormatter.format(pricing.total)}</strong></div></div> : null}<button type="button" className="studio-primary-button" disabled={pricingBusy || !usedSidesFrom(statesRef.current).length} onClick={() => void addCustomItem()}>Add customised product to bag</button>{!usedSidesFrom(statesRef.current).length ? <p className="studio-note">Add text or artwork to at least one side before ordering.</p> : null}</div> : null}
      </section> : null}
      <main className={`designer-workspace ${editingFrame ? "printing-area-mode" : ""}`}>
        {editingFrame ? <div className="printing-area-instruction" role="status"><strong>Drag on the product to select your printing area.</strong><span>Keep the complete box on the garment.</span></div> : null}
        <div ref={canvasStageElement} className="designer-canvas-stage" style={{ transform: `scale(${zoom})` }}><div className="designer-product-bounds" style={{ left: imageBounds.left, top: imageBounds.top, width: imageBounds.width, height: imageBounds.height }}><div className="designer-product-preview"><img ref={productImageElement} src={activeView.imageUrl} alt={`Blank ${selectedColour.name} ${configuration.name}, ${activeSide} view`} className="designer-product-image" onLoad={measureImageBounds} />{drawingFrame ? <div className="printing-area-draw-layer" onPointerDown={startAreaDrawing} onPointerMove={moveAreaDrawing} onPointerUp={finishAreaDrawing} onPointerCancel={finishAreaDrawing} /> : null}<Rnd
          bounds="parent"
          minWidth={Math.max(24, imageBounds.width * .08)}
          minHeight={Math.max(24, imageBounds.height * .08)}
          size={{ width: displayFrame.width, height: displayFrame.height }}
          position={{ x: displayFrame.x, y: displayFrame.y }}
          disableDragging={!editingFrame || drawingFrame || !activeArea.allowMove}
          enableResizing={editingFrame && !drawingFrame && activeArea.allowResize}
          className={`print-area ${editingFrame ? "editing" : ""}`}
          resizeHandleClasses={{ top: "frame-handle top", topRight: "frame-handle top-right", right: "frame-handle right", bottomRight: "frame-handle bottom-right", bottom: "frame-handle bottom", bottomLeft: "frame-handle bottom-left", left: "frame-handle left", topLeft: "frame-handle top-left" }}
          onDragStop={(_event, data) => { const next = constrainFrame(frameFromRendered({ ...displayFrame, x: data.x, y: data.y }), activeArea); if (framePassesBoundary(next, activeArea)) setPendingFrame(next); else toast.error("Keep the printing area on the garment surface."); }}
          onResizeStop={(_event, _direction, element, _delta, position) => { const next = constrainFrame(frameFromRendered({ x: position.x, y: position.y, width: element.offsetWidth, height: element.offsetHeight }), activeArea); if (framePassesBoundary(next, activeArea)) setPendingFrame(next); else toast.error("Keep the complete printing area on the garment surface."); }}
        ><div className="print-area-canvas" style={artworkClipStyle} aria-label={`${activeSide} image area`}><canvas ref={canvasElement} />{editingFrame && !drawingFrame ? <span className="frame-pointer">Drag to move · Pull handles to resize</span> : null}</div></Rnd></div></div></div>
        {editingFrame ? <div className="printing-area-actions"><button type="button" className="studio-primary-button" onClick={confirmPrintingArea}><Check className="h-4 w-4" />Confirm Area</button><button type="button" className="studio-outline-button" onClick={resetFrame}><RotateCcw className="h-4 w-4" />Reset to Default</button><button type="button" className="studio-outline-button" onClick={cancelPrintingArea}>Cancel</button></div> : null}
        {selectedObject ? <div className="object-toolbar"><button type="button" aria-label="Duplicate selected object" onClick={() => void duplicateSelected()}><Copy /></button><button type="button" aria-label="Bring selected object forward" onClick={() => { const canvas = fabricCanvas.current; if (canvas) { canvas.bringObjectForward(selectedObject); canvas.requestRenderAll(); pushHistory(); } }}><BringToFront /></button><button type="button" aria-label={selectedObject.lockMovementX ? "Unlock selected object" : "Lock selected object"} onClick={() => { const locked = !selectedObject.lockMovementX; selectedObject.set({ lockMovementX: locked, lockMovementY: locked, lockScalingX: locked, lockScalingY: locked, lockRotation: locked }); fabricCanvas.current?.requestRenderAll(); pushHistory(); }}>{selectedObject.lockMovementX ? <LockOpen /> : <Lock />}</button><button type="button" aria-label="Delete selected object" onClick={deleteSelected}><Trash2 /></button></div> : null}
        <div className="zoom-controls"><button type="button" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(.72, value - .08))}><Minus /></button><button type="button" onClick={() => setZoom(1)}>{Math.round(zoom * 100)}%</button><button type="button" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.25, value + .08))}><Plus /></button></div>
      </main>
      <aside className="designer-sides" aria-label="Product sides">{sides.map((side) => { const view = selectedColour.views.find((entry) => entry.side === side)!; return <button key={side} type="button" className={activeSide === side ? "active" : ""} onClick={() => void switchSide(side)}><span><img src={view.imageUrl} alt="" /></span><strong>{side}</strong></button>; })}<button ref={preview360Trigger} type="button" className="preview-360" onClick={open360Preview}><RotateCcw /> Try 360°</button></aside>
    </div>
    <nav className="designer-mobile-tools" aria-label="Mobile design tools">{tools.map((tool) => { const Icon = tool.icon; return <button key={tool.id} type="button" className={panel === tool.id ? "active" : ""} onClick={() => { setPanel(tool.id); cancelPrintingArea(); }}><Icon /><span>{tool.label}</span></button>; })}</nav>
    <div className="sr-only" aria-live="polite">{announcement}</div>
    {tutorialOpen ? <div className="studio-modal" role="dialog" aria-modal="true" aria-labelledby="tutorial-title" onKeyDown={(event) => { if (event.key === "Escape") closeTutorial(); if (event.key === "Tab") { const focusable = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button,a,[tabindex]:not([tabindex='-1'])")); if (!focusable.length) return; const first = focusable[0]; const last = focusable[focusable.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } } }} onMouseDown={(event) => { if (event.currentTarget === event.target) closeTutorial(); }}><div><div className="designer-panel-heading"><h2 id="tutorial-title">Create your design</h2><button autoFocus type="button" aria-label="Close tutorials" onClick={closeTutorial}><X /></button></div><ol><li>Choose a colour and size from Products.</li><li>Open Image and resize the dotted area for the active side.</li><li>Select Done resizing, then upload your artwork.</li><li>Drag, resize, and rotate the artwork inside your chosen area.</li><li>Switch sides; every side keeps its own image area and design.</li><li>Open Order for server-validated pricing and add to bag.</li></ol></div></div> : null}
    {preview360Open ? <Product360Viewer key={`${configuration.id}:${selectedColour.id}`} product={configuration} colourHex={selectedColour.hexCode} colourName={selectedColour.name} views={viewerViews} frames={viewerFrames} previews={viewerPreviews} onClose={close360Preview} /> : null}
    {cropFile ? <ImageCropper file={cropFile} onCancel={() => setCropFile(null)} onConfirm={(file) => void uploadCroppedArtwork(file)} /> : null}
  </div>;
}
