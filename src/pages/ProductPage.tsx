import { Heart, Minus, Plus, Shield, ShoppingBag, Truck } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { AssetImage, defaultProductAssetPath } from "../components/common/AssetImage";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, EmptyState, LoadingState, ProductCard, SectionIntro } from "../components/common/Ui";
import { useAsyncData } from "../hooks/useAsyncData";
import { resolveProductGallery } from "../lib/productPreview";
import { catalogService, storefrontService } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { calculateDiscount, currencyFormatter } from "../utils/format";

export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const addToCart = useAppStore((state) => state.addToCart);
  const toggleWishlist = useAppStore((state) => state.toggleWishlist);
  const addRecentProduct = useAppStore((state) => state.addRecentProduct);
  const wishlist = useAppStore((state) => state.wishlist);
  const recentProductIds = useAppStore((state) => state.recentProductIds);
  const [activeImage, setActiveImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [pinCode, setPinCode] = useState("");
  const [pinMessage, setPinMessage] = useState("");

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [slug]);

  const { data, loading, error } = useAsyncData(async () => {
    if (!slug) {
      return null;
    }

    const product = await storefrontService.getProductBySlug(slug);
    const relatedProducts = await catalogService.getRelatedProducts(product);
    const togetherProducts = await catalogService.getFrequentlyBoughtTogether(product);
    const allProducts = await storefrontService.getNormalizedProducts();
    return { product, relatedProducts, togetherProducts, allProducts };
  }, [slug]);

  const product = data?.product ?? null;
  const relatedProducts = data?.relatedProducts ?? [];
  const togetherProducts = data?.togetherProducts ?? [];
  const recentProducts = useMemo(
    () =>
      recentProductIds
        .filter((id) => id !== product?.id)
        .map((id) => data?.allProducts.find((item) => item.id === id))
        .filter(Boolean),
    [data?.allProducts, product?.id, recentProductIds]
  );
  const galleryAssets = useMemo(
    () => product ? resolveProductGallery(product, selectedColor, selectedSize) : [],
    [product, selectedColor, selectedSize]
  );

  useEffect(() => {
    if (product) {
      addRecentProduct(product.id);
      setSelectedSize(product.sizeOptions[0] ?? "One Size");
      setSelectedColor(product.colorOptions[0] ?? "Black");
      setActiveImage(0);
    }
  }, [addRecentProduct, product]);

  useEffect(() => {
    setActiveImage(0);
  }, [product?.id, selectedColor, selectedSize]);

  if (loading) {
    return (
      <div className="container-shell py-20">
        <LoadingState label="Loading product" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container-shell py-10 pb-28">
        <EmptyState
          title="Product not found"
          description={error ?? "The requested product could not be loaded from the storefront API."}
          action={
            <Link to="/shop" className="button-primary">
              Back to shop
            </Link>
          }
        />
      </div>
    );
  }

  const wished = wishlist.some((item) => item.productId === product.id);
  const selectedVariant =
    product.variants.find((variant) => variant.size === selectedSize && variant.color === selectedColor) ??
    product.variants[0];
  const primaryAudience = product.audience[0] ?? "unisex";
  const summaryCopy =
    product.description.split(/(?<=[.!?])\s+/)[0]?.trim() || product.description;
  const metaHighlights = [
    product.fabric ? `${product.fabric}` : "",
    product.fit ? `${product.fit} fit` : "",
    product.gsm ? `${product.gsm} GSM` : "",
    product.printMethods[0] ? product.printMethods[0] : ""
  ].filter(Boolean);
  const structuredData = {
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images,
    brand: { "@type": "Brand", name: "Fabpodd" },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: product.rating,
      reviewCount: product.reviewCount
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: product.price,
      availability: "https://schema.org/InStock"
    }
  };

  return (
    <>
      <Seo
        title={product.name}
        description={product.description}
        path={`/product/${product.slug}`}
        image={product.images[0]}
        structuredData={structuredData}
      />
      <div className="container-shell py-6 pb-28 sm:py-8">
        <Breadcrumbs
          items={[
            { label: "Home", to: "/" },
            { label: "Shop", to: "/shop" },
            { label: product.subcategory, to: `/shop/${primaryAudience}` },
            { label: product.name }
          ]}
        />

        <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.96fr)_minmax(520px,1.04fr)] xl:gap-8">
          <div className="space-y-5 xl:sticky xl:top-32 xl:self-start">
            <div className="rounded-[36px] border border-black/6 bg-[radial-gradient(circle_at_top_left,_rgba(8,185,212,0.12),_transparent_26%),linear-gradient(180deg,_rgba(255,255,255,0.96),_rgba(242,247,250,0.92))] p-4 shadow-card sm:p-5">
              <div className="grid gap-4 md:grid-cols-[90px_minmax(0,1fr)] md:items-start">
                <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:mx-0 md:max-h-[640px] md:flex-col md:overflow-y-auto md:overflow-x-hidden md:px-0">
                  {galleryAssets.map((image, index) => (
                    <button
                      key={image.id}
                      type="button"
                      onClick={() => setActiveImage(index)}
                      className={`w-[124px] shrink-0 overflow-hidden rounded-[24px] border bg-white p-2 text-left transition md:w-full ${
                        activeImage === index ? "border-brand-black shadow-card" : "border-black/10 hover:border-black/25"
                      }`}
                    >
                      <AssetImage
                        src={image.imageUrl}
                        alt={`${product.name} thumbnail ${index + 1}`}
                        expectedPath={defaultProductAssetPath(product.slug, index)}
                        missingLabel="Product image is missing"
                        imageClassName="h-28 w-full rounded-[18px] object-cover object-top md:h-24"
                        fallbackClassName="h-28 w-full rounded-[18px] md:h-24"
                      />
                    </button>
                  ))}
                </div>

                <div className="rounded-[30px] border border-black/6 bg-white/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-6">
                  <AssetImage
                    src={galleryAssets[activeImage]?.imageUrl ?? galleryAssets[0]?.imageUrl ?? product.images[0]}
                    alt={`${product.name} detailed product view`}
                    expectedPath={defaultProductAssetPath(product.slug, activeImage)}
                    missingLabel="Product image is missing"
                    imageClassName="h-[420px] w-full object-contain object-center transition duration-300 sm:h-[540px] xl:h-[640px]"
                    fallbackClassName="h-[420px] w-full sm:h-[540px] xl:h-[640px]"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-[36px] border border-black/6 bg-white p-5 shadow-card sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <h1 className="font-heading text-3xl font-extrabold leading-[1.02] tracking-[-0.03em] sm:text-4xl xl:text-[2.75rem]">
                    {product.name}
                  </h1>
                </div>
                {product.badge ? (
                  <span className="shrink-0 rounded-full bg-brand-orange px-4 py-2 text-sm font-semibold text-brand-navy">
                    {product.badge}
                  </span>
                ) : null}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-brand-black/62">
                <span>{product.rating.toFixed(1)} rating</span>
                <span>•</span>
                <span>{product.reviewCount} reviews</span>
                <span>•</span>
                <span>{selectedVariant?.stock ?? product.variants[0]?.stock ?? 0} in stock</span>
              </div>

              <div className="mt-5 flex flex-wrap items-end gap-x-3 gap-y-2">
                <span className="text-3xl font-black tracking-tight sm:text-4xl">{currencyFormatter.format(product.price)}</span>
                <span className="pb-1 text-lg text-brand-black/35 line-through">{currencyFormatter.format(product.originalPrice)}</span>
                <span className="rounded-full bg-brand-success/10 px-3 py-1.5 text-sm font-semibold text-brand-success">
                  {calculateDiscount(product.price, product.originalPrice)}% off
                </span>
              </div>

              <p className="mt-3 max-w-[68ch] text-base leading-7 text-brand-black/70">{summaryCopy}</p>
              <p className="mt-2 text-sm text-brand-black/55">Inclusive of taxes. Delivery calculated at checkout.</p>

              {metaHighlights.length ? (
                <div className="mt-5 flex flex-wrap gap-2">
                  {metaHighlights.map((item) => (
                    <span key={item} className="rounded-full border border-black/8 bg-brand-offwhite px-3 py-2 text-sm font-medium text-brand-black/72">
                      {item}
                    </span>
                  ))}
                </div>
              ) : null}

              <div className="mt-6 border-t border-black/8 pt-5">
                <p className="text-sm font-semibold">Colours</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.colorOptions.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setSelectedColor(color);
                        setActiveImage(0);
                      }}
                      className={`min-h-11 rounded-full border px-4 py-2.5 text-sm font-medium transition ${selectedColor === color ? "border-brand-black bg-brand-black text-white" : "border-black/10 hover:border-black/25"}`}
                    >
                      {color}
                      <span
                        className="ml-2 inline-block h-3 w-3 rounded-full align-middle"
                        style={{
                          backgroundColor: product.variants.find((variant) => variant.color === color)?.hex ?? "#111111"
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <p className="text-sm font-semibold">Size</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {product.sizeOptions.map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => {
                        setSelectedSize(size);
                        setActiveImage(0);
                      }}
                      className={`min-h-11 min-w-[3.5rem] rounded-full border px-4 py-2.5 text-sm font-semibold transition ${selectedSize === size ? "border-brand-black bg-brand-black text-white" : "border-black/10 hover:border-black/25"}`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)]">
                <div>
                  <p className="text-sm font-semibold">Quantity</p>
                  <div className="mt-3 inline-flex items-center gap-4 rounded-full border border-black/10 px-4 py-3">
                    <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-8 text-center font-semibold">{quantity}</span>
                    <button type="button" aria-label="Increase quantity" onClick={() => setQuantity((value) => value + 1)}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold">Delivery PIN-code checker</p>
                  <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                    <input
                      value={pinCode}
                      onChange={(event) => setPinCode(event.target.value)}
                      placeholder="Enter PIN code"
                      className="flex-1 rounded-full border border-black/10 px-5 py-3 outline-none transition focus:border-black/25"
                    />
                    <button
                      type="button"
                      className="button-secondary"
                      onClick={() =>
                        setPinMessage(pinCode.length === 6 ? "Delivery available in 3-5 working days." : "Enter a valid 6-digit PIN code.")
                      }
                    >
                      Check
                    </button>
                  </div>
                  {pinMessage ? <p className="mt-2 text-sm text-brand-black/60">{pinMessage}</p> : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  className="button-primary"
                  onClick={() =>
                    addToCart({
                      productId: product.id,
                      variantId: selectedVariant?.id ?? product.id,
                      selectedColor,
                      selectedSize,
                      quantity
                    })
                  }
                >
                  <ShoppingBag className="mr-2 h-4 w-4" />
                  Add to Bag
                </button>
                <button
                  type="button"
                  className="button-secondary"
                  onClick={() => {
                    addToCart({
                      productId: product.id,
                      variantId: selectedVariant?.id ?? product.id,
                      selectedColor,
                      selectedSize,
                      quantity
                    });
                    navigate("/checkout");
                  }}
                >
                  Buy Now
                </button>
                <button type="button" className="button-secondary" onClick={() => toggleWishlist(product.id)}>
                  <Heart className={`mr-2 h-4 w-4 ${wished ? "fill-brand-pink text-brand-pink" : ""}`} />
                  Add to Wishlist
                </button>
                <Link to={`/customise?product=${product.id}`} className="button-secondary">
                  Customise This Product
                </Link>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <MiniTrust title="Secure checkout" copy="Protected payment flow." />
                <MiniTrust title="Quick dispatch" copy="3-5 working days." />
                <MiniTrust title="Custom ready" copy="Branding support available." />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <FeatureCard icon={<Shield className="h-5 w-5" />} title="Secure payments" copy="Clean payment abstraction ready for future gateway integration." />
              <FeatureCard icon={<Truck className="h-5 w-5" />} title="Delivery information" copy={product.delivery} />
            </div>
          </div>
        </section>

        <section className="mt-16" aria-labelledby="product-details-title">
          <h2 id="product-details-title" className="section-title">
            Product details
          </h2>

          <div className="mt-6 overflow-hidden rounded-[32px] bg-white shadow-card">
            <div className="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)]">
              <article className="border-b border-black/8 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <h3 className="font-heading text-2xl font-bold text-brand-black">Product story</h3>
                <p className="mt-4 max-w-[72ch] text-base leading-8 text-brand-black/68">
                  {product.description}
                </p>
                <InfoList items={product.specifications} columns />
              </article>

              <aside className="bg-brand-soft/70 p-6 sm:p-8">
                <section>
                  <h3 className="font-heading text-2xl font-bold text-brand-black">Material and fit</h3>
                  <dl className="mt-5 space-y-4">
                    <InfoDefinition label="Material" value={product.material} />
                    <InfoDefinition label="Fit" value={product.fit} />
                    <InfoDefinition label="Fabric" value={product.fabric} />
                  </dl>
                </section>

                <section className="mt-8 border-t border-black/10 pt-7">
                  <h3 className="font-heading text-xl font-bold text-brand-black">Printing compatibility</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {product.printingCompatibility.map((method) => (
                      <span
                        key={method}
                        className="rounded-full border border-brand-cyan/30 bg-white px-4 py-2 text-sm font-semibold text-brand-black"
                      >
                        {method}
                      </span>
                    ))}
                  </div>
                </section>
              </aside>
            </div>

            <div className="grid border-t border-black/8 lg:grid-cols-2">
              <article className="border-b border-black/8 p-6 sm:p-8 lg:border-b-0 lg:border-r">
                <h3 className="font-heading text-2xl font-bold text-brand-black">Care instructions</h3>
                <InfoList items={product.care} />
              </article>

              <article className="p-6 sm:p-8">
                <h3 className="font-heading text-2xl font-bold text-brand-black">Return summary</h3>
                <p className="mt-4 text-base leading-8 text-brand-black/68">{product.returns}</p>

                {product.offers.length ? (
                  <div className="mt-7 border-t border-black/8 pt-6">
                    <h4 className="font-heading text-xl font-bold text-brand-black">Offers</h4>
                    <InfoList items={product.offers} compact />
                  </div>
                ) : null}
              </article>
            </div>
          </div>
        </section>

        {togetherProducts.length ? (
          <section className="mt-16">
            <SectionIntro title="Frequently bought together" description="Useful pairings for kits, teams and gifting bundles." />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {togetherProducts.map((entry) => (
                <ProductCard key={entry.id} product={entry} />
              ))}
            </div>
          </section>
        ) : null}

        {relatedProducts.length ? (
          <section className="mt-16">
            <SectionIntro title="Related products" description="More products from the same product family." />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {relatedProducts.map((entry) => (
                <ProductCard key={entry.id} product={entry} />
              ))}
            </div>
          </section>
        ) : null}

        {recentProducts.length ? (
          <section className="mt-16">
            <SectionIntro title="Recently viewed" description="Continue exploring products you opened earlier in this session." />
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
              {recentProducts.map((entry) =>
                entry ? <ProductCard key={entry.id} product={entry} /> : null
              )}
            </div>
          </section>
        ) : null}
      </div>
    </>
  );
}

