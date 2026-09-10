import { useEffect, useRef, useState, type ReactNode } from "react";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { toast } from "sonner";
import { corporateService } from "../../services/corporate";
import { adminService } from "../../services/api";
import { ApiError } from "../../lib/http";
import { corporatePrice, type CorporateProduct } from "../../types/corporate";

type Draft = Omit<CorporateProduct, "id"> & { id?: string };
const empty = (): Draft => ({ name: "", slug: "", category: "", shortDescription: "", description: "", mainImage: "", additionalImages: [], includedItems: [""], minimumOrderQuantity: 1, startingPrice: null, pricingType: "request_quote", customisationAvailable: false, logoPrintingAvailable: false, employeeNamePersonalisation: false, customPackagingAvailable: false, bulkQuantityAvailable: true, deliveryInformation: "", isFeatured: false, isActive: true, displayOrder: 0 });
const input = "min-h-11 min-w-0 w-full rounded-2xl border border-black/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-black";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-black/15 px-4 py-2 text-sm font-semibold disabled:opacity-50";
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="grid min-w-0 gap-2 text-sm font-semibold">{label}{children}</label>; }
const flags = [["customisationAvailable", "Customisation Available"], ["logoPrintingAvailable", "Logo Printing Available"], ["employeeNamePersonalisation", "Employee Name Personalisation"], ["customPackagingAvailable", "Custom Packaging Available"], ["bulkQuantityAvailable", "Bulk Quantity Available"], ["isFeatured", "Featured Product"], ["isActive", "Active"]] as const;

