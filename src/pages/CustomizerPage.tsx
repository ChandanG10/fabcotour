import { Download, Eye, ImagePlus, Layers3, RotateCw, Save, Trash2, Type } from "lucide-react";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { AssetImage, defaultProductAssetPath } from "../components/common/AssetImage";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, EmptyState, LoadingState, SectionIntro } from "../components/common/Ui";
import { useAsyncData } from "../hooks/useAsyncData";
import { storefrontService } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { DesignLayer } from "../types/models";
import { currencyFormatter } from "../utils/format";

const printableBounds = { x: 52, y: 52, width: 180, height: 210 };
const views: Array<"front" | "back" | "left" | "right"> = ["front", "back", "left", "right"];

export default function CustomizerPage() {
  const [searchParams] = useSearchParams();
  const store = useAppStore();
  const [activeView, setActiveView] = useState<"front" | "back" | "left" | "right">("front");
  const [customText, setCustomText] = useState("Your story here");
  const [previewMode, setPreviewMode] = useState(false);
  const { data: products, loading, error } = useAsyncData(
    () => storefrontService.getNormalizedProducts(),
    []
  );
  const selectedProduct =
    products?.find((product) => product.id === (searchParams.get("product") ?? store.customDesign.productId)) ??
    products?.[0];
  const selectedLayer = store.customDesign.layers.find((layer) => layer.id === store.selectedLayerId);

  useEffect(() => {
    if (!selectedProduct || store.customDesign.productId) {
      return;
    }

    store.updateCustomDesign({
      productId: selectedProduct.id,
      size: selectedProduct.sizeOptions[0] ?? "One Size",
      productColor: selectedProduct.colorOptions[0] ?? "Black",
      printMethod: selectedProduct.printMethods[0] ?? "Direct-to-garment"
    });
  }, [selectedProduct, store]);

  const visibleLayers = store.customDesign.layers.filter((layer) => layer.view === activeView);
  const dynamicPrice = useMemo(() => {
    const base = (selectedProduct?.price ?? 0) * store.customDesign.quantity;
    const printLocationCharge = ["Back", "Sleeve"].some((value) => store.customDesign.printLocation.includes(value))
      ? 160
      : 80;
    const printMethodCharge = store.customDesign.printMethod.includes("Embroidery") ? 190 : 100;
    const layerCharge = Math.max(store.customDesign.layers.length - 1, 0) * 60;
    const rushCharge = store.customDesign.rushDelivery ? 220 : 0;
    const embroideryCharge = store.customDesign.embroidery ? 180 : 0;
    return base + printLocationCharge + printMethodCharge + layerCharge + rushCharge + embroideryCharge;
  }, [selectedProduct?.price, store.customDesign]);

  const warnings = useMemo(() => {
    const messages: string[] = [];
    visibleLayers.forEach((layer) => {
      if (
        layer.x < printableBounds.x ||
        layer.y < printableBounds.y ||
        layer.x + layer.width > printableBounds.x + printableBounds.width ||
        layer.y + layer.height > printableBounds.y + printableBounds.height
      ) {
        messages.push(`Layer "${layer.content.slice(0, 18)}" extends beyond the printable area.`);
      }
      if (layer.type === "image" && layer.content.startsWith("data:") && layer.width < 90) {
        messages.push(`Layer "${layer.content.slice(0, 12)}..." may be low-resolution for print.`);
      }
      if (layer.type === "text" && layer.color?.toLowerCase() === "#111111" && store.customDesign.productColor === "Midnight Black") {
        messages.push(`Layer "${layer.content.slice(0, 18)}" may have low contrast against the garment.`);
      }
    });
    return Array.from(new Set(messages));
  }, [store.customDesign.productColor, visibleLayers]);

  const addTextLayer = () => {
    const layer: DesignLayer = {
      id: `layer-${Date.now()}`,
      type: "text",
      view: activeView,
      content: customText,
      color: "#FFC627",
      fontSize: 24,
      fontFamily: "Manrope",
      fontWeight: 700,
      fontStyle: "normal",
      textAlign: "center",
      rotation: 0,
      x: 80,
      y: 90,
      width: 120,
      height: 48
    };
    store.addDesignLayer(layer);
    toast.success("Text layer added");
  };

  const addImageLayer = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    if (!["image/png", "image/jpeg", "image/webp", "image/svg+xml"].includes(file.type)) {
      toast.error("Unsupported file format. Upload PNG, JPG, WebP or SVG.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      store.addDesignLayer({
        id: `layer-${Date.now()}`,
        type: "image",
        view: activeView,
        content: String(reader.result),
        rotation: 0,
        x: 90,
        y: 100,
        width: 110,
        height: 110
      });
      toast.success("Artwork uploaded");
    };
    reader.readAsDataURL(file);
  };

  const downloadPreview = async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 420;
    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }
    context.fillStyle = store.customDesign.productColor === "Midnight Black" ? "#111111" : "#F5F0E7";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = "#d4d4d4";
    context.strokeRect(70, 60, 220, 250);

    for (const layer of visibleLayers) {
      context.save();
      context.translate(layer.x + layer.width / 2, layer.y + layer.height / 2);
      context.rotate((layer.rotation * Math.PI) / 180);
      if (layer.type === "text") {
        context.fillStyle = layer.color ?? "#FFC627";
        context.font = `${layer.fontStyle === "italic" ? "italic " : ""}${layer.fontWeight ?? 700} ${layer.fontSize ?? 24}px sans-serif`;
        context.textAlign = "center";
        context.fillText(layer.content, 0, 0);
      } else {
        const image = new Image();
        await new Promise<void>((resolve) => {
          image.onload = () => {
            context.drawImage(image, -layer.width / 2, -layer.height / 2, layer.width, layer.height);
            resolve();
          };
          image.src = layer.content;
        });
      }
      context.restore();
    }

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = "fab-couture-preview.png";
    link.click();
  };

  if (loading) {
    return (
      <div className="container-shell py-20">
        <LoadingState label="Loading customiser products" />
      </div>
    );
  }

  if (error || !selectedProduct || !products?.length) {
    return (
      <div className="container-shell py-20">
        <EmptyState
          title="Customizer products are unavailable"
          description={error ?? "No products are available for personalisation yet."}
        />
      </div>
    );
  }

  return (
    <>
      <Seo
        title="Product Customiser"
        description="Create a front-end custom design preview for apparel, caps and gifting products with layered text and artwork."
        path="/customise"
      />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Customise" }]} />
        <SectionIntro
          eyebrow="Custom product designer"
          title="A polished prototype for visual personalisation"
          description="Upload artwork, add text, switch product views, manage layers and build a print-ready order summary."
        />

        <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="space-y-6 rounded-[32px] bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap gap-2">
                {views.map((view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => setActiveView(view)}
                    className={`rounded-full px-4 py-2 text-sm font-semibold ${activeView === view ? "bg-brand-black text-white" : "bg-brand-grey text-brand-black"}`}
                  >
                    {view}
                  </button>
                ))}
              </div>
              <button type="button" onClick={store.resetDesign} className="button-secondary">
                Reset design
              </button>
            </div>

            <div className="overflow-hidden rounded-[28px] bg-brand-offwhite p-6">
              <div className="relative mx-auto h-[420px] w-full max-w-[320px] rounded-[30px] bg-white shadow-soft">
                <AssetImage
                  src={selectedProduct.images[0]}
                  alt={`${selectedProduct.name} mockup for customiser`}
                  expectedPath={defaultProductAssetPath(selectedProduct.slug)}
                  missingLabel="Product image is missing"
                  imageClassName="h-full w-full rounded-[30px] object-cover opacity-50"
                  fallbackClassName="h-full w-full rounded-[30px]"
                />
                <div
                  className="absolute border-2 border-dashed border-brand-black/30"
                  style={{
                    left: printableBounds.x,
                    top: printableBounds.y,
                    width: printableBounds.width,
                    height: printableBounds.height
                  }}
                />
                {!previewMode
                  ? visibleLayers.map((layer) => (
                      <Rnd
                        key={layer.id}
                        bounds="parent"
                        position={{ x: layer.x, y: layer.y }}
                        size={{ width: layer.width, height: layer.height }}
                        onDragStop={(_, data) => store.updateDesignLayer(layer.id, { x: data.x, y: data.y })}
                        onResizeStop={(_, __, ref, ___, position) =>
                          store.updateDesignLayer(layer.id, {
                            width: Number(ref.style.width.replace("px", "")),
                            height: Number(ref.style.height.replace("px", "")),
                            x: position.x,
                            y: position.y
                          })
                        }
                        onClick={() => store.selectLayer(layer.id)}
                        className={`overflow-hidden rounded-md border ${store.selectedLayerId === layer.id ? "border-brand-yellow" : "border-transparent"}`}
                        style={{ transform: `rotate(${layer.rotation}deg)` }}
                      >
                        {layer.type === "text" ? (
                          <div
                            className="flex h-full w-full items-center justify-center text-center"
                            style={{
                              color: layer.color,
                              fontSize: layer.fontSize,
                              fontFamily: layer.fontFamily,
                              fontWeight: layer.fontWeight,
                              fontStyle: layer.fontStyle,
                              textAlign: layer.textAlign
                            }}
                          >
                            {layer.content}
                          </div>
                        ) : (
                          <img src={layer.content} alt="Uploaded artwork layer" className="h-full w-full object-contain" />
                        )}
                      </Rnd>
                    ))
                  : visibleLayers.map((layer) => (
                      <div
                        key={layer.id}
                        className="absolute"
                        style={{ left: layer.x, top: layer.y, width: layer.width, height: layer.height, transform: `rotate(${layer.rotation}deg)` }}
                      >
                        {layer.type === "text" ? (
                          <div
                            className="flex h-full w-full items-center justify-center text-center"
                            style={{
                              color: layer.color,
                              fontSize: layer.fontSize,
                              fontFamily: layer.fontFamily,
                              fontWeight: layer.fontWeight,
                              fontStyle: layer.fontStyle
                            }}
                          >
                            {layer.content}
                          </div>
                        ) : (
                          <img src={layer.content} alt="Preview artwork layer" className="h-full w-full object-contain" />
                        )}
                      </div>
                    ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <button type="button" onClick={() => setPreviewMode((value) => !value)} className="button-secondary">
                <Eye className="mr-2 h-4 w-4" />
                {previewMode ? "Edit mode" : "Preview mode"}
              </button>
              <button type="button" onClick={() => toast.success("Design saved locally in app state")} className="button-secondary">
                <Save className="mr-2 h-4 w-4" />
                Save design
              </button>
              <button type="button" onClick={downloadPreview} className="button-secondary">
                <Download className="mr-2 h-4 w-4" />
                Download preview
              </button>
            </div>

            {warnings.length ? (
              <div className="rounded-[24px] border border-brand-yellow/40 bg-brand-yellow/10 p-4">
                <p className="text-sm font-semibold">Warnings</p>
                <ul className="mt-2 space-y-2 text-sm text-brand-black/70">
                  {warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="space-y-6 rounded-[32px] bg-white p-6 shadow-card">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Choose product</span>
                <select
                  value={store.customDesign.productId}
                  onChange={(event) => store.updateCustomDesign({ productId: event.target.value })}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                >
                  {products.slice(0, 12).map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Choose product colour</span>
                <select
                  value={store.customDesign.productColor}
                  onChange={(event) => store.updateCustomDesign({ productColor: event.target.value })}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                >
                  {selectedProduct.colorOptions.map((color) => (
                    <option key={color} value={color}>
                      {color}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Select size</span>
                <select
                  value={store.customDesign.size}
                  onChange={(event) => store.updateCustomDesign({ size: event.target.value })}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                >
                  {selectedProduct.sizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Print location</span>
                <select
                  value={store.customDesign.printLocation}
                  onChange={(event) => store.updateCustomDesign({ printLocation: event.target.value })}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                >
                  {["Front chest", "Full front", "Back", "Left sleeve", "Right sleeve"].map((location) => (
                    <option key={location} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-semibold">Printing method</span>
                <select
                  value={store.customDesign.printMethod}
                  onChange={(event) => store.updateCustomDesign({ printMethod: event.target.value })}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                >
                  {selectedProduct.printMethods.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-sm font-semibold">Quantity</span>
                <input
                  type="number"
                  min={1}
                  value={store.customDesign.quantity}
                  onChange={(event) => store.updateCustomDesign({ quantity: Number(event.target.value) || 1 })}
                  className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                />
              </label>
            </div>

            <div className="grid gap-4 rounded-[28px] bg-brand-grey p-5">
              <div className="flex items-center gap-3">
                <Type className="h-5 w-5" />
                <p className="font-semibold">Add custom text</p>
              </div>
              <input
                value={customText}
                onChange={(event) => setCustomText(event.target.value)}
                placeholder="Type your custom text"
                className="rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none"
              />
              <div className="grid gap-4 md:grid-cols-2">
                <button type="button" onClick={addTextLayer} className="button-primary">
                  Add text layer
                </button>
                <label className="button-secondary cursor-pointer">
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Upload artwork
                  <input type="file" accept=".png,.jpg,.jpeg,.webp,.svg,image/webp" onChange={addImageLayer} className="hidden" />
                </label>
              </div>
            </div>

            {selectedLayer ? (
              <div className="space-y-4 rounded-[28px] border border-black/5 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Layers3 className="h-5 w-5" />
                    <p className="font-semibold">Selected layer controls</p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" className="rounded-full border border-black/10 p-2" onClick={() => store.duplicateDesignLayer(selectedLayer.id)}>
                      <Save className="h-4 w-4" />
                    </button>
                    <button type="button" className="rounded-full border border-black/10 p-2" onClick={() => store.deleteDesignLayer(selectedLayer.id)}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {selectedLayer.type === "text" ? (
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold">Text colour</span>
                      <input
                        type="color"
                        value={selectedLayer.color ?? "#ffc627"}
                        onChange={(event) => store.updateDesignLayer(selectedLayer.id, { color: event.target.value })}
                        className="h-12 w-full rounded-2xl border border-black/10 p-2"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold">Font size</span>
                      <input
                        type="range"
                        min={14}
                        max={72}
                        value={selectedLayer.fontSize ?? 24}
                        onChange={(event) => store.updateDesignLayer(selectedLayer.id, { fontSize: Number(event.target.value) })}
                        className="w-full"
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold">Alignment</span>
                      <select
                        value={selectedLayer.textAlign ?? "center"}
                        onChange={(event) => store.updateDesignLayer(selectedLayer.id, { textAlign: event.target.value as DesignLayer["textAlign"] })}
                        className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold">Style</span>
                      <select
                        value={selectedLayer.fontStyle ?? "normal"}
                        onChange={(event) => store.updateDesignLayer(selectedLayer.id, { fontStyle: event.target.value as DesignLayer["fontStyle"] })}
                        className="w-full rounded-2xl border border-black/10 px-4 py-3 outline-none"
                      >
                        <option value="normal">Bold</option>
                        <option value="italic">Italic</option>
                      </select>
                    </label>
                  </div>
                ) : null}
                <label className="block space-y-2">
                  <span className="text-sm font-semibold">Rotate element</span>
                  <div className="flex items-center gap-4">
                    <RotateCw className="h-4 w-4" />
                    <input
                      type="range"
                      min={-180}
                      max={180}
                      value={selectedLayer.rotation}
                      onChange={(event) => store.updateDesignLayer(selectedLayer.id, { rotation: Number(event.target.value) })}
                      className="w-full"
                    />
                  </div>
                </label>
              </div>
            ) : null}

            <div className="rounded-[28px] bg-brand-grey p-5">
              <h3 className="font-heading text-2xl font-bold">Layers list</h3>
              <div className="mt-4 space-y-3">
                {store.customDesign.layers.map((layer) => (
                  <button
                    key={layer.id}
                    type="button"
                    onClick={() => {
                      setActiveView(layer.view);
                      store.selectLayer(layer.id);
                    }}
                    className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left ${store.selectedLayerId === layer.id ? "bg-brand-black text-white" : "bg-white"}`}
                  >
                    <span>{layer.type === "text" ? layer.content : "Uploaded artwork"} • {layer.view}</span>
                    <span className="text-xs uppercase">{layer.type}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] bg-brand-black p-5 text-white">
              <h3 className="font-heading text-2xl font-bold">Dynamic price summary</h3>
              <div className="mt-4 space-y-3 text-sm text-white/75">
                <div className="flex justify-between"><span>Base product</span><span>{currencyFormatter.format(selectedProduct.price)}</span></div>
                <div className="flex justify-between"><span>Quantity</span><span>x {store.customDesign.quantity}</span></div>
                <div className="flex justify-between"><span>Print method</span><span>{store.customDesign.printMethod}</span></div>
                <div className="flex justify-between"><span>Layers</span><span>{store.customDesign.layers.length}</span></div>
                <div className="flex justify-between"><span>Rush delivery</span><span>{store.customDesign.rushDelivery ? "Yes" : "No"}</span></div>
              </div>
              <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="font-semibold">Estimated total</span>
                <span className="font-heading text-3xl font-extrabold">{currencyFormatter.format(dynamicPrice)}</span>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={store.customDesign.rushDelivery}
                    onChange={(event) => store.updateCustomDesign({ rushDelivery: event.target.checked })}
                  />
                  Rush delivery
                </label>
                <label className="flex items-center gap-3 rounded-2xl bg-white/8 px-4 py-3 text-sm">
                  <input
                    type="checkbox"
                    checked={store.customDesign.embroidery}
                    onChange={(event) => store.updateCustomDesign({ embroidery: event.target.checked })}
                  />
                  Add embroidery
                </label>
              </div>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  className="button-primary bg-brand-yellow text-brand-black hover:bg-brand-yellow/90"
                  onClick={() => {
                    store.addToCart({
                      productId: selectedProduct.id,
                      variantId: selectedProduct.variants[0].id,
                      quantity: store.customDesign.quantity,
                      customization: { ...store.customDesign, productId: selectedProduct.id }
                    });
                    toast.success("Customised product added to cart");
                  }}
                >
                  Add customised product to cart
                </button>
                <Link to="/cart" className="button-secondary border-white/20 bg-white/5 text-white">
                  Review in bag
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
