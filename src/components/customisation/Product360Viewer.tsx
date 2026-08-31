import { ChevronLeft, ChevronRight, Pause, Play, X } from "lucide-react";
import { CSSProperties, lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CustomProductConfiguration, CustomProductView, ProductSide } from "../../types/models";

const Product3DPreview = lazy(() => import("./Product3DPreview"));
const spinSides: ProductSide[] = ["front", "right", "back", "left"];
type FrameRect = { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number };
function inferredFormat(url: string): "glb" | "gltf" | "obj" { const extension = url.split(/[?#]/)[0].split(".").pop()?.toLowerCase(); return extension === "obj" || extension === "gltf" ? extension : "glb"; }

export function Product360Viewer({ product, colourHex, colourName, views, frames, previews, onClose }: {
  product: CustomProductConfiguration; colourHex: string; colourName: string;
  views: Partial<Record<ProductSide, CustomProductView>>; frames: Partial<Record<ProductSide, FrameRect>>;
  previews: Record<ProductSide, string | null>; onClose: () => void;
}) {
  const productKey = `${product.id}:${product.slug}`;
  const [index, setIndex] = useState(0); const [playing, setPlaying] = useState(true); const [modelFailed, setModelFailed] = useState(false); const [imagesReady, setImagesReady] = useState(false);
  const dragStart = useRef<number | null>(null);
  const imageViewsReady = spinSides.every((side) => Boolean(views[side]?.imageUrl));
  const wantsModel = product.viewerMode !== "image360" && Boolean(product.modelUrl) && !modelFailed;
  useEffect(() => { setIndex(0); setPlaying(true); setModelFailed(false); setImagesReady(false); }, [productKey]);
  useEffect(() => {
    if (wantsModel || !imageViewsReady) return;
    let active = true;
    Promise.all(spinSides.map((side) => new Promise<void>((resolve, reject) => { const image = new Image(); image.onload = () => resolve(); image.onerror = () => reject(); image.src = views[side]!.imageUrl; }))).then(() => { if (active) setImagesReady(true); }).catch(() => { if (active) setImagesReady(false); });
    return () => { active = false; };
  }, [imageViewsReady, productKey, views, wantsModel]);
  const step = useCallback((direction: number) => { setPlaying(false); setIndex((current) => (current + direction + spinSides.length) % spinSides.length); }, []);
  useEffect(() => { if (!playing || wantsModel || !imagesReady) return; const timer = window.setInterval(() => setIndex((current) => (current + 1) % spinSides.length), 1250); return () => window.clearInterval(timer); }, [imagesReady, playing, wantsModel]);
  const side = spinSides[index]; const view = views[side]; const frame = frames[side]; const aspect = view ? view.naturalWidth / view.naturalHeight : 800 / 920;
  const productStyle = useMemo(() => ({ "--preview-aspect": String(aspect), aspectRatio: String(aspect) }) as CSSProperties, [aspect]);
  const artStyle = frame ? { left: `${frame.xPercent}%`, top: `${frame.yPercent}%`, width: `${frame.widthPercent}%`, height: `${frame.heightPercent}%` } : undefined;
  const handleModelError = useCallback(() => setModelFailed(true), []);
  return <div className="studio-modal preview-360-modal" role="dialog" aria-modal="true" aria-labelledby="preview-360-title" onKeyDown={(event) => { if (event.key === "Escape") onClose(); else if (!wantsModel && event.key === "ArrowLeft") step(-1); else if (!wantsModel && event.key === "ArrowRight") step(1); }} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}><div>
    <div className="preview-360-heading"><div><h2 id="preview-360-title">Your design in 360°</h2><p>{wantsModel ? "Drag to rotate the real 3D garment. Scroll or pinch to zoom." : "Image-based 360° preview — drag, swipe, or use the arrows to inspect each configured side."}</p><span className="preview-360-mode">{wantsModel ? "Real 3D garment" : "Image-based 360° preview"}</span></div><button autoFocus type="button" aria-label="Close 360 degree preview" onClick={onClose}><X /></button></div>
    {wantsModel ? <div className="preview-360-stage true-3d"><Suspense fallback={<div className="product-3d-loading" role="status">Loading 3D garment…</div>}><Product3DPreview key={productKey} modelUrl={product.modelUrl!} modelFormat={product.modelFormat ?? inferredFormat(product.modelUrl!)} colourHex={colourHex} previews={previews} autoRotate={playing} modelScale={product.modelScale ?? 1} modelPosition={product.modelPosition ?? [0, 0, 0]} modelRotation={product.modelRotation ?? [0, 0, 0]} materialNames={product.materialNames ?? []} artworkMappings={product.modelArtworkMappings ?? {}} onError={handleModelError} /></Suspense></div> : imageViewsReady ? <div className="preview-360-stage" onPointerDown={(event) => { dragStart.current = event.clientX; event.currentTarget.setPointerCapture(event.pointerId); }} onPointerUp={(event) => { const start = dragStart.current; dragStart.current = null; if (start === null) return; const distance = event.clientX - start; if (Math.abs(distance) > 28) step(distance > 0 ? -1 : 1); }}>
      {!imagesReady ? <div className="product-3d-loading" role="status">Loading product views…</div> : view ? <><div className="preview-360-product" key={`${productKey}-${colourName}-${side}`} style={productStyle}><img src={view.imageUrl} alt={`${colourName} ${product.name}, ${side} view`} /><div className="preview-360-art" style={artStyle}>{previews[side] ? <img src={previews[side]!} alt={`Customer artwork on ${side}`} /> : null}</div></div><span className="preview-360-side-name">{side}</span><button type="button" className="preview-360-arrow previous" aria-label="Show previous side" onClick={() => step(-1)}><ChevronLeft /></button><button type="button" className="preview-360-arrow next" aria-label="Show next side" onClick={() => step(1)}><ChevronRight /></button></> : null}
    </div> : <div className="preview-360-error" role="alert"><strong>360° preview is unavailable for this product.</strong><span>Configure a valid 3D model or all four Front, Right, Back and Left mockup images in the admin panel.</span></div>}
    {(wantsModel || imageViewsReady) ? <div className="preview-360-controls"><button type="button" className="preview-360-play" onClick={() => setPlaying((value) => !value)}>{playing ? <Pause /> : <Play />}<span>{playing ? "Pause rotation" : "Play rotation"}</span></button>{wantsModel ? <p className="preview-360-gesture-note">Drag to rotate · Scroll or pinch to zoom</p> : <div className="preview-360-dots" aria-label="Choose preview side">{spinSides.map((entry, sideIndex) => <button key={entry} type="button" aria-label={`Show ${entry} side`} aria-current={index === sideIndex} className={index === sideIndex ? "active" : ""} onClick={() => { setPlaying(false); setIndex(sideIndex); }}>{entry}</button>)}</div>}</div> : null}
  </div></div>;
}