export function CorporateProductsAdminPanel() {
 const [items, setItems] = useState<CorporateProduct[]>([]);
 const [categories, setCategories] = useState<string[]>([]);
 const [search, setSearch] = useState(""); const [category, setCategory] = useState("");
 const [draft, setDraft] = useState<Draft | null>(null);
 const [error, setError] = useState(""); const [formError, setFormError] = useState("");
 const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
 const [revision, setRevision] = useState(0); const [deleting, setDeleting] = useState<CorporateProduct | null>(null);
 const editor = useRef<HTMLDivElement>(null);
 useEffect(() => {
  const controller = new AbortController(); setLoading(true); setError("");
  const timer = setTimeout(() => { void corporateService.list(true, search, category, controller.signal).then(data => { setItems(data.items); setCategories(data.categories); }).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); }, 200);
  return () => { clearTimeout(timer); controller.abort(); };
 }, [search, category, revision]);
 const editingId = draft?.id; const editorOpen = draft !== null;
 useEffect(() => { if (editorOpen) { editor.current?.scrollIntoView({ block: "start" }); editor.current?.querySelector("input")?.focus(); } }, [editingId, editorOpen]);
 const update = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft(current => current ? { ...current, [key]: value } : current);
 async function action(task: () => Promise<unknown>, message: string) {
  setBusy(true); setError("");
  try { await task(); setRevision(value => value + 1); toast.success(message); } catch (err) { setError(err instanceof Error ? err.message : "Please try again."); } finally { setBusy(false); }
 }
 async function upload(files: File[], main: boolean) {
  if (!files.length) return;
  setFormError("");
  if (files.some(file => file.size > 5 * 1024 * 1024 || !/\.(jpe?g|png|webp)$/i.test(file.name))) { setFormError("Choose JPG, PNG or WebP images up to 5 MB each."); return; }
  if (!main && files.length + (draft?.additionalImages.length ?? 0) > 10) { setFormError("You can add up to 10 additional images."); return; }
  setBusy(true);
  try { const uploaded = await adminService.uploadImages(files); setDraft(current => current ? { ...current, ...(main ? { mainImage: uploaded[0].url } : { additionalImages: [...current.additionalImages, ...uploaded.map(image => image.url)] }) } : current); }
  catch (err) { setFormError(err instanceof Error ? err.message : "Image upload failed."); } finally { setBusy(false); }
 }
 return <div className="space-y-6">
  <div className="flex flex-wrap items-center justify-between gap-4"><p className="text-sm text-brand-black/70">Manage corporate kits, branding options and quote pricing.</p><button className={`${button} bg-brand-black text-white`} disabled={busy} onClick={() => { setDraft(empty()); setFormError(""); }}><Plus size={16} />Add Corporate Product</button></div>
  <div className="grid gap-4 sm:grid-cols-2"><Field label="Search corporate products"><input className={input} value={search} onChange={event => setSearch(event.target.value)} placeholder="Search by name or description" /></Field><Field label="Filter by category"><select className={input} value={category} onChange={event => setCategory(event.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value}>{value}</option>)}</select></Field></div>
  {error && <div role="alert" className="rounded-2xl bg-red-50 p-4 text-red-800">{error} <button className="underline" onClick={() => setRevision(value => value + 1)}>Retry</button></div>}
  {loading ? <p role="status">Loading corporate products…</p> : !items.length ? <p className="rounded-2xl bg-white p-8">No corporate products found. Add a kit or adjust your filters.</p> : <div className="grid gap-4 xl:grid-cols-2">{items.map(product => <article key={product.id} className="flex min-w-0 flex-col gap-4 rounded-2xl bg-white p-5 sm:flex-row">
   <img src={product.mainImage} alt={product.name} className="aspect-square w-full rounded-xl object-cover sm:h-28 sm:w-28" />
   <div className="min-w-0 flex-1"><h3 className="break-words font-heading text-lg font-bold">{product.name}</h3><p className="mt-1 text-sm text-brand-black/70">{product.category} · {corporatePrice(product)}</p><p className="mt-1 text-sm">MOQ {product.minimumOrderQuantity} · Order {product.displayOrder}</p>
    <div className="mt-3 flex flex-wrap gap-2"><button className={button} disabled={busy} onClick={() => { setDraft(structuredClone(product)); setFormError(""); }}><Pencil size={15} />Edit</button><button className={button} disabled={busy} aria-label={`${product.isActive ? "Deactivate" : "Activate"} ${product.name}`} onClick={() => void action(() => corporateService.patch(product.id, { isActive: !product.isActive }), "Product status updated.")}>{product.isActive ? "Active" : "Inactive"}</button><button className={button} disabled={busy} aria-pressed={product.isFeatured} aria-label={`Feature ${product.name}`} onClick={() => void action(() => corporateService.patch(product.id, { isFeatured: !product.isFeatured }), "Featured status updated.")}><Star size={16} fill={product.isFeatured ? "currentColor" : "none"} />{product.isFeatured ? "Featured" : "Feature"}</button><button className={`${button} text-red-700`} disabled={busy} aria-label={`Delete ${product.name}`} onClick={() => setDeleting(product)}><Trash2 size={16} /></button></div>
   </div>
  </article>)}</div>}
  {deleting && <div role="alert" className="rounded-2xl bg-white p-6"><p>Delete <strong>{deleting.name}</strong>? It will be removed from the storefront. Existing enquiries are retained.</p><div className="mt-4 flex gap-3"><button className={`${button} text-red-700`} disabled={busy} onClick={() => void action(async () => { await corporateService.remove(deleting.id); if (draft?.id === deleting.id) setDraft(null); setDeleting(null); }, "Corporate product deleted.")}>Delete product</button><button className={button} disabled={busy} onClick={() => setDeleting(null)}>Cancel</button></div></div>}
  {draft && <div ref={editor} className="scroll-mt-36 rounded-2xl bg-white p-5 sm:p-8"><h3 className="font-heading text-2xl font-bold">{draft.id ? "Edit Corporate Product" : "Add Corporate Product"}</h3>
   <form className="mt-6" onSubmit={async event => {
    event.preventDefault(); setBusy(true); setFormError("");
    try { await corporateService.save(draft); setDraft(null); setRevision(value => value + 1); toast.success("Corporate product saved."); }
    catch (err) { const details = err instanceof ApiError ? err.details as { fieldErrors?: Record<string, string[]> } : undefined; setFormError(details?.fieldErrors ? Object.entries(details.fieldErrors).map(([key, messages]) => `${key}: ${messages.join(" ")}`).join(" · ") : err instanceof Error ? err.message : "Unable to save."); }
    finally { setBusy(false); }
   }}><fieldset disabled={busy} className="grid min-w-0 gap-5 md:grid-cols-2">
    <Field label="Product / Kit Name"><input required maxLength={200} className={input} value={draft.name} onChange={event => { const name = event.target.value; setDraft(current => current ? { ...current, name, ...(!current.id && (!current.slug || current.slug === current.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")) ? { slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") } : {}) } : current); }} /></Field>
    <Field label="Slug"><input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={200} className={input} value={draft.slug} onChange={event => update("slug", event.target.value)} /></Field>
    <Field label="Category"><input required list="corporate-categories" maxLength={120} className={input} value={draft.category} onChange={event => update("category", event.target.value)} /><datalist id="corporate-categories">{categories.map(value => <option key={value} value={value} />)}</datalist></Field>
    <Field label="Display order (lower numbers appear first)"><input type="number" min={0} max={1000000} required className={input} value={draft.displayOrder} onChange={event => update("displayOrder", Number(event.target.value))} /></Field>
    <div className="md:col-span-2"><Field label="Short Description"><textarea required minLength={5} maxLength={600} rows={2} className={input} value={draft.shortDescription} onChange={event => update("shortDescription", event.target.value)} /></Field></div>
    <div className="md:col-span-2"><Field label="Full Description"><textarea required minLength={5} maxLength={20000} rows={5} className={input} value={draft.description} onChange={event => update("description", event.target.value)} /></Field></div>
    <div className="space-y-3"><Field label="Main Product Image"><input type="file" accept=".jpg,.jpeg,.png,.webp" className={input} onChange={event => { void upload(Array.from(event.target.files ?? []), true); event.target.value = ""; }} /></Field>{draft.mainImage && <img src={draft.mainImage} alt="Main product preview" className="h-40 w-40 rounded-xl object-cover" />}<p className="text-sm text-brand-black/70">JPG, PNG or WebP. Up to 5 MB per image. Main image required.</p></div>
    <div className="space-y-3"><Field label="Additional Images"><input type="file" multiple accept=".jpg,.jpeg,.png,.webp" className={input} onChange={event => { void upload(Array.from(event.target.files ?? []), false); event.target.value = ""; }} /></Field><div className="flex flex-wrap gap-3">{draft.additionalImages.map((url, index) => <div key={`${url}-${index}`}><img src={url} alt={`Additional preview ${index + 1}`} className="h-24 w-24 rounded-xl object-cover" /><button type="button" className={button} onClick={() => update("additionalImages", draft.additionalImages.filter((_, i) => i !== index))}>Remove {index + 1}</button></div>)}</div></div>
    <div className="md:col-span-2"><h4 className="mb-3 font-semibold">Included Items</h4><div className="space-y-2">{draft.includedItems.map((value, index) => <div key={index} className="flex gap-2"><input required maxLength={200} aria-label={`Included item ${index + 1}`} className={input} value={value} onChange={event => update("includedItems", draft.includedItems.map((item, i) => i === index ? event.target.value : item))} /><button type="button" className={button} disabled={draft.includedItems.length === 1} aria-label={`Remove included item ${index + 1}`} onClick={() => update("includedItems", draft.includedItems.filter((_, i) => i !== index))}><Trash2 size={16} /></button></div>)}</div><button type="button" className={`${button} mt-3`} disabled={draft.includedItems.length >= 50} onClick={() => update("includedItems", [...draft.includedItems, ""])}><Plus size={16} />Add item</button></div>
    <Field label="Minimum Order Quantity"><input type="number" required min={1} max={1000000} className={input} value={draft.minimumOrderQuantity} onChange={event => update("minimumOrderQuantity", Number(event.target.value))} /></Field>
    <Field label="Pricing Type"><select className={input} value={draft.pricingType} onChange={event => update("pricingType", event.target.value as Draft["pricingType"])}><option value="starting_from">Starting From</option><option value="request_quote">Request Quote</option><option value="fixed_price">Fixed Price</option></select></Field>
    <Field label="Starting / Fixed Price (₹)"><input type="number" min={0} step="0.01" max={9999999999.99} required={draft.pricingType !== "request_quote"} className={input} value={draft.startingPrice ?? ""} onChange={event => update("startingPrice", event.target.value === "" ? null : Number(event.target.value))} /></Field>
    <div className="md:col-span-2"><Field label="Delivery Information"><textarea required maxLength={5000} rows={3} className={input} value={draft.deliveryInformation} onChange={event => update("deliveryInformation", event.target.value)} /></Field></div>
    {flags.map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" checked={draft[key]} onChange={event => update(key, event.target.checked)} />{label}</label>)}
   </fieldset>
   {formError && <p role="alert" className="mt-4 text-sm text-red-700">{formError}</p>}
   <div className="mt-6 flex flex-wrap gap-3"><button type="submit" disabled={busy} className={`${button} bg-brand-black text-white`}>{busy ? "Working…" : "Save Corporate Product"}</button><button type="button" disabled={busy} className={button} onClick={() => setDraft(null)}>Cancel</button></div>
   </form>
  </div>}
 </div>;
}
