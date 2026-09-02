import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../components/common/Seo";
import { EmptyState, ProductCard } from "../components/common/Ui";
import { useAsyncData } from "../hooks/useAsyncData";
import { storefrontService } from "../services/api";

const pageSize = 12;

function ProductSkeleton() {
  return <div className="animate-pulse" aria-hidden="true"><div className="aspect-square rounded-[16px] bg-black/6" /><div className="mt-4 h-4 w-4/5 rounded bg-black/6" /><div className="mt-3 h-4 w-2/5 rounded bg-black/6" /></div>;
}

export default function LifestylePage() {
  const { subcategorySlug } = useParams();
  const [search, setSearch] = useState("");
  const [subcategoryId, setSubcategoryId] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sort, setSort] = useState("featured");
  const [visibleCount, setVisibleCount] = useState(pageSize);

  const { data, loading, error } = useAsyncData(async () => {
    const [categories, products] = await Promise.all([
      storefrontService.getCategories(),
      storefrontService.getNormalizedProducts({ category: "lifestyle" })
    ]);
    const parent = categories.find((category) => !category.parentId && category.slug === "lifestyle") ?? null;
    const subcategories = parent
      ? categories.filter((category) => category.parentId === parent.id).sort((a, b) => a.displayOrder - b.displayOrder)
      : [];
    return { parent, subcategories, products: products.filter((product) => product.images.some(Boolean)) };
  }, []);

  const routeSubcategory = data?.subcategories.find((category) => category.slug === subcategorySlug) ?? null;
  const selectedSubcategory = routeSubcategory?.id ?? subcategoryId;
  const products = useMemo(() => {
    const query = search.trim().toLowerCase();
    const ceiling = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
    return [...(data?.products ?? [])]
      .filter((product) => !selectedSubcategory || product.subcategoryId === selectedSubcategory)
      .filter((product) => !query || `${product.name} ${product.description} ${product.subcategory}`.toLowerCase().includes(query))
      .filter((product) => product.price <= ceiling)
      .sort((a, b) => {
        if (sort === "price-low") return a.price - b.price;
        if (sort === "price-high") return b.price - a.price;
        if (sort === "newest") return Number(b.badge === "New") - Number(a.badge === "New");
        if (sort === "bestselling") return Number(b.badge === "Bestseller") - Number(a.badge === "Bestseller");
        return 0;
      });
  }, [data?.products, maxPrice, search, selectedSubcategory, sort]);

  const featured = (data?.products ?? []).filter((product) => product.featured).slice(0, 4);
  const featuredIds = new Set(featured.map((product) => product.id));
  const newArrivals = (data?.products ?? []).filter((product) => product.newArrival && !featuredIds.has(product.id)).slice(0, 4);
  const promotedIds = new Set([...featuredIds, ...newArrivals.map((product) => product.id)]);
  const bestsellers = (data?.products ?? []).filter((product) => product.bestseller && !promotedIds.has(product.id)).slice(0, 4);
  const title = routeSubcategory ? `${routeSubcategory.name} | Lifestyle` : "Lifestyle";

  if (!loading && !error && subcategorySlug && !routeSubcategory) {
    return <main className="container-shell py-20"><Seo title="Lifestyle collection not found" description="This Lifestyle collection is unavailable." path={`/lifestyle/${subcategorySlug}`} /><EmptyState title="Lifestyle collection not found" description="This collection may be inactive, renamed or unavailable." action={<Link to="/lifestyle" className="button-primary">Browse Lifestyle</Link>} /></main>;
  }

  return (
    <>
      <Seo title={routeSubcategory?.seoTitle || data?.parent?.seoTitle || title} description={routeSubcategory?.seoDescription || data?.parent?.seoDescription || "Personalise the products you use every day."} path={routeSubcategory ? `/lifestyle/${routeSubcategory.slug}` : "/lifestyle"} />
      <main className="pb-28">
        <section className="relative isolate min-h-[430px] overflow-hidden bg-brand-navy text-white sm:min-h-[520px]">
          {routeSubcategory?.bannerUrl || data?.parent?.bannerUrl ? <img src={routeSubcategory?.bannerUrl || data?.parent?.bannerUrl || undefined} alt={`${routeSubcategory?.name ?? "FabPodd Lifestyle"} collection`} className="absolute inset-0 -z-20 h-full w-full object-cover" /> : null}
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(7,22,61,0.96),rgba(7,22,61,0.68)_58%,rgba(7,22,61,0.2))]" />
          <div className="container-shell flex min-h-[430px] items-end py-14 sm:min-h-[520px] sm:py-20">
            <div className="max-w-3xl">
              <h1 className="font-heading text-[clamp(3.4rem,9vw,6rem)] font-extrabold leading-[0.92] tracking-[-0.035em]">{routeSubcategory?.name ?? "Lifestyle"}</h1>
              <p className="mt-6 max-w-[58ch] text-lg leading-8 text-white/82 sm:text-xl">{routeSubcategory?.description ?? "Personalise the products you use every day."}</p>
              <a href="#lifestyle-products" className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-brand-cyan px-6 text-sm font-extrabold text-brand-navy transition hover:bg-white">Explore products <ArrowRight className="h-4 w-4" /></a>
            </div>
          </div>
        </section>

        <div className="container-shell">
          {!routeSubcategory && data?.subcategories.length ? (
            <section className="py-16 sm:py-24" aria-labelledby="lifestyle-categories">
              <h2 id="lifestyle-categories" className="section-title">Made for every part of your day</h2>
              <p className="mt-3 max-w-2xl text-base leading-7 text-brand-muted">Choose a collection, then make each piece personal.</p>
              <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.subcategories.map((category) => (
                  <Link key={category.id} to={`/lifestyle/${category.slug}`} className="group relative min-h-[260px] overflow-hidden rounded-[16px] bg-brand-black p-6 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-cyan">
                    {category.imageUrl ? <img src={category.imageUrl} alt={category.name} loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-70 transition duration-500 group-hover:scale-105" /> : null}
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_15%,rgba(7,22,61,0.92))]" />
                    <div className="relative flex h-full min-h-[212px] flex-col justify-end"><h3 className="font-heading text-2xl font-bold">{category.name}</h3><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-brand-cyan">Explore <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></div>
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          {loading ? <div className="grid grid-cols-2 gap-4 py-20 md:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <ProductSkeleton key={index} />)}</div> : null}
          {error ? <div className="py-20"><EmptyState title="Lifestyle could not be loaded" description={error} /></div> : null}

          {!loading && !error ? (
            <>
              {!routeSubcategory && featured.length ? <ProductStrip title="Featured Lifestyle products" products={featured} /> : null}
              {!routeSubcategory && newArrivals.length ? <ProductStrip title="New arrivals" products={newArrivals} /> : null}
              {!routeSubcategory && bestsellers.length ? <ProductStrip title="Best sellers" products={bestsellers} /> : null}

              <section id="lifestyle-products" className="scroll-mt-32 py-16 sm:py-24" aria-labelledby="lifestyle-products-title">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 id="lifestyle-products-title" className="section-title">{routeSubcategory?.name ?? "Shop Lifestyle"}</h2><p className="mt-2 text-sm text-brand-muted">{products.length} product{products.length === 1 ? "" : "s"}</p></div><SlidersHorizontal className="hidden h-5 w-5 text-brand-muted sm:block" /></div>
                <div className="mt-8 grid gap-3 rounded-[16px] bg-white p-4 shadow-sm md:grid-cols-[minmax(220px,1.5fr)_1fr_1fr_1fr]">
                  <label className="relative"><span className="sr-only">Search Lifestyle products</span><Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-muted" /><input value={search} onChange={(event) => { setSearch(event.target.value); setVisibleCount(pageSize); }} placeholder="Search Lifestyle" className="min-h-12 w-full rounded-xl border border-black/10 bg-white pl-11 pr-4 text-sm outline-none focus:border-brand-cyan" /></label>
                  {!routeSubcategory ? <select aria-label="Filter by subcategory" value={subcategoryId} onChange={(event) => { setSubcategoryId(event.target.value); setVisibleCount(pageSize); }} className="min-h-12 rounded-xl border border-black/10 bg-white px-3 text-sm"><option value="">All subcategories</option>{data?.subcategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select> : <Link to="/lifestyle" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-black/10 px-3 text-sm font-semibold">All Lifestyle</Link>}
                  <select aria-label="Maximum price" value={maxPrice} onChange={(event) => { setMaxPrice(event.target.value); setVisibleCount(pageSize); }} className="min-h-12 rounded-xl border border-black/10 bg-white px-3 text-sm"><option value="">Any price</option><option value="500">Up to ₹500</option><option value="1000">Up to ₹1,000</option><option value="2000">Up to ₹2,000</option></select>
                  <select aria-label="Sort products" value={sort} onChange={(event) => setSort(event.target.value)} className="min-h-12 rounded-xl border border-black/10 bg-white px-3 text-sm"><option value="featured">Featured</option><option value="newest">New arrivals</option><option value="bestselling">Best selling</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select>
                </div>

                {products.length ? <div className="mt-9 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 lg:gap-6">{products.slice(0, visibleCount).map((product) => <ProductCard key={product.id} product={product} />)}</div> : <div className="mt-9"><EmptyState title="No Lifestyle products found" description="Try changing your search or filters. Administrators can publish products from the existing Products panel." /></div>}
                {visibleCount < products.length ? <div className="mt-10 text-center"><button type="button" onClick={() => setVisibleCount((count) => count + pageSize)} className="button-secondary">Load more</button></div> : null}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}

function ProductStrip({ title, products }: { title: string; products: Awaited<ReturnType<typeof storefrontService.getNormalizedProducts>> }) {
  return <section className="border-t border-black/8 py-16"><h2 className="section-title">{title}</h2><div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4 lg:gap-6">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div></section>;
}
