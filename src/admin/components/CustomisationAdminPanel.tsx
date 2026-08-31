import { ImagePlus, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Rnd } from "react-rnd";
import { toast } from "sonner";
import { adminService } from "../../services/api";
import { containedImageBounds, constrainRect, unitRect } from "../../lib/printingArea";
import type { CustomPrintArea, CustomProductConfiguration, CustomProductSummary, NormalizedPoint, NormalizedRect, ProductSide } from "../../types/models";

type Row = Record<string, unknown>;
type Rect = NormalizedRect;
type ViewSettings = Pick<CustomPrintArea, "printingAreaMode" | "safeBoundaryType" | "garmentSafeArea" | "garmentSafePolygon" | "garmentMaskUrl" | "safeAreaVersion" | "minWidthNormalized" | "minHeightNormalized" | "maxWidthNormalized" | "maxHeightNormalized" | "allowMove" | "allowResize" | "allowCustomAreaSelection">;
const sides: ProductSide[] = ["front", "back", "right", "left"];
const editorWidth = 320;
const editorHeight = 368;
const initialViews = Object.fromEntries(sides.map((side) => [side, `/customisation/mockups/white-${side}.svg`])) as Record<ProductSide, string>;
const initialDimensions = Object.fromEntries(sides.map((side) => [side, { width: 800, height: 920, publicId: null as string | null }])) as Record<ProductSide, { width: number; height: number; publicId: string | null }>;
const initialRects = (): Record<ProductSide, Rect> => ({
  front: { x: .309, y: .22, width: .381, height: .62 }, back: { x: .3, y: .179, width: .4, height: .65 },
  right: { x: .694, y: .209, width: .181, height: .22 }, left: { x: .125, y: .209, width: .181, height: .22 }
});
const defaultSettings = (): ViewSettings => ({ printingAreaMode: "fixed", safeBoundaryType: "rectangle", garmentSafeArea: { ...unitRect }, garmentSafePolygon: [], garmentMaskUrl: null, safeAreaVersion: "1", minWidthNormalized: .05, minHeightNormalized: .05, maxWidthNormalized: 1, maxHeightNormalized: 1, allowMove: false, allowResize: false, allowCustomAreaSelection: false });
const initialSettings = () => Object.fromEntries(sides.map((side) => [side, defaultSettings()])) as Record<ProductSide, ViewSettings>;
const fieldClass = "min-h-11 rounded-xl border border-black/10 px-3 text-sm font-normal normal-case tracking-normal";

