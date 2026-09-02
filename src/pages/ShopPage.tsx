import { ArrowRight, SlidersHorizontal, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, EmptyState, LoadingState, ProductCard, SearchInput, SectionIntro } from "../components/common/Ui";
import { useAsyncData } from "../hooks/useAsyncData";
import { storefrontService } from "../services/api";
import { cn } from "../utils/format";
import menCategoryImage from "../assets/home/categories/men-category.png";
import womenCategoryImage from "../assets/home/categories/women-category.png";
import kidsCategoryImage from "../assets/home/categories/kids-category.png";
import lifestyleCategoryImage from "../assets/home/categories/lifestyle-category.png";

const sortOptions = [
  "Popularity",
  "Newest",
  "Price low-to-high",
  "Price high-to-low",
  "Rating"
] as const;

export default function ShopPage() {
  const { slug, categorySlug, subcategorySlug } = useParams();
  const routeCategorySlug = categorySlug ?? slug;
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<(typeof sortOptions)[number]>("Popularity");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const mobileFilterButtonRef = useRef<HTMLButtonElement>(null);
  const mobileFilterCloseRef = useRef<HTMLButtonElement>(null);
  const mobileFilterDialogRef = useRef<HTMLDivElement>(null);
  const [visibleCount, setVisibleCount] = useState(12);
  const [filters, setFilters] = useState({
    category: "",
    gender: "",
    size: "",
    colour: "",
    fabric: "",
    fit: "",
    printMethod: "",
    subcategory: "",
    customisable: false,
    price: 5000
  });

  useEffect(() => {
    setSearch("");
    setFilters(resetFilters());
    setVisibleCount(12);
    setMobileFiltersOpen(false);
  }, [routeCategorySlug, subcategorySlug]);

  const closeMobileFilters = useCallback(() => {
    setMobileFiltersOpen(false);
    window.requestAnimationFrame(() => mobileFilterButtonRef.current?.focus());
  }, []);

  useEffect(() => {
    if (!mobileFiltersOpen) return;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeMobileFilters();
      if (event.key === "Tab") {
        const focusable = Array.from(mobileFilterDialogRef.current?.querySelectorAll<HTMLElement>("button:not([disabled]), select:not([disabled]), input:not([disabled])") ?? []);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    window.requestAnimationFrame(() => mobileFilterCloseRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closeMobileFilters, mobileFiltersOpen]);

  const { data, loading, error } = useAsyncData(async () => {
    const [categories, products] = await Promise.all([
      storefrontService.getCategories(),
      storefrontService.getNormalizedProducts()
    ]);
    return { categories, products };
  }, []);

  const activeCategory = data?.categories.find(
    (category) => !category.parentId && category.slug === routeCategorySlug
  );
  const activeSubcategory = data?.categories.find(
    (category) => category.parentId === activeCategory?.id && category.slug === subcategorySlug
  );
  const routeMissing = Boolean(
    routeCategorySlug && data && (!activeCategory || (subcategorySlug && !activeSubcategory))
  );
  const mainCategories = (data?.categories ?? [])
    .filter((category) => !category.parentId)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const selectedCategoryId = activeCategory?.id || filters.category;
  const availableSubcategories = (data?.categories ?? []).filter(
    (category) => category.parentId === selectedCategoryId
  );
  const categoryProducts = (data?.products ?? []).filter(
    (product) => !selectedCategoryId || product.categoryId === selectedCategoryId
  );

  const filteredProducts = useMemo(() => {
    const products = data?.products ?? [];

    return products
      .filter((product) => {
        const selectedSubcategoryId = activeSubcategory?.id || filters.subcategory;
        const matchesRoute = selectedCategoryId ? product.categoryId === selectedCategoryId : !routeCategorySlug;
        const matchesSubcategory = selectedSubcategoryId
          ? product.subcategoryId === selectedSubcategoryId
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
          matchesSubcategory &&
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
  }, [activeSubcategory?.id, data?.products, filters, routeCategorySlug, search, selectedCategoryId, sortBy]);

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

  if (routeMissing) {
    return (
      <div className="container-shell py-20">
        <Seo title="Collection not found" description="This collection is unavailable." path={location.pathname} />
        <EmptyState
          title="Collection not found"
          description="This category may be inactive, renamed or unavailable. Browse the current catalogue instead."
          action={<Link to="/shop" className="button-primary">Shop all products</Link>}
        />
      </div>
    );
  }

  const activeChips = Object.entries(filters)
    .filter(([key, value]) => key !== "price" && value !== "" && value !== false)
    .map(([key, value]) => {
      if (key === "category") return `Category: ${mainCategories.find((category) => category.id === value)?.name ?? value}`;
      if (key === "subcategory") return `Subcategory: ${availableSubcategories.find((category) => category.id === value)?.name ?? value}`;
      return `${key}: ${String(value)}`;
    });

  return (
    <>
      <Seo
        title={activeSubcategory ? `${activeSubcategory.name} for ${activeCategory?.name}` : activeCategory ? `${activeCategory.name} Collection` : "Shop All Products"}
        description={activeSubcategory?.description ?? activeCategory?.description ?? "Browse customisable apparel, caps, hoodies, gifts and premium merchandise."}
        path={activeSubcategory ? `/shop/${activeCategory?.slug}/${activeSubcategory.slug}` : routeCategorySlug ? `/shop/${routeCategorySlug}` : "/shop"}
      />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[
          { label: "Home", to: "/" },
          ...(activeCategory ? [{ label: activeCategory.name, to: activeSubcategory ? `/shop/${activeCategory.slug}` : undefined }] : [{ label: "Shop" }]),
          ...(activeSubcategory ? [{ label: activeSubcategory.name }] : [])
        ]} />
        <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
          <aside className="hidden lg:block">
            <FilterPanel products={categoryProducts} categories={mainCategories} subcategories={availableSubcategories} lockedCategory={Boolean(activeCategory)} lockedSubcategory={Boolean(activeSubcategory)} filters={filters} onChange={setFilters} onClear={() => setFilters(resetFilters())} />
          </aside>
          <section className="space-y-6">
            <SectionIntro
              eyebrow="Product listing"
              title={activeSubcategory ? activeSubcategory.name : activeCategory ? activeCategory.name : "All products"}
              description={
                activeSubcategory?.description ?? activeCategory?.description ??
                "Browse premium tees, caps, hoodies, gifts and curated merchandising pieces ready for customisation."
              }
            />
            {!activeCategory && !activeSubcategory ? (
              <section aria-labelledby="shop-categories-title">
                <div className="flex items-end justify-between gap-4">
                  <div><h2 id="shop-categories-title" className="font-heading text-2xl font-extrabold text-brand-navy sm:text-3xl">Shop by category</h2><p className="mt-2 text-sm text-brand-muted">Choose a category or keep browsing everything.</p></div>
                  {filters.category ? <button type="button" onClick={() => setFilters((state) => ({ ...state, category: "", subcategory: "" }))} className="min-h-11 text-sm font-semibold text-brand-cyan-dark">View all</button> : null}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                  {mainCategories.map((category) => {
                    const selected = filters.category === category.id;
                    const fallbackImage = category.slug === "men" ? menCategoryImage : category.slug === "women" ? womenCategoryImage : category.slug === "kids" ? kidsCategoryImage : category.slug === "lifestyle" ? lifestyleCategoryImage : null;
                    const image = category.imageUrl || fallbackImage;
                    const count = data.products.filter((product) => product.categoryId === category.id).length;
                    return (
                      <button key={category.id} type="button" aria-pressed={selected} onClick={() => { setFilters((state) => ({ ...state, category: selected ? "" : category.id, subcategory: "" })); setVisibleCount(12); }} className={cn("group relative min-h-[190px] overflow-hidden rounded-[16px] bg-brand-navy p-4 text-left text-white transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-cyan sm:min-h-[230px]", selected && "ring-4 ring-brand-cyan/35")}>
                        {image ? <img src={image} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" /> : null}
                        <span className="absolute inset-0 bg-[linear-gradient(180deg,rgba(7,22,61,0.04),rgba(7,22,61,0.92))]" />
                        <span className="relative flex h-full min-h-[158px] flex-col justify-end sm:min-h-[198px]"><span className="font-heading text-xl font-extrabold sm:text-2xl">{category.name}</span><span className="mt-1 flex items-center justify-between gap-2 text-xs font-semibold text-white/78"><span>{count} product{count === 1 ? "" : "s"}</span><ArrowRight className="h-4 w-4 text-brand-cyan transition-transform group-hover:translate-x-1" /></span></span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}
            <div className="flex flex-col gap-4 rounded-[28px] border border-black/5 bg-white p-4 shadow-card xl:flex-row xl:items-center xl:justify-between">
              <div className="grid gap-4 md:grid-cols-[1fr_auto_auto] md:items-center">
                <SearchInput value={search} onChange={setSearch} placeholder="Search within this category" />
                <button
                  ref={mobileFilterButtonRef}
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
                <div className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4">
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
            <button type="button" aria-label="Close filters" onClick={closeMobileFilters} className="fixed inset-0 z-50 bg-black/30 lg:hidden" />
            <div ref={mobileFilterDialogRef} role="dialog" aria-modal="true" aria-labelledby="mobile-filter-title" className="fixed inset-x-0 bottom-0 z-[51] max-h-[88vh] overflow-y-auto rounded-t-[28px] bg-white p-5 lg:hidden">
              <div className="mb-4 flex items-center justify-between">
                <h2 id="mobile-filter-title" className="font-heading text-2xl font-bold">Filters</h2>
                <button ref={mobileFilterCloseRef} type="button" aria-label="Close filters" onClick={closeMobileFilters} className="min-h-11 min-w-11 rounded-full border border-black/10 p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
              <FilterPanel products={categoryProducts} categories={mainCategories} subcategories={availableSubcategories} lockedCategory={Boolean(activeCategory)} lockedSubcategory={Boolean(activeSubcategory)} filters={filters} onChange={setFilters} onClear={() => setFilters(resetFilters())} compact />
              <div className="sticky bottom-0 -mx-5 mt-4 border-t border-black/8 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
                <button type="button" onClick={closeMobileFilters} className="button-primary w-full">Show {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"}</button>
              </div>
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
    category: "",
    gender: "",
    size: "",
    colour: "",
    fabric: "",
    fit: "",
    printMethod: "",
    subcategory: "",
    customisable: false,
    price: 5000
  };
}

function FilterPanel({
  products,
  categories,
  subcategories,
  lockedCategory,
  lockedSubcategory,
  filters,
  onChange,
  onClear,
  compact
}: {
  products: Awaited<ReturnType<typeof storefrontService.getNormalizedProducts>>;
  categories: Awaited<ReturnType<typeof storefrontService.getCategories>>;
  subcategories: Awaited<ReturnType<typeof storefrontService.getCategories>>;
  lockedCategory?: boolean;
  lockedSubcategory?: boolean;
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
        {!lockedCategory ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Category</span>
            <select
              value={filters.category}
              onChange={(event) => onChange({ ...filters, category: event.target.value, subcategory: "" })}
              className="min-h-12 w-full rounded-2xl border border-black/10 bg-brand-offwhite px-4 py-3 text-sm outline-none focus:border-brand-cyan"
            >
              <option value="">All categories</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
          </label>
        ) : null}
        {subcategories.length && !lockedSubcategory ? (
          <label className="block space-y-2">
            <span className="text-sm font-semibold">Subcategory</span>
            <select
              value={filters.subcategory}
              onChange={(event) => setField("subcategory", event.target.value)}
              className="w-full rounded-2xl border border-black/10 bg-brand-offwhite px-4 py-3 text-sm outline-none"
            >
              <option value="">All subcategories</option>
              {subcategories.map((subcategory) => (
                <option key={subcategory.id} value={subcategory.id}>
                  {subcategory.name} ({subcategory.productCount ?? products.filter((product) => product.subcategoryId === subcategory.id).length})
                </option>
              ))}
            </select>
          </label>
        ) : null}
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
