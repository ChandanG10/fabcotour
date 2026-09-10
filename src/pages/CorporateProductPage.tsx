import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, InputField, TextAreaField } from "../components/common/Ui";
import { corporateService } from "../services/corporate";
import { corporatePrice, type CorporateProduct } from "../types/corporate";
import { ApiError } from "../lib/http";

const quoteSchema = z.object({ name: z.string().trim().min(2, "Enter your name.").max(160), companyName: z.string().trim().min(2, "Enter your company name.").max(255), email: z.string().email("Enter a valid email address.").max(255), phone: z.string().min(10, "Enter a valid phone number.").max(32).regex(/^[+()\d\s-]+$/, "Enter a valid phone number."), quantity: z.coerce.number().int().min(1).max(1000000), message: z.string().trim().min(10, "Please include at least 10 characters.").max(10000) });
function QuoteForm({ product }: { product: CorporateProduct }) {
 const form = useForm<z.infer<typeof quoteSchema>>({ resolver: zodResolver(quoteSchema), defaultValues: { quantity: product.minimumOrderQuantity } });
 const [artwork, setArtwork] = useState<File | null>(null); const [fileError, setFileError] = useState(""); const [success, setSuccess] = useState("");
 return <section id="product-enquiry" className="mt-14 scroll-mt-28 rounded-2xl bg-white p-5 shadow-card sm:p-8" aria-labelledby="enquiry-heading">
  <h2 id="enquiry-heading" className="font-heading text-2xl font-extrabold sm:text-3xl">Request Custom Quote</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-brand-black/70">Share your quantity, branding and delivery requirements. Our team will contact you to discuss your kit.</p>
  {success ? <div role="status" className="mt-6"><p>{success}</p><p className="mt-2 text-sm">Product: {product.name}</p><Link className="button-secondary mt-5" to="/corporate-gifting">Explore collections</Link></div> : <form className="mt-6" onSubmit={form.handleSubmit(async data => {
   form.clearErrors("root");
   if (fileError) return;
   if (data.quantity < product.minimumOrderQuantity) { form.setError("quantity", { message: `Minimum order is ${product.minimumOrderQuantity} kits.` }); return; }
   const payload = new FormData(); Object.entries(data).forEach(([key, value]) => payload.append(key, String(value))); if (artwork) payload.append("artwork", artwork);
   try { const result = await corporateService.enquire(product.slug, payload); setSuccess(result.message); }
   catch (error) { form.setError("root", { message: error instanceof Error ? error.message : "Unable to send your enquiry. Please try again." }); }
  })}><fieldset disabled={form.formState.isSubmitting} className="grid min-w-0 gap-5 md:grid-cols-2">
   <InputField label="Name" register={form.register("name")} error={form.formState.errors.name} />
   <InputField label="Company Name" register={form.register("companyName")} error={form.formState.errors.companyName} />
   <InputField label="Email" type="email" register={form.register("email")} error={form.formState.errors.email} />
   <InputField label="Phone" type="tel" register={form.register("phone")} error={form.formState.errors.phone} />
   <label className="grid gap-2 text-sm font-semibold">Product / Kit<input readOnly value={product.name} className="min-w-0 rounded-2xl bg-brand-grey px-4 py-3 text-sm" /></label>
   <InputField label={`Required Quantity (minimum ${product.minimumOrderQuantity})`} type="number" register={form.register("quantity")} error={form.formState.errors.quantity} />
   <label className="grid min-w-0 gap-2 text-sm font-semibold md:col-span-2">Logo / Artwork Upload (optional)<input type="file" accept=".jpg,.jpeg,.png,.webp" aria-describedby="artwork-help" className="min-h-11 w-full min-w-0 rounded-2xl border border-black/15 p-3 text-sm" onChange={event => { const file = event.target.files?.[0]; setArtwork(null); setFileError(""); if (!file) return; if (file.size > 5 * 1024 * 1024 || !/\.(jpe?g|png|webp)$/i.test(file.name)) { setFileError("Choose a JPG, PNG or WebP image up to 5 MB."); event.target.value = ""; return; } setArtwork(file); }} /><span id="artwork-help" className="font-normal text-brand-black/70">JPG, PNG or WebP, up to 5 MB.</span></label>
   {fileError && <p role="alert" className="text-sm text-red-700 md:col-span-2">{fileError}</p>}
   <div className="md:col-span-2"><TextAreaField label="Requirements / Message" register={form.register("message")} error={form.formState.errors.message} rows={5} /></div>
   <p className="text-sm text-brand-black/70 md:col-span-2">By submitting, you agree to be contacted about this enquiry. See our <Link className="underline" to="/privacy-policy">privacy policy</Link>.</p>
   {form.formState.errors.root && <p role="alert" className="text-sm text-red-700 md:col-span-2">{form.formState.errors.root.message}</p>}
   <button className="button-primary disabled:opacity-60 md:col-span-2" type="submit">{form.formState.isSubmitting ? "Sending enquiry…" : "Send Enquiry"}</button>
  </fieldset></form>}
 </section>;
}
export default function CorporateProductPage() {
 const { slug = "" } = useParams(); const [product, setProduct] = useState<CorporateProduct | null>(null);
 const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [retry, setRetry] = useState(0); const [selectedImage, setSelectedImage] = useState("");
 useEffect(() => { const controller = new AbortController(); setLoading(true); setError(""); setProduct(null); void corporateService.get(slug, controller.signal).then(data => { setProduct(data.item); setSelectedImage(data.item.mainImage); }).catch(err => { if (!controller.signal.aborted) setError(err instanceof ApiError && err.status === 404 ? "This collection is no longer available." : "We couldn’t load this collection. Please try again."); }).finally(() => { if (!controller.signal.aborted) setLoading(false); }); return () => controller.abort(); }, [slug, retry]);
 if (loading) return <div className="container-shell py-20" role="status">Loading collection…</div>;
 if (!product) return <div className="container-shell py-20"><h1 className="font-heading text-3xl font-bold">Collection unavailable</h1><p role="alert" className="mt-4">{error}</p><div className="mt-5 flex flex-wrap gap-3"><button className="button-secondary" onClick={() => setRetry(value => value + 1)}>Try again</button><Link className="button-primary" to="/corporate-gifting">Back to collections</Link></div></div>;
 return <><Seo title={product.name} description={product.shortDescription} path={`/corporate-gifting/${product.slug}`} /><div className="container-shell py-8 pb-24">
  <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Corporate Gifting", to: "/corporate-gifting" }, { label: product.name }]} />
  <div className="grid gap-8 lg:grid-cols-2 lg:gap-12"><div className="min-w-0"><img src={selectedImage} alt={product.name} width={1000} height={1000} className="aspect-square w-full rounded-2xl object-cover" />{product.additionalImages.length > 0 && <div className="mt-4 flex flex-wrap gap-3" aria-label="Product image gallery">{[product.mainImage, ...product.additionalImages].map((url, index) => <button key={`${url}-${index}`} className={`overflow-hidden rounded-xl border-2 ${selectedImage === url ? "border-brand-black" : "border-transparent"}`} aria-label={`View image ${index + 1}`} aria-pressed={selectedImage === url} onClick={() => setSelectedImage(url)}><img src={url} alt={`${product.name}, view ${index + 1}`} className="h-20 w-20 object-cover" /></button>)}</div>}</div>
   <div className="min-w-0"><p className="text-sm text-brand-black/70">{product.category}</p><h1 className="mt-3 break-words font-heading text-4xl font-extrabold sm:text-5xl">{product.name}</h1><p className="mt-5 max-w-prose text-base leading-8 text-brand-black/75">{product.shortDescription}</p><p className="mt-6 text-2xl font-bold">{corporatePrice(product)}</p><p className="mt-3 text-sm">Minimum Order Quantity: <strong>{product.minimumOrderQuantity} {product.minimumOrderQuantity === 1 ? "kit" : "kits"}</strong></p>
    <div className="mt-7 flex flex-wrap gap-3"><a className="button-primary" href="#product-enquiry">Request Custom Quote</a><a className="button-secondary" href="#product-enquiry">Enquire Now</a></div>
    <h2 className="mt-9 font-heading text-xl font-bold">What’s Included</h2><ul className="mt-4 grid list-inside list-disc gap-3 text-sm sm:grid-cols-2">{product.includedItems.map((item, index) => <li key={index}>{item}</li>)}</ul>
   </div>
  </div>
  <section className="mt-12"><h2 className="font-heading text-2xl font-bold">About this collection</h2><p className="mt-4 max-w-prose whitespace-pre-line text-base leading-8 text-brand-black/75">{product.description}</p>
   <dl className="mt-8 grid gap-x-10 gap-y-6 border-t border-black/10 pt-6 md:grid-cols-2"><div><dt className="font-semibold">Available Customisation</dt><dd className="mt-2 text-sm leading-7 text-brand-black/75">{product.customisationAvailable ? "Customisation available." : "Please enquire about customisation."} {product.employeeNamePersonalisation && "Employee name personalisation available."}</dd></div><div><dt className="font-semibold">Branding Options</dt><dd className="mt-2 text-sm leading-7 text-brand-black/75">{product.logoPrintingAvailable ? "Logo printing available. Share your artwork with your enquiry." : "Contact us to discuss branding options."}</dd></div><div><dt className="font-semibold">Packaging Options</dt><dd className="mt-2 text-sm leading-7 text-brand-black/75">{product.customPackagingAvailable ? "Custom packaging available." : "Standard kit packaging."} {product.bulkQuantityAvailable && "Bulk quantities available."}</dd></div><div><dt className="font-semibold">Delivery Information</dt><dd className="mt-2 whitespace-pre-line text-sm leading-7 text-brand-black/75">{product.deliveryInformation}</dd></div></dl>
  </section><QuoteForm key={product.id} product={product} />
 </div></>;
}
