import type { Category, Product, ProductVariant } from "../types/models";

export interface StoreCategory {
  id: string;
  parentId: string | null;
  name: string;
  slug: string;
  description: string | null;
  audience: "men" | "women" | "kids" | "unisex" | "business";
  imageUrl: string | null;
  imagePublicId: string | null;
  isVisible: boolean;
  displayOrder: number;
}

export interface StoreProductImage {
  id: string;
  imageUrl: string;
  publicId: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
}

export interface StoreProductVariant {
  id: string;
  sku: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  stock: number;
  priceAdjustment: number;
}

export interface StoreProduct {
  id: string;
  categoryId: string;
  subcategoryId: string | null;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string | null;
  description: string | null;
  specifications: string[];
  audience: "men" | "women" | "kids" | "unisex" | "business";
  price: number;
  originalPrice: number | null;
  gstPercent: number;
  stock: number;
  sizes: string[];
  colors: string[];
  fabric: string | null;
  fit: string | null;
  gsm: string | null;
  printingMethod: string | null;
  seoTitle: string | null;
  seoMetaDescription: string | null;
  isBestseller: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isCustomisable: boolean;
  isArchived: boolean;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
  images: StoreProductImage[];
  variants: StoreProductVariant[];
}

export interface HomepagePayload {
  hero: {
    heading: string;
    description: string;
    primaryButtonLabel: string;
    primaryButtonLink: string;
    secondaryButtonLabel: string;
    secondaryButtonLink: string;
    badge: string;
    images: Array<{
      id: string;
      imageUrl: string | null;
      imagePublicId: string | null;
      sortOrder: number;
    }>;
    imageUrl: string | null;
    imagePublicId: string | null;
  };
  categoryCards: Array<{
    id: string;
    title: string;
    link: string;
    imageUrl: string | null;
    imagePublicId: string | null;
    sortOrder: number;
  }>;
  benefits: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    sortOrder: number;
  }>;
  featuredSection: {
    title: string;
    description: string;
    productIds: string[];
  };
  newArrivalsSection: {
    title: string;
    description: string;
    productIds: string[];
  };
  siteSettings: {
    siteName: string;
    announcementBar: {
      enabled: boolean;
      items: string[];
    };
    supportEmail: string | null;
    supportPhone: string | null;
    businessHours: string | null;
    socialLinks: Record<string, string>;
  };
}

export function normalizeHomepagePayload(payload: HomepagePayload): HomepagePayload {
  const heroImages = Array.isArray(payload.hero?.images)
    ? payload.hero.images
        .filter((image) => image?.imageUrl)
        .map((image, index) => ({
          id: image.id || `hero-image-${index + 1}`,
          imageUrl: image.imageUrl ?? null,
          imagePublicId: image.imagePublicId ?? null,
          sortOrder: Number.isFinite(image.sortOrder) ? image.sortOrder : index
        }))
        .sort((left, right) => left.sortOrder - right.sortOrder)
    : [];

  const legacyHeroImage =
    payload.hero?.imageUrl
      ? [{
          id: "hero-image-1",
          imageUrl: payload.hero.imageUrl,
          imagePublicId: payload.hero.imagePublicId ?? null,
          sortOrder: 0
        }]
      : [];

  const images = heroImages.length ? heroImages : legacyHeroImage;
  const primaryImage = images[0] ?? null;

  return {
    ...payload,
    hero: {
      ...payload.hero,
      images,
      imageUrl: primaryImage?.imageUrl ?? null,
      imagePublicId: primaryImage?.imagePublicId ?? null
    }
  };
}

export function normalizeCategory(category: StoreCategory): Category {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    audience: category.audience,
    description: category.description ?? "Curated premium products ready for customisation.",
    image: category.imageUrl ?? "",
    featured: category.displayOrder <= 4
  };
}

