import { ArrowDown, ArrowRight, Layers3, Palette, RefreshCw, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "../components/common/Seo";
import { EmptyState } from "../components/common/Ui";
import { useAsyncData } from "../hooks/useAsyncData";
import { customisationService } from "../services/api";
import type { CustomProductSummary } from "../types/models";
import { currencyFormatter } from "../utils/format";

const categoryOrder = ["Apparel", "Jackets & Pullovers", "Accessories", "Drinkware", "Stationery & Other Products"];

function ProductSkeleton() {
  return <div className="animate-pulse" aria-hidden="true"><div className="aspect-[4/4.55] rounded-2xl bg-slate-100" /><div className="mt-4 h-4 w-4/5 rounded bg-slate-100" /><div className="mt-2 h-3 w-1/2 rounded bg-slate-100" /><div className="mt-4 h-11 rounded-full bg-slate-100" /></div>;
}

function ProductCard({ product }: { product: CustomProductSummary }) {
  return (
    <Link to={`/customise/${product.slug}/design?colour=white`} className="custom-product-card group block min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-cyan" aria-label={`Customise ${product.name}`}>
      <div className="relative aspect-[4/4.55] overflow-hidden rounded-2xl border border-slate-200 bg-[#f7f8fa]">
        <img src={product.thumbnailUrl || "/customisation/mockups/white-front.svg"} alt={`Blank ${product.name} customisation placeholder`} loading="lazy" className="h-full w-full object-contain p-3 transition duration-500 ease-luxe group-hover:scale-[1.035]" onError={(event) => { event.currentTarget.src = "/customisation/mockups/white-front.svg"; }} />
        {product.isPlaceholder ? <span className="absolute left-3 top-3 rounded-full bg-white/94 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-brand-black shadow-soft">Sample mockup</span> : null}
      </div>
      <div className="pt-4">
        <h3 className="min-h-[2.75rem] text-sm font-extrabold leading-[1.35] text-brand-black sm:text-base">{product.name}</h3>
        <p className="mt-1 min-h-5 text-xs leading-5 text-brand-black/58">{product.specification || "Blank product ready to customise"}</p>
        <div className="mt-3 flex items-center justify-between gap-2 text-xs"><span className="font-extrabold tabular-nums">From {currencyFormatter.format(product.basePrice)}</span><span className="inline-flex items-center gap-1 text-brand-black/58"><Palette className="h-3.5 w-3.5" /> {product.colourCount} colours</span></div>
        <span className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-brand-cyan px-4 text-xs font-extrabold uppercase tracking-[0.08em] text-brand-navy transition group-hover:bg-brand-navy group-hover:text-white">Customise <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" /></span>
      </div>
    </Link>
  );
}

export default function CustomizerPage() {
  const { data: products, loading, error } = useAsyncData(() => customisationService.getProducts(), []);
  const grouped = (products ?? []).reduce<Record<string, Record<string, CustomProductSummary[]>>>((result, product) => {
    const category = product.categoryName;
    const subcategory = product.subcategoryName || "";
    result[category] ??= {};
    result[category][subcategory] ??= [];
    result[category][subcategory].push(product);
    return result;
  }, {});
  const visibleCategories = Object.keys(grouped).sort((left, right) => {
    const leftIndex = categoryOrder.indexOf(left); const rightIndex = categoryOrder.indexOf(right);
    return (leftIndex < 0 ? Number.MAX_SAFE_INTEGER : leftIndex) - (rightIndex < 0 ? Number.MAX_SAFE_INTEGER : rightIndex) || left.localeCompare(right);
  });
  const heroProduct = products?.[0];
  const categoryAnchor = (category: string) => `custom-category-${category.replace(/\W+/g, "-").toLowerCase()}`;

  return (
    <>
      <Seo title="Blank Is Just the Beginning" description="Choose your blank canvas and create something unmistakably yours in FabPodd's four-sided design studio." path="/customise" />
      <main className="bg-white pb-28 pt-5 sm:pt-8"><div className="container-shell">
        <section className="customise-hero" aria-labelledby="customise-hero-title">
          <div className="customise-hero-copy">
            <h1 id="customise-hero-title" className="font-heading text-[clamp(2.65rem,6.2vw,5.8rem)] font-extrabold uppercase leading-[0.88] tracking-[-0.035em] text-white">Blank is just<br />the <span className="text-brand-cyan">beginning.</span></h1>
            <p className="mt-6 max-w-[58ch] text-sm leading-7 text-white/76 sm:text-base">Choose your canvas, colour every side, and turn an everyday product into something unmistakably yours.</p>
            <div className="mt-7 flex flex-wrap items-center gap-3">
              <a href="#custom-catalogue" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-brand-cyan px-6 text-sm font-extrabold text-brand-navy transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-cyan">Choose your canvas <ArrowDown className="h-4 w-4" /></a>
              <span className="inline-flex min-h-12 items-center gap-2 px-2 text-xs font-bold uppercase tracking-[0.12em] text-white/62"><Layers3 className="h-4 w-4 text-brand-cyan" /> Design all four sides</span>
            </div>
          </div>
          <div className="customise-hero-stage" aria-label="Blank product becoming a custom design">
            <div className="customise-hero-orbit" aria-hidden="true" />
            <div className="customise-hero-product">
              <img src={heroProduct?.thumbnailUrl || "/customisation/mockups/white-front.svg"} alt={heroProduct ? `Blank ${heroProduct.name}` : "Blank product ready to customise"} />
              <div className="customise-print-cue" aria-hidden="true"><Sparkles className="h-4 w-4" /><span>Your design</span></div>
            </div>
            <div className="customise-side-dock" aria-hidden="true">
              {(["Front", "Back", "Right", "Left"] as const).map((side, index) => <span key={side} className={index === 0 ? "active" : ""}>{side}</span>)}
            </div>
          </div>
          <div className="customise-hero-facts" aria-label="Customisation features">
            <span><strong>{products?.length || "—"}</strong><small>Blank products</small></span>
            <span><strong>4</strong><small>Editable sides</small></span>
            <span><strong>Live</strong><small>Studio pricing</small></span>
          </div>
        </section>
        {visibleCategories.length ? <nav id="custom-catalogue" aria-label="Custom product categories" className="customise-category-nav"><span>Browse categories</span>{visibleCategories.map((category) => <a key={category} href={`#${categoryAnchor(category)}`}>{category}</a>)}</nav> : <div id="custom-catalogue" />}
        {loading ? <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">{Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />)}</div> : error ? <div className="mt-14"><EmptyState title="Custom products could not be loaded" description={error} action={<button type="button" className="button-primary" onClick={() => window.location.reload()}><RefreshCw className="mr-2 h-4 w-4" /> Try again</button>} /></div> : !products?.length ? <div className="mt-14"><EmptyState title="No custom products yet" description="Ask an administrator to activate products in the separate Customisation catalogue." /></div> : (
          <div className="mt-16 space-y-24">{visibleCategories.map((category) => (
            <section key={category} aria-labelledby={categoryAnchor(category)}>
              <div className="flex items-end gap-5 border-b border-brand-navy/18 pb-4"><h2 id={categoryAnchor(category)} className="scroll-mt-36 font-heading text-2xl font-extrabold uppercase tracking-[-0.02em] sm:text-3xl">{category}</h2><span className="mb-1 hidden text-xs font-semibold uppercase tracking-[0.14em] text-brand-black/42 sm:inline">Blank products only</span></div>
              <div className="mt-9 space-y-14">{Object.entries(grouped[category]).map(([subcategory, entries]) => <div key={subcategory || category}>{subcategory ? <h3 className="mb-6 text-sm font-extrabold uppercase tracking-[0.16em] text-brand-navy/68 sm:text-base">{subcategory}</h3> : null}<div className="grid grid-cols-2 gap-x-4 gap-y-11 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6 lg:gap-y-14">{entries.map((product) => <ProductCard key={product.id} product={product} />)}</div></div>)}</div>
            </section>
          ))}</div>
        )}
      </div></main>
    </>
  );
}
