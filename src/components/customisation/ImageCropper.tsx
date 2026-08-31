import { FlipHorizontal2, FlipVertical2, RotateCcw, RotateCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface ImageCropperProps {
  file: File;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

export function ImageCropper({ file, onCancel, onConfirm }: ImageCropperProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipX, setFlipX] = useState(1);
  const [flipY, setFlipY] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [imageStatus, setImageStatus] = useState<"loading" | "ready" | "error">("loading");

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image?.naturalWidth) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const size = canvas.width;
    context.clearRect(0, 0, size, size);
    context.save();
    context.translate(size / 2 + pan.x, size / 2 + pan.y);
    context.rotate(rotation * Math.PI / 180);
    context.scale(flipX, flipY);
    const fit = Math.max(size / image.naturalWidth, size / image.naturalHeight) * zoom;
    context.drawImage(image, -image.naturalWidth * fit / 2, -image.naturalHeight * fit / 2, image.naturalWidth * fit, image.naturalHeight * fit);
    context.restore();
  }, [flipX, flipY, pan.x, pan.y, rotation, zoom]);

  useEffect(() => {
    let active = true;
    setImageStatus("loading");
    const sourceUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!active) return;
      imageRef.current = image;
      setImageStatus("ready");
    };
    image.onerror = () => {
      if (!active) return;
      imageRef.current = null;
      setImageStatus("error");
    };
    image.src = sourceUrl;

    return () => {
      active = false;
      image.onload = null;
      image.onerror = null;
      imageRef.current = null;
      URL.revokeObjectURL(sourceUrl);
    };
  }, [file]);

  useEffect(() => {
    if (imageStatus === "ready") draw();
  }, [draw, imageStatus]);

  const reset = () => { setZoom(1); setRotation(0); setFlipX(1); setFlipY(1); setPan({ x: 0, y: 0 }); };
  const confirm = () => {
    const canvas = canvasRef.current;
    if (!canvas || imageStatus !== "ready") return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      onConfirm(new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-cropped.png`, { type: "image/png" }));
    }, "image/png", 0.95);
  };

  return <div className="studio-modal cropper-modal" role="dialog" aria-modal="true" aria-labelledby="cropper-title">
    <div className="cropper-dialog">
      <div className="designer-panel-heading"><div><h2 id="cropper-title">Crop your image</h2><p>Choose the part of the upload to use. Printing-area placement comes next.</p></div><button type="button" aria-label="Cancel image crop" onClick={onCancel}><X /></button></div>
      <div className="cropper-stage" onPointerDown={(event) => { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { x: event.clientX, y: event.clientY, panX: pan.x, panY: pan.y }; }} onPointerMove={(event) => { const start = dragRef.current; if (!start) return; setPan({ x: start.panX + event.clientX - start.x, y: start.panY + event.clientY - start.y }); }} onPointerUp={() => { dragRef.current = null; }}>
        <canvas ref={canvasRef} width="900" height="900" aria-label="Image crop preview" />
        {imageStatus === "loading" ? <p className="cropper-status" role="status">Preparing image…</p> : null}
        {imageStatus === "error" ? <p className="cropper-status error" role="alert">This image could not be previewed. Choose another PNG, JPG or WebP file.</p> : null}
        {imageStatus === "ready" ? <span>Drag to pan</span> : null}
      </div>
      <label className="cropper-zoom"><span>Zoom</span><input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label>
      <div className="cropper-tools" aria-label="Crop controls">
        <button type="button" onClick={() => setRotation((value) => value + 90)}><RotateCw />Rotate</button>
        <button type="button" onClick={() => setFlipX((value) => value * -1)}><FlipHorizontal2 />Flip horizontal</button>
        <button type="button" onClick={() => setFlipY((value) => value * -1)}><FlipVertical2 />Flip vertical</button>
        <button type="button" onClick={reset}><RotateCcw />Reset</button>
      </div>
      <div className="cropper-actions"><button type="button" className="studio-outline-button" onClick={onCancel}>Cancel</button><button type="button" className="studio-primary-button" disabled={imageStatus !== "ready"} onClick={confirm}>Confirm crop</button></div>
    </div>
  </div>;
}
