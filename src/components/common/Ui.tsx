import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  Heart,
  LoaderCircle,
  Search,
  Star
} from "lucide-react";
import { Link } from "react-router-dom";
import type { FieldError, UseFormRegisterReturn } from "react-hook-form";
import { toast } from "sonner";
import { useAppStore } from "../../store/useAppStore";
import type { Product } from "../../types/models";
import { calculateDiscount, cn, currencyFormatter } from "../../utils/format";
import { AssetImage, defaultProductAssetPath } from "./AssetImage";

export function SectionIntro({
  eyebrow,
  title,
  description,
  action
}: {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-brand-muted">
            {eyebrow}
          </p>
        ) : null}
        <h2 className="section-title">{title}</h2>
        <p className="mt-3 text-sm leading-7 text-brand-muted md:text-base">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ProductCard({ product }: { product: Product }) {
  const toggleWishlist = useAppStore((state) => state.toggleWishlist);
  const wishlist = useAppStore((state) => state.wishlist);
  const addToCart = useAppStore((state) => state.addToCart);
  const wished = wishlist.some((item) => item.productId === product.id);
  const discount = calculateDiscount(product.price, product.originalPrice);

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-[16px] border border-[#E5E7EB] bg-white shadow-sm transition duration-500 ease-luxe hover:-translate-y-1 hover:shadow-xl md:rounded-[26px] md:border-black/6"
    >
      <div className="relative overflow-hidden">
        <Link to={`/product/${product.slug}`} aria-label={product.name}>
          <AssetImage
            src={product.images[0]}
            alt={`${product.name} lifestyle product photograph`}
            expectedPath={defaultProductAssetPath(product.slug)}
            missingLabel="Product image is missing"
            imageClassName="aspect-square w-full bg-[#FCFAF6] object-cover [object-position:center_38%] transition duration-500 ease-luxe group-hover:scale-[1.04] md:aspect-[1/1.02] md:[object-position:center_34%]"
            fallbackClassName="aspect-square w-full md:aspect-[1/1.02]"
          />
        </Link>
        <div className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-brand-yellow transition duration-500 ease-luxe group-hover:scale-x-100" />
        <button
          type="button"
          aria-label="Toggle wishlist"
          onClick={() => {
            toggleWishlist(product.id);
            toast.success(wished ? "Removed from wishlist" : "Added to wishlist");
          }}
          className="absolute right-3 top-3 rounded-full bg-white/92 p-2 text-brand-black shadow-soft transition duration-300 ease-luxe group-hover:scale-110 md:right-4 md:top-4 md:p-2.5"
        >
          <Heart className={cn("h-4 w-4", wished && "fill-brand-yellow text-brand-yellow")} />
        </button>
        <div className="absolute left-3 top-3 hidden gap-2 md:left-4 md:top-4 md:flex">
          <span className="rounded-full bg-brand-yellow px-2.5 py-1 text-[10px] font-semibold text-brand-black md:px-3 md:text-[11px]">
            {discount}% OFF
          </span>
          {product.badge ? (
            <span className="rounded-full bg-brand-charcoal px-2.5 py-1 text-[10px] font-semibold text-white md:px-3 md:text-[11px]">
              {product.badge}
            </span>
          ) : null}
        </div>
        <div className="absolute inset-x-4 bottom-4 hidden translate-y-4 items-center justify-between gap-3 opacity-0 transition duration-500 ease-luxe group-hover:translate-y-0 group-hover:opacity-100 md:flex">
          <button
            type="button"
            aria-label="Quick add"
            onClick={() => {
              addToCart({
                productId: product.id,
                variantId: product.variants[0].id,
                quantity: 1
              });
              toast.success("Added to cart");
            }}
            className="inline-flex flex-1 items-center justify-center rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-brand-black shadow-soft"
          >
            Quick Add
          </button>
          <Link
            to={`/product/${product.slug}`}
            aria-label={`View ${product.name}`}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-charcoal text-white shadow-soft"
          >
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
      <div className="space-y-2.5 p-3 transition duration-500 ease-luxe group-hover:-translate-y-1 md:space-y-4 md:p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="hidden text-[11px] font-semibold uppercase tracking-[0.22em] text-brand-muted md:block">FabCoutur</p>
            <Link to={`/product/${product.slug}`} className="block text-[15px] font-semibold leading-5 text-brand-black md:mt-2 md:font-heading md:text-lg md:font-bold md:leading-6">
              {product.name}
            </Link>
            <p className="mt-1 hidden text-sm text-brand-muted md:block">{product.material}</p>
          </div>
          {product.customisable ? (
            <span className="hidden rounded-full bg-brand-soft px-3 py-1 text-[11px] font-semibold text-brand-charcoal md:inline-flex">
              Customisable
            </span>
          ) : null}
        </div>
        <div className="hidden items-center gap-2 text-sm text-brand-muted md:flex">
          <Star className="h-4 w-4 fill-brand-yellow text-brand-yellow" />
          <span>{product.rating.toFixed(1)}</span>
          <span>({product.reviewCount})</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <span className="font-semibold text-brand-black">{currencyFormatter.format(product.price)}</span>
          <span className="hidden text-sm text-brand-muted line-through md:inline">
            {currencyFormatter.format(product.originalPrice)}
          </span>
          <span className="hidden rounded-full bg-red-50 px-2 py-1 text-xs font-semibold text-red-600 md:inline-flex">
            {discount}% off
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {product.colorOptions.slice(0, 4).map((color, index) => (
            <span
              key={color}
              className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-black/10 md:h-auto md:w-auto md:px-2 md:py-1 md:text-xs md:text-brand-muted"
            >
              <span
                className="inline-flex h-full w-full rounded-full md:hidden"
                style={{ backgroundColor: product.variants[index]?.hex ?? "#E5E7EB" }}
              />
              <span className="sr-only md:not-sr-only">{color}</span>
            </span>
          ))}
        </div>
      </div>
    </motion.article>
  );
}

