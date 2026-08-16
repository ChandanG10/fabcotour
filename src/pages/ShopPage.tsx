import { SlidersHorizontal, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, EmptyState, LoadingState, ProductCard, SearchInput, SectionIntro } from "../components/common/Ui";
import { useAsyncData } from "../hooks/useAsyncData";
import { storefrontService } from "../services/api";
import { cn } from "../utils/format";

const sortOptions = [
  "Popularity",
  "Newest",
  "Price low-to-high",
  "Price high-to-low",
  "Rating"
] as const;

export default function ShopPage() {
  const { slug } = useParams();
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]>("Popularity");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(12);
  const [filters, setFilters] = useState({
    gender: "",
    size: "",
    colour: "",
    fabric: "",
    fit: "",
    printMethod: "",
    customisable: false,
    price: 5000
  });

  const { data, loading, error } = useAsyncData(async () => {
    const [categories, products] = await Promise.all([
      storefrontService.getCategories(),
      storefrontService.getNormalizedProducts()
    ]);
    return { categories, products };
  }, []);

  const activeCategory = data?.categories.find((category) => category.slug === slug);

  const filteredProducts = useMemo(() => {
    const products = data?.products ?? [];

    return products
      .filter((product) => {
        const isAudienceRoute = slug === "men" || slug === "women" || slug === "kids";
        const matchesRoute = slug
          ? isAudienceRoute
            ? product.audience.includes(slug)
            : product.categoryId === activeCategory?.id || product.subcategory.toLowerCase().includes(slug.replace(/-/g, " "))
          : true;
        const matchesSearch =
          search.length === 0 ||
          product.name.toLowerCase().includes(search.toLowerCase()) ||
          product.subcategory.toLowerCase().includes(search.toLowerCase());
        const matchesGender = filters.gender ? product.audience.includes(filters.gender as never) : true;
        const matchesSize = filters.size ? product.sizeOptions.includes(filters.size) : true;
        const matchesColour = filters.colour ? product.colorOptions.includes(filters.colour) : true;
        const matchesFabric = filters.fabric ? product.fabric === filters.fabric : true;
        const matchesFit = filters.fit ? product.fit === filters.fit : true;
        const matchesPrint = filters.printMethod ? product.printMethods.includes(filters.printMethod) : true;
        const matchesCustomisable = filters.customisable ? product.customisable : true;
        const matchesPrice = product.price <= filters.price;

        return (
          matchesRoute &&
          matchesSearch &&
          matchesGender &&
          matchesSize &&
          matchesColour &&
          matchesFabric &&
          matchesFit &&
          matchesPrint &&
          matchesCustomisable &&
          matchesPrice
        );
      })
      .sort((left, right) => {
        switch (sortBy) {
          case "Newest":
            return right.id.localeCompare(left.id);
          case "Price low-to-high":
            return left.price - right.price;
          case "Price high-to-low":
            return right.price - left.price;
          case "Rating":
            return right.rating - left.rating;
          default:
            return right.reviewCount - left.reviewCount;
        }
      });
  }, [activeCategory?.id, data?.products, filters, search, slug, sortBy]);

  if (loading) {
    return (
      <div className="container-shell py-20">
        <LoadingState label="Loading catalogue" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-shell py-20">
        <EmptyState title="Catalogue unavailable" description={error ?? "The product API did not return any data."} />
      </div>
    );
  }

  const activeChips = Object.entries(filters)
    .filter(([key, value]) => key !== "price" && value !== "" && value !== false)
    .map(([key, value]) => `${key}: ${String(value)}`);

  return (
    <>
      <Seo
        title={activeCategory ? `${activeCategory.name} Collection` : "Shop All Products"}
        description="Browse customisable apparel, caps, hoodies, gifts and premium merchandise with flexible filters and quick customisation access."
        path={slug ? `/shop/${slug}` : "/shop"}
      />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Shop", to: "/shop" }, ...(activeCategory ? [{ label: activeCategory.name }] : [])]} />
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <FilterPanel products={data.products} filters={filters} onChange={setFilters} onClear={() => setFilters(resetFilters())} />
          </aside>
          <section className="space-y-6">
            <SectionIntro
              eyebrow="Product listing"
              title={activeCategory ? activeCategory.name : "All products"}
              description={
                activeCategory?.description ??
                "Browse premium tees, caps, hoodies, gifts and curated merchandising pieces ready for customisation."
              }
            />
            <div className="flex flex-col gap-4 rounded-[28px] border border-black/5 bg-white p-4 shadow-card xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder="Search within this category" />
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 px-4 py-3 text-sm font-semibold lg:hidden"
                >
                  <SlidersHorizontal className="h-4 w-4" />
                  Filters
                </button>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as (typeof sortOptions)[number])}
                  className="rounded-full border border-black/10 bg-brand-offwhite px-4 py-3 text-sm font-semibold outline-none"
                >
                  {sortOptions.map((option) => (
                    <option key={option} value={option}>
                      Sort: {option}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-brand-black/60">{filteredProducts.length} products</p>
            </div>

            {activeChips.length ? (
              <div className="flex flex-wrap items-center gap-3">
                {activeChips.map((chip) => (
                  <span key={chip} className="rounded-full bg-brand-grey px-4 py-2 text-sm">
                    {chip}
                  </span>
                ))}
                <button type="button" onClick={() => setFilters(resetFilters())} className="text-sm font-semibold">
                  Clear all
                </button>
              </div>
            ) : null}

            {filteredProducts.length === 0 ? (
              <EmptyState
                title="No products matched these filters"
                description="Try widening the price band or removing a few filters."
                action={
                  <button type="button" className="button-primary" onClick={() => setFilters(resetFilters())}>
                    Reset filters
                  </button>
                }
              />
            ) : (
              <>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.slice(0, visibleCount).map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
                {visibleCount < filteredProducts.length ? (
                  <div className="flex justify-center">
                    <button type="button" className="button-secondary" onClick={() => setVisibleCount((value) => value + 8)}>
                      Load more
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>
        </div>

        {mobileFiltersOpen ? (
          <>
            <button type="button" onClick={() => setMobileFiltersOpen(false)} className="fixed inset-0 z-50 bg-black/30 lg:hidden" />
            <div className="fixed inset-x-0 bottom-0 z-[51] max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white p-5 lg:hidden">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-heading text-2xl font-bold">Filters</h2>
                <button type="button" onClick={() => setMobileFiltersOpen(false)} className="rounded-full border border-black/10 p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FilterPanel products={data.products} filters={filters} onChange={setFilters} onClear={() => setFilters(resetFilters())} compact />
            </div>
          </>
        ) : null}

        <section className="mt-16 rounded-[32px] bg-brand-black p-8 text-white">
          <SectionIntro
            eyebrow="Bulk orders"
            title="Need coordinated merchandise for a team or event?"
            description="Explore pricing brackets, design support and timelines for larger runs."
            action={
              <Link to="/bulk-orders" className="button-primary bg-brand-yellow text-brand-black hover:bg-brand-yellow/90">
                Open bulk-order page
              </Link>
            }
          />
        </section>
      </div>
    </>
  );
}

function resetFilters() {
  return {
    gender: "",
    size: "",
    colour: "",
    fabric: "",
    fit: "",
    printMethod: "",
    customisable: false,
    price: 5000
  };
}

function FilterPanel({
  products,
  filters,
  onChange,
  onClear,
  compact
}: {
  products: Awaited<ReturnType<typeof storefrontService.getNormalizedProducts>>;
  filters: ReturnType<typeof resetFilters>;
  onChange: (value: ReturnType<typeof resetFilters>) => void;
  onClear: () => void;
  compact?: boolean;
}) {
  const setField = (key: keyof ReturnType<typeof resetFilters>, value: string | boolean | number) =>
    onChange({ ...filters, [key]: value } as ReturnType<typeof resetFilters>);

  const fabrics = Array.from(new Set(products.map((product) => product.fabric))).filter(Boolean) as string[];
  const fits = Array.from(new Set(products.map((product) => product.fit))).filter(Boolean) as string[];
  const colours = Array.from(new Set(products.flatMap((product) => product.colorOptions))).slice(0, 8);
  const methods = Array.from(new Set(products.flatMap((product) => product.printMethods))).slice(0, 8);

  return (
    <div className={cn("rounded-[28px] border border-black/5 bg-white p-5 shadow-card", compact && "shadow-none")}>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-heading text-2xl font-bold">Refine results</h2>
        <button type="button" onClick={onClear} className="text-sm font-semibold">
          Clear all
        </button>
      </div>
      <div className="space-y-5">
        <FilterSelect label="Gender" value={filters.gender} onChange={(value) => setField("gender", value)} options={["men", "women", "kids", "unisex"]} />
        <FilterSelect label="Size" value={filters.size} onChange={(value) => setField("size", value)} options={["XS", "S", "M", "L", "XL", "XXL", "One Size"]} />
        <FilterSelect label="Colour" value={filters.colour} onChange={(value) => setField("colour", value)} options={colours} />
        <FilterSelect label="Fabric" value={filters.fabric} onChange={(value) => setField("fabric", value)} options={fabrics} />
        <FilterSelect label="Fit" value={filters.fit} onChange={(value) => setField("fit", value)} options={fits} />
        <FilterSelect label="Print method" value={filters.printMethod} onChange={(value) => setField("printMethod", value)} options={methods} />
        <div>
          <div className="mb-2 flex items-center justify-between text-sm font-semibold">
            <span>Price</span>
            <span>Up to Rs. {filters.price}</span>
          </div>
          <input
            type="range"
            min={500}
            max={5000}
            step={100}
            value={filters.price}
            onChange={(event) => setField("price", Number(event.target.value))}
            className="w-full"
          />
        </div>
        <label className="flex items-center gap-3 rounded-2xl bg-brand-grey px-4 py-3 text-sm font-medium">
          <input
            type="checkbox"
            checked={filters.customisable}
            onChange={(event) => setField("customisable", event.target.checked)}
          />
          Customisable only
        </label>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-2xl border border-black/10 bg-brand-offwhite px-4 py-3 text-sm outline-none"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}