export function CustomisationAdminPanel() {
  const [categories, setCategories] = useState<Row[]>([]);
  const [products, setProducts] = useState<CustomProductSummary[]>([]);
  const [methods, setMethods] = useState<Row[]>([]);
  const [orders, setOrders] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [newParent, setNewParent] = useState("");
  const [editing, setEditing] = useState<CustomProductConfiguration | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [specification, setSpecification] = useState("");
  const [basePrice, setBasePrice] = useState("549");
  const [modelUrl, setModelUrl] = useState("");
  const [viewerMode, setViewerMode] = useState<"auto" | "real3d" | "image360">("auto");
  const [modelFormat, setModelFormat] = useState<"glb" | "gltf" | "obj">("glb");
  const [modelScale, setModelScale] = useState("1");
  const [modelPosition, setModelPosition] = useState("0, 0, 0");
  const [modelRotation, setModelRotation] = useState("0, 0, 0");
  const [materialNames, setMaterialNames] = useState("");
  const [artworkMappings, setArtworkMappings] = useState("{}");
  const [sizeList, setSizeList] = useState("S, M, L, XL");
  const [active, setActive] = useState(true);
  const [views, setViews] = useState<Record<ProductSide, string>>(initialViews);
  const [viewDimensions, setViewDimensions] = useState(initialDimensions);
  const [selectedColourId, setSelectedColourId] = useState("");
  const [printSide, setPrintSide] = useState<ProductSide>("front");
  const [printRects, setPrintRects] = useState<Record<ProductSide, Rect>>(initialRects);
  const [printSettings, setPrintSettings] = useState<Record<ProductSide, ViewSettings>>(initialSettings);
  const roots = useMemo(() => categories.filter((category) => !category.parent_id), [categories]);
  const children = useMemo(() => categories.filter((category) => String(category.parent_id ?? "") === categoryId), [categories, categoryId]);

  const load = async () => {
    setLoading(true);
    try {
      const [categoryData, productData, methodData, orderData] = await Promise.all([
        adminService.listCustomCategories(), adminService.listCustomProducts(),
        adminService.listCustomPrintingMethods(), adminService.listCustomOrders()
      ]);
      setCategories(categoryData.items); setProducts(productData.items); setMethods(methodData.items); setOrders(orderData.items);
      setCategoryId((value) => value || String(categoryData.items.find((item) => !item.parent_id)?.id ?? ""));
    } catch (loadError) { toast.error(loadError instanceof Error ? loadError.message : "Customisation admin could not be loaded."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const resetProduct = () => {
    setEditing(null); setName(""); setSlug(""); setSpecification(""); setBasePrice("549"); setModelUrl("");
    setViewerMode("auto"); setModelFormat("glb"); setModelScale("1"); setModelPosition("0, 0, 0"); setModelRotation("0, 0, 0"); setMaterialNames(""); setArtworkMappings("{}");
    setSizeList("S, M, L, XL"); setViews(initialViews); setViewDimensions(initialDimensions); setSelectedColourId(""); setPrintRects(initialRects()); setPrintSettings(initialSettings()); setPrintSide("front"); setActive(true);
  };

  const loadColourEditor = (config: CustomProductConfiguration, colourId: string) => {
    const colour = config.colours.find((entry) => entry.id === colourId) ?? config.colours[0];
    if (!colour) return;
    setSelectedColourId(colour.id);
    setViews(Object.fromEntries(colour.views.map((view) => [view.side, view.imageUrl])) as Record<ProductSide, string>);
    setViewDimensions(Object.fromEntries(colour.views.map((view) => [view.side, { width: view.naturalWidth, height: view.naturalHeight, publicId: view.publicId ?? null }])) as typeof viewDimensions);
    const nextRects = initialRects();
    const nextSettings = initialSettings();
    sides.forEach((side) => {
      const area = config.printAreas.find((entry) => entry.side === side && entry.colourId === colour.id)
        ?? config.printAreas.find((entry) => entry.side === side && !entry.colourId);
      if (area) {
        nextRects[side] = area.defaultArea ?? { x: area.x / area.referenceWidth, y: area.y / area.referenceHeight, width: area.width / area.referenceWidth, height: area.height / area.referenceHeight };
        nextSettings[side] = { printingAreaMode: area.printingAreaMode ?? "fixed", safeBoundaryType: area.safeBoundaryType ?? "rectangle", garmentSafeArea: area.garmentSafeArea ?? { ...unitRect }, garmentSafePolygon: area.garmentSafePolygon ?? [], garmentMaskUrl: area.garmentMaskUrl ?? null, safeAreaVersion: area.safeAreaVersion ?? "legacy-1", minWidthNormalized: area.minWidthNormalized ?? .05, minHeightNormalized: area.minHeightNormalized ?? .05, maxWidthNormalized: area.maxWidthNormalized ?? 1, maxHeightNormalized: area.maxHeightNormalized ?? 1, allowMove: area.allowMove ?? false, allowResize: area.allowResize ?? false, allowCustomAreaSelection: area.allowCustomAreaSelection ?? false };
      }
    });
    setPrintRects(nextRects);
    setPrintSettings(nextSettings);
  };

  const editProduct = async (product: CustomProductSummary) => {
    setBusy(`edit-${product.id}`);
    try {
      const config = await adminService.getCustomProductConfiguration(product.slug);
      setEditing(config); setName(config.name); setSlug(config.slug); setCategoryId(config.categoryId);
      setSubcategoryId(config.subcategoryId ?? ""); setSpecification(config.specification ?? "");
      setBasePrice(String(config.basePrice)); setModelUrl(config.modelUrl ?? ""); setViewerMode(config.viewerMode ?? "auto"); setModelFormat(config.modelFormat ?? "glb");
      setModelScale(String(config.modelScale ?? 1)); setModelPosition((config.modelPosition ?? [0, 0, 0]).join(", ")); setModelRotation((config.modelRotation ?? [0, 0, 0]).join(", "));
      setMaterialNames((config.materialNames ?? []).join(", ")); setArtworkMappings(JSON.stringify(config.modelArtworkMappings ?? {}, null, 2)); setSizeList(config.sizes.map((size) => size.name).join(", ")); setActive(config.isActive);
      const defaultColour = config.colours.find((colour) => colour.isDefault) ?? config.colours[0];
      loadColourEditor(config, defaultColour.id);
    } catch (editError) { toast.error(editError instanceof Error ? editError.message : "Product configuration could not be opened."); }
    finally { setBusy(""); }
  };

  const uploadView = async (side: ProductSide, file?: File) => {
    if (!file) return;
    setBusy(`upload-${side}`);
    try { const [upload] = await adminService.uploadImages([file]); setViews((current) => ({ ...current, [side]: upload.url })); setViewDimensions((current) => ({ ...current, [side]: { width: upload.width, height: upload.height, publicId: upload.publicId } })); }
    catch (uploadError) { toast.error(uploadError instanceof Error ? uploadError.message : "Mockup upload failed."); }
    finally { setBusy(""); }
  };

  const uploadModel = async (file?: File) => {
    if (!file) return;
    setBusy("upload-model");
    try {
      const uploaded = await adminService.uploadCustomModel(file);
      setModelUrl(uploaded.url);
      const extension = uploaded.originalName.split(".").pop()?.toLowerCase();
      if (extension === "glb" || extension === "gltf" || extension === "obj") setModelFormat(extension);
      toast.success("3D model uploaded.");
    } catch (uploadError) { toast.error(uploadError instanceof Error ? uploadError.message : "3D model upload failed."); }
    finally { setBusy(""); }
  };

  const saveProduct = async () => {
    if (!name.trim() || !categoryId || !methods[0]?.id) { toast.error("Add a name, category and printing method first."); return; }
    setBusy("save-product");
    try {
      const editedColour = editing?.colours.find((colour) => colour.id === selectedColourId) ?? editing?.colours.find((colour) => colour.isDefault) ?? editing?.colours[0];
      const editedColourId = editedColour?.id;
      const colours = editing ? editing.colours.map((colour) => colour.id === editedColourId ? {
        ...colour,
        views: colour.views.map((view) => ({ ...view, imageUrl: views[view.side], publicId: viewDimensions[view.side].publicId, naturalWidth: viewDimensions[view.side].width, naturalHeight: viewDimensions[view.side].height, isPlaceholder: views[view.side].startsWith("/customisation/") }))
      } : colour) : [{
        name: "White", slug: "white", hexCode: "#FDFDFC", additionalPrice: 0, isDefault: true, isActive: true, displayOrder: 10,
        views: sides.map((side) => ({ side, imageUrl: views[side], publicId: viewDimensions[side].publicId, naturalWidth: viewDimensions[side].width, naturalHeight: viewDimensions[side].height, isPlaceholder: views[side].startsWith("/customisation/") }))
      }];
      const areas = editing ? editing.printAreas.map((area) => area.colourId === editedColourId || (!area.colourId && !editedColourId) ? {
        ...area, referenceWidth: viewDimensions[area.side].width, referenceHeight: viewDimensions[area.side].height,
        x: Math.round(printRects[area.side].x * viewDimensions[area.side].width), y: Math.round(printRects[area.side].y * viewDimensions[area.side].height),
        width: Math.round(printRects[area.side].width * viewDimensions[area.side].width), height: Math.round(printRects[area.side].height * viewDimensions[area.side].height), defaultArea: printRects[area.side], ...printSettings[area.side]
      } : area) : sides.map((side) => ({
        colourId: null, side, referenceWidth: viewDimensions[side].width, referenceHeight: viewDimensions[side].height,
        x: Math.round(printRects[side].x * viewDimensions[side].width), y: Math.round(printRects[side].y * viewDimensions[side].height),
        width: Math.round(printRects[side].width * viewDimensions[side].width), height: Math.round(printRects[side].height * viewDimensions[side].height), defaultArea: printRects[side], ...printSettings[side],
        realWidthCm: 30, realHeightCm: 40, safeMargin: 10, isActive: true
      }));
      const parseVector = (value: string, label: string): [number, number, number] => {
        const parts = value.split(",").map(Number);
        if (parts.length !== 3 || parts.some((part) => !Number.isFinite(part))) throw new Error(`${label} must contain three comma-separated numbers.`);
        return parts as [number, number, number];
      };
      const parsedMappings = JSON.parse(artworkMappings || "{}") as CustomProductConfiguration["modelArtworkMappings"];
      const payload = {
        categoryId, subcategoryId: subcategoryId || null, name, slug: slug || undefined,
        description: `${name} blank customisation product`, specification, basePrice: Number(basePrice), thumbnailUrl: views.front, modelUrl: modelUrl || null,
        viewerMode, modelFormat: modelUrl ? modelFormat : null, modelScale: Number(modelScale) || 1,
        modelPosition: parseVector(modelPosition, "Model position"), modelRotation: parseVector(modelRotation, "Model rotation"),
        materialNames: materialNames.split(",").map((value) => value.trim()).filter(Boolean), modelArtworkMappings: parsedMappings,
        isActive: active, isFeatured: false, isPlaceholder: views.front.startsWith("/customisation/"), displayOrder: editing?.displayOrder ?? (products.length + 1) * 10,
        sizes: sizeList.split(",").map((value) => value.trim()).filter(Boolean).map((value) => ({ name: value, additionalPrice: value === "2XL" ? 80 : 0 })),
        colours, printAreas: areas, printingMethodIds: [String(methods[0].id)]
      };
      if (editing) await adminService.updateCustomProduct(editing.id, payload); else await adminService.createCustomProduct(payload);
      toast.success(editing ? "Custom product updated." : "Custom product created."); resetProduct(); await load();
    } catch (saveError) { toast.error(saveError instanceof Error ? saveError.message : "Custom product could not be saved."); }
    finally { setBusy(""); }
  };

  if (loading) return <div className="grid min-h-64 place-items-center"><LoaderCircle className="h-7 w-7 animate-spin" /></div>;
  const editorBounds = containedImageBounds(editorWidth, editorHeight, viewDimensions[printSide].width, viewDimensions[printSide].height);
  const activeRect = printRects[printSide];
  const activeSettings = printSettings[printSide];
  const updateSettings = (patch: Partial<ViewSettings>) => setPrintSettings((current) => ({ ...current, [printSide]: { ...current[printSide], ...patch } }));
  const updateNormalizedRect = (rect: Rect) => setPrintRects((current) => ({ ...current, [printSide]: constrainRect(rect, activeSettings.garmentSafeArea, { minWidth: activeSettings.minWidthNormalized, minHeight: activeSettings.minHeightNormalized, maxWidth: activeSettings.maxWidthNormalized, maxHeight: activeSettings.maxHeightNormalized }) }));
  return <div className="space-y-6">
    <div className="grid gap-4 md:grid-cols-3">
      {[["Custom products", products.length], ["Custom categories", categories.length], ["Custom orders", orders.length]].map(([label, value]) => <div key={String(label)} className="rounded-2xl bg-white p-5"><span className="text-xs font-bold uppercase tracking-[.14em] text-brand-black/50">{label}</span><strong className="mt-2 block text-3xl">{value}</strong></div>)}
    </div>
    <section className="rounded-2xl bg-white p-5">
      <h3 className="text-xl font-extrabold">Custom Categories</h3><p className="mt-1 text-sm text-brand-black/60">Separate from storefront categories.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <input className={fieldClass} value={newCategory} onChange={(event) => setNewCategory(event.target.value)} placeholder="Category name" />
        <select className={fieldClass} value={newParent} onChange={(event) => setNewParent(event.target.value)}><option value="">Top-level category</option>{roots.map((root) => <option key={String(root.id)} value={String(root.id)}>{String(root.name)}</option>)}</select>
        <button type="button" className="min-h-11 rounded-full bg-brand-black px-5 text-sm font-bold text-white" onClick={() => void (async () => { if (!newCategory.trim()) return; await adminService.createCustomCategory({ name: newCategory, parentId: newParent || null, displayOrder: categories.length * 10, isActive: true }); setNewCategory(""); await load(); })()}><Plus className="mr-2 inline h-4 w-4" />Add</button>
      </div>
    </section>
    <div className="grid gap-6 xl:grid-cols-[minmax(0,.8fr)_minmax(420px,1.2fr)]">
      <section className="rounded-2xl bg-white p-5">
        <div className="flex items-center justify-between"><div><h3 className="text-xl font-extrabold">Custom Products</h3><p className="text-sm text-brand-black/60">Only these appear at /customise.</p></div><button type="button" className="min-h-11 rounded-full border border-black/10 px-4 text-sm font-bold" onClick={resetProduct}><Plus className="mr-2 inline h-4 w-4" />New</button></div>
        <div className="mt-5 space-y-3">{products.map((product) => <div key={product.id} className="flex items-center gap-3 rounded-xl border border-black/8 p-3"><img src={product.thumbnailUrl || initialViews.front} alt="" className="h-16 w-14 rounded-lg bg-brand-grey object-contain" /><div className="min-w-0 flex-1"><strong className="block truncate">{product.name}</strong><span className="text-xs text-brand-black/55">{product.categoryName} · ₹{product.basePrice}</span></div><button type="button" aria-label={`Edit ${product.name}`} className="grid h-11 w-11 place-items-center rounded-full border border-black/10" onClick={() => void editProduct(product)}>{busy === `edit-${product.id}` ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}</button><button type="button" aria-label={`Delete ${product.name}`} className="grid h-11 w-11 place-items-center rounded-full border border-red-200 text-red-700" onClick={() => void (async () => { if (window.confirm(`Deactivate and delete ${product.name}?`)) { await adminService.deleteCustomProduct(product.id); await load(); } })()}><Trash2 className="h-4 w-4" /></button></div>)}</div>
      </section>
      <section className="rounded-2xl bg-white p-5">
        <h3 className="text-xl font-extrabold">{editing ? `Edit ${editing.name}` : "Add Custom Product"}</h3>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <AdminField label="Name"><input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} /></AdminField>
          <AdminField label="Slug"><input className={fieldClass} value={slug} onChange={(event) => setSlug(event.target.value)} /></AdminField>
          <AdminField label="Category"><select className={fieldClass} value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setSubcategoryId(""); }}>{roots.map((root) => <option key={String(root.id)} value={String(root.id)}>{String(root.name)}</option>)}</select></AdminField>
          <AdminField label="Subcategory"><select className={fieldClass} value={subcategoryId} onChange={(event) => setSubcategoryId(event.target.value)}><option value="">None</option>{children.map((child) => <option key={String(child.id)} value={String(child.id)}>{String(child.name)}</option>)}</select></AdminField>
          <AdminField label="Specification"><input className={fieldClass} value={specification} onChange={(event) => setSpecification(event.target.value)} /></AdminField>
          <AdminField label="Base price"><input type="number" className={fieldClass} value={basePrice} onChange={(event) => setBasePrice(event.target.value)} /></AdminField>
          <AdminField label="Sizes" wide><input className={fieldClass} value={sizeList} onChange={(event) => setSizeList(event.target.value)} /></AdminField>
          <AdminField label="3D model URL" wide><input className={fieldClass} value={modelUrl} onChange={(event) => setModelUrl(event.target.value)} placeholder="/customisation/models/product.glb" /></AdminField>
          <AdminField label="360 viewer mode"><select className={fieldClass} value={viewerMode} onChange={(event) => setViewerMode(event.target.value as typeof viewerMode)}><option value="auto">Auto</option><option value="real3d">Real 3D</option><option value="image360">Image 360</option></select></AdminField>
          <AdminField label="Model format"><select className={fieldClass} value={modelFormat} onChange={(event) => setModelFormat(event.target.value as typeof modelFormat)}><option value="glb">GLB</option><option value="gltf">GLTF</option><option value="obj">OBJ</option></select></AdminField>
          <AdminField label="Upload 3D model" wide><label className="flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-dashed border-black/20 text-sm normal-case tracking-normal"><input type="file" accept=".glb,.gltf,.obj,model/gltf-binary,model/gltf+json" className="sr-only" onChange={(event) => void uploadModel(event.target.files?.[0])} />{busy === "upload-model" ? "Uploading model…" : "Choose GLB, GLTF or OBJ"}</label></AdminField>
          <AdminField label="Model scale"><input type="number" step="0.01" min="0.01" className={fieldClass} value={modelScale} onChange={(event) => setModelScale(event.target.value)} /></AdminField>
          <AdminField label="Colour material names"><input className={fieldClass} value={materialNames} onChange={(event) => setMaterialNames(event.target.value)} placeholder="Body, Fabric" /></AdminField>
          <AdminField label="Model position (x, y, z)" wide><input className={fieldClass} value={modelPosition} onChange={(event) => setModelPosition(event.target.value)} /></AdminField>
          <AdminField label="Model rotation (x, y, z radians)" wide><input className={fieldClass} value={modelRotation} onChange={(event) => setModelRotation(event.target.value)} /></AdminField>
          <AdminField label="Per-side 3D artwork mappings (JSON)" wide><textarea rows={5} className={`${fieldClass} py-3 font-mono`} value={artworkMappings} onChange={(event) => setArtworkMappings(event.target.value)} /></AdminField>
        </div>
        {editing && editing.colours.length > 1 ? <div className="mt-6"><h4 className="font-extrabold">Colour configuration</h4><div className="mt-2 flex flex-wrap gap-2">{editing.colours.map((colour) => <button key={colour.id} type="button" className={`min-h-11 rounded-full px-4 text-sm font-bold ${selectedColourId === colour.id ? "bg-brand-black text-white" : "border border-black/10"}`} onClick={() => loadColourEditor(editing, colour.id)}><span className="mr-2 inline-block h-3 w-3 rounded-full border border-black/15 align-middle" style={{ backgroundColor: colour.hexCode }} />{colour.name}</button>)}</div></div> : null}
        <h4 className="mt-6 font-extrabold">{editing ? `${editing.colours.find((colour) => colour.id === selectedColourId)?.name ?? "Default"} blank mockups` : "Default-colour blank mockups"}</h4>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{sides.map((side) => <label key={side} className="relative grid min-h-32 cursor-pointer place-items-center overflow-hidden rounded-xl border border-black/10 bg-brand-grey p-2"><img src={views[side]} alt={`${side} blank mockup`} className="h-24 w-full object-contain" /><span className="absolute inset-x-2 bottom-2 rounded-full bg-white px-2 py-1 text-center text-[11px] font-bold uppercase"><ImagePlus className="mr-1 inline h-3 w-3" />{busy === `upload-${side}` ? "Uploading" : side}</span><input type="file" accept=".png,.jpg,.jpeg,.webp" className="sr-only" onChange={(event) => void uploadView(side, event.target.files?.[0])} /></label>)}</div>
        <h4 className="mt-6 font-extrabold">Per-view printing area</h4><p className="mt-1 text-xs text-brand-black/55">Configure normalized image-relative defaults and garment-safe boundaries. Letterboxing is excluded.</p>
        <div className="mt-3 flex justify-center gap-2">{sides.map((side) => <button key={side} type="button" onClick={() => setPrintSide(side)} className={`min-h-11 rounded-full px-3 text-xs font-bold uppercase ${printSide === side ? "bg-brand-black text-white" : "border border-black/10"}`}>{side}</button>)}</div>
        <div className="relative mx-auto mt-3 h-[368px] w-[320px] max-w-full overflow-hidden rounded-xl bg-brand-grey"><div className="absolute" style={{ left: editorBounds.left, top: editorBounds.top, width: editorBounds.width, height: editorBounds.height }}><img src={views[printSide]} alt={`${printSide} print-area editor`} className="h-full w-full object-fill" /><div className="pointer-events-none absolute border border-emerald-500/80 bg-emerald-400/5" style={{ left: `${activeSettings.garmentSafeArea.x * 100}%`, top: `${activeSettings.garmentSafeArea.y * 100}%`, width: `${activeSettings.garmentSafeArea.width * 100}%`, height: `${activeSettings.garmentSafeArea.height * 100}%` }} /><Rnd bounds="parent" minWidth={activeSettings.minWidthNormalized * editorBounds.width} minHeight={activeSettings.minHeightNormalized * editorBounds.height} maxWidth={activeSettings.maxWidthNormalized * editorBounds.width} maxHeight={activeSettings.maxHeightNormalized * editorBounds.height} size={{ width: activeRect.width * editorBounds.width, height: activeRect.height * editorBounds.height }} position={{ x: activeRect.x * editorBounds.width, y: activeRect.y * editorBounds.height }} onDragStop={(_, data) => updateNormalizedRect({ ...activeRect, x: data.x / editorBounds.width, y: data.y / editorBounds.height })} onResizeStop={(_, __, ref, ___, position) => updateNormalizedRect({ x: position.x / editorBounds.width, y: position.y / editorBounds.height, width: ref.offsetWidth / editorBounds.width, height: ref.offsetHeight / editorBounds.height })} className="border-2 border-dashed border-brand-cyan bg-brand-cyan/10" /></div></div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <AdminField label="Printing-area mode"><select className={fieldClass} value={activeSettings.printingAreaMode} onChange={(event) => updateSettings({ printingAreaMode: event.target.value as ViewSettings["printingAreaMode"] })}><option value="fixed">Fixed</option><option value="customer_adjustable">Customer Adjustable</option></select></AdminField>
          <AdminField label="Safe boundary"><select className={fieldClass} value={activeSettings.safeBoundaryType} onChange={(event) => updateSettings({ safeBoundaryType: event.target.value as ViewSettings["safeBoundaryType"] })}><option value="rectangle">Rectangle</option><option value="polygon">Polygon</option><option value="mask">Mask / polygon</option></select></AdminField>
          {(["x", "y", "width", "height"] as const).map((key) => <AdminField key={key} label={`Safe ${key}`}><input type="number" min="0" max="1" step="0.01" className={fieldClass} value={activeSettings.garmentSafeArea[key]} onChange={(event) => updateSettings({ garmentSafeArea: { ...activeSettings.garmentSafeArea, [key]: Number(event.target.value) } })} /></AdminField>)}
          <AdminField label="Minimum width"><input type="number" min="0.01" max="1" step="0.01" className={fieldClass} value={activeSettings.minWidthNormalized} onChange={(event) => updateSettings({ minWidthNormalized: Number(event.target.value) })} /></AdminField>
          <AdminField label="Minimum height"><input type="number" min="0.01" max="1" step="0.01" className={fieldClass} value={activeSettings.minHeightNormalized} onChange={(event) => updateSettings({ minHeightNormalized: Number(event.target.value) })} /></AdminField>
          <AdminField label="Maximum width"><input type="number" min="0.01" max="1" step="0.01" className={fieldClass} value={activeSettings.maxWidthNormalized} onChange={(event) => updateSettings({ maxWidthNormalized: Number(event.target.value) })} /></AdminField>
          <AdminField label="Maximum height"><input type="number" min="0.01" max="1" step="0.01" className={fieldClass} value={activeSettings.maxHeightNormalized} onChange={(event) => updateSettings({ maxHeightNormalized: Number(event.target.value) })} /></AdminField>
          <AdminField label="Safe-area version"><input className={fieldClass} value={activeSettings.safeAreaVersion} onChange={(event) => updateSettings({ safeAreaVersion: event.target.value })} /></AdminField>
          <AdminField label="Mask URL"><input className={fieldClass} value={activeSettings.garmentMaskUrl ?? ""} onChange={(event) => updateSettings({ garmentMaskUrl: event.target.value || null })} /></AdminField>
          <AdminField label="Polygon points (normalized JSON)" wide><textarea rows={3} className={`${fieldClass} py-2 font-mono`} value={JSON.stringify(activeSettings.garmentSafePolygon)} onChange={(event) => { try { updateSettings({ garmentSafePolygon: JSON.parse(event.target.value) as NormalizedPoint[] }); } catch { /* retain the last valid polygon while typing */ } }} /></AdminField>
        </div>
        <div className="mt-3 flex flex-wrap gap-5 text-sm font-semibold">{[["Allow move", "allowMove"], ["Allow resize", "allowResize"], ["Allow custom area selection", "allowCustomAreaSelection"]].map(([label, key]) => <label key={key} className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={Boolean(activeSettings[key as keyof ViewSettings])} onChange={(event) => updateSettings({ [key]: event.target.checked })} />{label}</label>)}</div>
        <label className="mt-5 flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} />Active in Customise catalogue</label>
        <button type="button" className="mt-5 min-h-12 w-full rounded-full bg-brand-cyan font-extrabold text-brand-navy" disabled={busy === "save-product"} onClick={() => void saveProduct()}>{busy === "save-product" ? "Saving…" : editing ? "Update custom product" : "Create custom product"}</button>
      </section>
    </div>
    <section className="rounded-2xl bg-white p-5">
      <h3 className="text-xl font-extrabold">Production printing areas</h3><p className="mt-1 text-sm text-brand-black/60">Confirmed normalized placement and safe-area version saved with each customised order.</p>
      <div className="mt-5 grid gap-3">{orders.length ? orders.map((order) => {
        const areas = (order.printing_areas ?? {}) as Record<string, NormalizedRect>;
        const versions = (order.safe_area_versions ?? {}) as Record<string, string>;
        return <details key={String(order.id)} className="rounded-xl border border-black/10 p-4"><summary className="cursor-pointer font-bold">{String(order.order_number)} · {String(order.product_name)} · Qty {String(order.quantity)}</summary><div className="mt-3 grid gap-2 sm:grid-cols-4">{sides.map((side) => <div key={side} className="rounded-lg bg-brand-grey p-3"><strong className="text-xs uppercase">{side}</strong>{areas[side] ? <code className="mt-2 block text-[11px] leading-5">x {areas[side].x.toFixed(4)}<br />y {areas[side].y.toFixed(4)}<br />w {areas[side].width.toFixed(4)}<br />h {areas[side].height.toFixed(4)}</code> : <span className="mt-2 block text-xs text-brand-black/50">Legacy order</span>}<span className="mt-2 block text-[10px]">Safe {versions[side] ?? "legacy"}</span></div>)}</div></details>;
      }) : <p className="text-sm text-brand-black/55">No customised orders yet.</p>}</div>
    </section>
  </div>;
}

function AdminField({ label, wide, children }: { label: string; wide?: boolean; children: React.ReactNode }) {
  return <label className={`grid gap-1 text-xs font-bold uppercase tracking-[.1em] ${wide ? "sm:col-span-2" : ""}`}>{label}{children}</label>;
}