export function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-[28px] border border-black/5 bg-white p-5 shadow-card">
      <div className="aspect-[4/4.4] animate-pulse rounded-[24px] bg-brand-grey" />
      <div className="mt-5 h-5 w-2/3 animate-pulse rounded-full bg-brand-grey" />
      <div className="mt-3 h-4 w-1/2 animate-pulse rounded-full bg-brand-grey" />
      <div className="mt-5 h-4 w-1/3 animate-pulse rounded-full bg-brand-grey" />
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card-panel flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <AlertCircle className="h-10 w-10 text-brand-black/35" />
      <h3 className="font-heading text-2xl font-bold">{title}</h3>
      <p className="max-w-lg text-sm leading-7 text-brand-black/65">{description}</p>
      {action}
    </div>
  );
}

export function Breadcrumbs({ items }: { items: Array<{ label: string; to?: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-6 text-sm text-brand-black/55">
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-2">
            {item.to ? (
              <Link to={item.to} className="hover:text-brand-black">
                {item.label}
              </Link>
            ) : (
              <span className="text-brand-black">{item.label}</span>
            )}
            {index < items.length - 1 ? <ArrowRight className="h-3.5 w-3.5" /> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}

type Register = UseFormRegisterReturn;
type ErrorValue = FieldError | undefined;

function BaseField({
  label,
  error,
  children
}: {
  label: string;
  error?: ErrorValue;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-semibold text-brand-black">{label}</span>
      {children}
      {error ? <span className="text-xs text-brand-error">{String(error.message)}</span> : null}
    </label>
  );
}

export function InputField({
  label,
  register,
  error,
  type = "text",
  placeholder
}: {
  label: string;
  register: Register;
  error?: ErrorValue;
  type?: string;
  placeholder?: string;
}) {
  return (
    <BaseField label={label} error={error}>
      <input
        {...register}
        type={type}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-brand-black"
      />
    </BaseField>
  );
}

export function SelectField({
  label,
  register,
  error,
  options
}: {
  label: string;
  register: Register;
  error?: ErrorValue;
  options: string[];
}) {
  return (
    <BaseField label={label} error={error}>
      <select
        {...register}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-brand-black"
      >
        <option value="">Select</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </BaseField>
  );
}

export function TextAreaField({
  label,
  register,
  error,
  placeholder,
  rows = 4
}: {
  label: string;
  register: Register;
  error?: ErrorValue;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <BaseField label={label} error={error}>
      <textarea
        {...register}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 outline-none transition focus:border-brand-black"
      />
    </BaseField>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = "Search products"
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3 shadow-soft">
      <Search className="h-4 w-4 text-brand-black/40" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full border-0 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

export function StatPill({ label }: { label: string }) {
  return (
    <div className="rounded-full border border-brand-black/10 bg-white px-4 py-2 text-sm font-medium text-brand-black/75">
      {label}
    </div>
  );
}

export function LoadingState({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-8 text-sm text-brand-black/60">
      <LoaderCircle className="h-4 w-4 animate-spin" />
      <span>{label}</span>
    </div>
  );
}

export function SuccessInline({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-2 rounded-2xl bg-brand-success/10 px-4 py-3 text-sm text-brand-success">
      <Check className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