function FeatureCard({
  icon,
  title,
  copy
}: {
  icon: React.ReactNode;
  title: string;
  copy: string;
}) {
  return (
    <div className="rounded-[28px] bg-white p-6 shadow-card">
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-yellow/15 text-brand-black">
        {icon}
      </span>
      <h3 className="mt-4 font-heading text-2xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-brand-black/65">{copy}</p>
    </div>
  );
}

function MiniTrust({ title, copy }: { title: string; copy: string }) {
  return (
    <div className="rounded-[24px] border border-black/8 bg-brand-offwhite px-4 py-4">
      <p className="text-sm font-semibold text-brand-black">{title}</p>
      <p className="mt-1 text-xs leading-6 text-brand-black/60">{copy}</p>
    </div>
  );
}

function InfoDefinition({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 border-b border-black/8 pb-4 last:border-b-0 last:pb-0">
      <dt className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-black/48">{label}</dt>
      <dd className="text-base font-semibold leading-7 text-brand-black/78">{value}</dd>
    </div>
  );
}

function InfoList({ items, columns = false, compact = false }: { items: string[]; columns?: boolean; compact?: boolean }) {
  return (
    <ul className={`mt-5 grid gap-x-8 ${compact ? "gap-y-2" : "gap-y-3"} ${columns ? "sm:grid-cols-2" : ""}`}>
      {items.filter(Boolean).map((item, index) => (
        <li key={`${item}-${index}`} className="flex gap-3 text-sm leading-7 text-brand-black/65">
          <span aria-hidden="true" className="mt-[0.65rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-cyan" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
