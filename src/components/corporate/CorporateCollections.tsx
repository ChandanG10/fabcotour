import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { corporateService } from "../../services/corporate";
import { corporatePrice, type CorporateProduct } from "../../types/corporate";

export function CorporateCollections() {
 const [items, setItems] = useState<CorporateProduct[]>([]);
 const [loading, setLoading] = useState(true); const [error, setError] = useState(""); const [retry, setRetry] = useState(0);
 useEffect(() => {
  const controller = new AbortController(); setLoading(true); setError("");
  void corporateService.list(false, "", "", controller.signal).then(data => setItems(data.items)).catch(err => { if (!controller.signal.aborted) setError(err.message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
  return () => controller.abort();
 }, [retry]);
 return <section id="corporate-collections" className="mt-14 scroll-mt-28" aria-labelledby="collections-title">
  <h2 id="collections-title" className="font-heading text-3xl font-extrabold sm:text-4xl">Corporate Gift Collections</h2>
  <p className="mt-4 max-w-2xl text-base leading-7 text-brand-black/70">Explore kits for your people, partners and business moments. Choose a collection to make it your own.</p>
  {loading ? <p role="status" className="py-10">Loading collections…</p> : error ? <div role="alert" className="mt-6 rounded-2xl bg-white p-6"><p>We couldn’t load the collections. Please try again or use the enquiry form below.</p><button className="button-secondary mt-4" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : !items.length ? <p className="mt-6 rounded-2xl bg-white p-6">New collections are being prepared. <a className="underline" href="#quote-form">Tell us about your gifting needs.</a></p> : <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">{items.map(product => <article key={product.id} className="group flex min-w-0 flex-col overflow-hidden rounded-2xl bg-white shadow-card motion-safe:transition-[transform,box-shadow] motion-safe:duration-300 motion-safe:hover:-translate-y-1 hover:shadow-lg">
   <Link to={`/corporate-gifting/${product.slug}`} tabIndex={-1} aria-hidden="true" className="block overflow-hidden"><img src={product.mainImage} alt="" width={1000} height={1000} loading="lazy" className="aspect-square w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.035]" /></Link>
   <div className="flex flex-1 flex-col p-6"><p className="text-sm text-brand-black/70">{product.category}{product.isFeatured && <span className="ml-2 font-semibold">· Featured</span>}</p><h3 className="mt-2 font-heading text-xl font-extrabold">{product.name}</h3><p className="mt-3 flex-1 text-sm leading-7 text-brand-black/75">{product.shortDescription}</p><p className="mt-5 text-sm">Minimum order: <strong>{product.minimumOrderQuantity} {product.minimumOrderQuantity === 1 ? "kit" : "kits"}</strong></p><p className="mt-2 font-semibold">{corporatePrice(product)}</p><Link className="button-secondary mt-5 justify-between" to={`/corporate-gifting/${product.slug}`} aria-label={`View details: ${product.name}`}>View Details<ArrowUpRight size={18} /></Link></div>
  </article>)}</div>}
 </section>;
}