function buildFallbackVariants(product: StoreProduct, gallery: string[], colors: string[], sizes: string[]): ProductVariant[] {
  const safeColors = colors.length ? colors : ["Black"];
  const safeSizes = sizes.length ? sizes : ["One Size"];

  return safeColors.flatMap((color, colorIndex) =>
    safeSizes.map((size, sizeIndex) => ({
      id: `${product.id}-${colorIndex}-${sizeIndex}`,
      sku: `${product.sku}-${colorIndex + 1}${sizeIndex + 1}`,
      color,
      hex: colorIndex % 2 === 0 ? "#111111" : "#f5f5f5",
      size,
      stock: product.stock,
      image: gallery[Math.min(colorIndex, gallery.length - 1)] ?? ""
    }))
  );
}

export function normalizeProduct(product: StoreProduct, categories: StoreCategory[]): Product {
  const primaryImage = product.images.find((image) => image.isPrimary)?.imageUrl ?? product.images[0]?.imageUrl ?? "";
  const gallery = product.images.length ? product.images.map((image) => image.imageUrl) : [primaryImage].filter(Boolean);
  const sizes = product.sizes.length
    ? product.sizes
    : Array.from(new Set(product.variants.map((variant) => variant.size).filter(Boolean))) as string[];
  const colors = product.colors.length
    ? product.colors
    : Array.from(new Set(product.variants.map((variant) => variant.color).filter(Boolean))) as string[];
  const mappedVariants: ProductVariant[] = product.variants.length
    ? product.variants.map((variant, index) => ({
        id: variant.id,
        sku: variant.sku,
        color: variant.color ?? colors[index % Math.max(colors.length, 1)] ?? "Black",
        hex: variant.colorHex ?? "#111111",
        size: variant.size ?? sizes[index % Math.max(sizes.length, 1)] ?? "One Size",
        stock: variant.stock,
        image: gallery[index % Math.max(gallery.length, 1)] ?? primaryImage
      }))
    : buildFallbackVariants(product, gallery, colors, sizes);

  const category = categories.find((entry) => entry.id === product.subcategoryId || entry.id === product.categoryId);
  const audienceList =
    product.audience === "unisex" || product.audience === "business"
      ? (["unisex"] as Array<"men" | "women" | "kids" | "unisex">)
      : ([product.audience] as Array<"men" | "women" | "kids" | "unisex">);

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    audience: audienceList,
    categoryId: product.categoryId,
    subcategory: category?.name ?? product.audience.toUpperCase(),
    price: Number(product.price),
    originalPrice: product.originalPrice == null ? Number(product.price) : Number(product.originalPrice),
    rating: 4.6,
    reviewCount: 0,
    material: product.fabric ?? "Premium fabric",
    fabric: product.fabric ?? "Premium fabric",
    fit: product.fit ?? "Regular",
    gsm: product.gsm ?? "240",
    badge: product.isBestseller ? "Bestseller" : product.isNewArrival ? "New" : undefined,
    customisable: product.isCustomisable,
    printMethods: product.printingMethod ? [product.printingMethod] : ["Direct-to-garment"],
    images: gallery.length ? gallery : [""],
    hoverImage: gallery[1] ?? gallery[0] ?? "",
    videoPlaceholder: gallery[0] ?? "",
    description: product.description ?? product.shortDescription ?? "Premium customisable product.",
    colorOptions: colors.length ? colors : ["Black"],
    sizeOptions: sizes.length ? sizes : ["One Size"],
    specifications: product.specifications.length
      ? product.specifications
      : [
          product.fabric ? `${product.fabric} construction` : "Premium construction",
          product.gsm ? `${product.gsm} GSM` : "Built for everyday wear",
          "Ready for custom branding",
          "Quality checked before dispatch"
        ],
    printingCompatibility: product.printingMethod ? [product.printingMethod] : ["Direct-to-garment", "Embroidery"],
    care: ["Wash inside out with similar colours", "Avoid bleach and harsh detergents", "Cool iron away from print areas"],
    delivery: "Dispatch in 3-5 working days. Rush options available for selected SKUs.",
    returns: "Standard products support returns within 7 days. Customised pieces are reviewed case by case.",
    offers: ["Free shipping over ₹999", "Bulk pricing available", "Mockup support for custom orders"],
    variants: mappedVariants,
    relatedIds: [],
    frequentlyBoughtTogether: []
  };
}
