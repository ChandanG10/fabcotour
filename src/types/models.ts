export interface Address {
  id: string;
  label: string;
  recipient: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  pinCode: string;
  country: string;
  isDefault?: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: "customer" | "business";
  avatar: string;
  addresses: Address[];
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  audience: "men" | "women" | "kids" | "unisex" | "business";
  description: string;
  image: string;
  featured: boolean;
}

export interface ProductVariant {
  id: string;
  sku: string;
  color: string;
  hex: string;
  size: string;
  stock: number;
  image: string;
}

export interface ProductImageAsset {
  id: string;
  imageUrl: string;
  altText?: string | null;
  sortOrder: number;
  isPrimary: boolean;
  variantColor?: string | null;
  variantSize?: string | null;
  variantView?: "front" | "back" | "left" | "right" | null;
  isVariantPrimary?: boolean;
}

export interface Review {
  id: string;
  productId: string;
  user: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  image?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  audience: Array<"men" | "women" | "kids" | "unisex">;
  categoryId: string;
  mainCategorySlug?: string;
  subcategoryId?: string | null;
  subcategory: string;
  price: number;
  originalPrice: number;
  rating: number;
  reviewCount: number;
  material: string;
  fabric: string;
  fit: string;
  gsm: string;
  badge?: "Bestseller" | "New";
  customisable: boolean;
  featured?: boolean;
  newArrival?: boolean;
  bestseller?: boolean;
  printMethods: string[];
  images: string[];
  imageAssets?: ProductImageAsset[];
  hoverImage: string;
  videoPlaceholder: string;
  description: string;
  colorOptions: string[];
  sizeOptions: string[];
  specifications: string[];
  printingCompatibility: string[];
  care: string[];
  delivery: string;
  productType?: string | null;
  dimensions?: string | null;
  weight?: string | null;
  variantLabel?: string | null;
  customProductSlug?: string | null;
  returns: string;
  offers: string[];
  variants: ProductVariant[];
  relatedIds: string[];
  frequentlyBoughtTogether: string[];
}

export interface DesignLayer {
  id: string;
  type: "text" | "image";
  view: "front" | "back" | "left" | "right";
  content: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  fontStyle?: "normal" | "italic";
  textAlign?: "left" | "center" | "right";
  rotation: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CustomDesign {
  id: string;
  productId: string;
  productColor: string;
  size: string;
  quantity: number;
  printLocation: string;
  printMethod: string;
  rushDelivery: boolean;
  embroidery: boolean;
  previewImage?: string;
  previewView?: "front" | "back" | "left" | "right";
  layers: DesignLayer[];
}

export type ProductSide = "front" | "back" | "right" | "left";

export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface NormalizedPoint { x: number; y: number }

export interface CustomProductView {
  id: string;
  side: ProductSide;
  imageUrl: string;
  publicId?: string | null;
  naturalWidth: number;
  naturalHeight: number;
  isPlaceholder: boolean;
}

export interface CustomProductColour {
  id: string;
  name: string;
  slug: string;
  hexCode: string;
  additionalPrice: number;
  isDefault: boolean;
  isActive: boolean;
  displayOrder: number;
  views: CustomProductView[];
}

export interface CustomPrintArea {
  id: string;
  colourId?: string | null;
  side: ProductSide;
  referenceWidth: number;
  referenceHeight: number;
  x: number;
  y: number;
  width: number;
  height: number;
  xPercent?: number;
  yPercent?: number;
  widthPercent?: number;
  heightPercent?: number;
  defaultArea?: NormalizedRect;
  printingAreaMode: "fixed" | "customer_adjustable";
  safeBoundaryType: "rectangle" | "polygon" | "mask";
  garmentSafeArea: NormalizedRect;
  garmentSafePolygon: NormalizedPoint[];
  garmentMaskUrl?: string | null;
  safeAreaVersion: string;
  minWidthNormalized: number;
  minHeightNormalized: number;
  maxWidthNormalized: number;
  maxHeightNormalized: number;
  allowMove: boolean;
  allowResize: boolean;
  allowCustomAreaSelection: boolean;
  realWidthCm: number;
  realHeightCm: number;
  safeMargin: number;
  isActive: boolean;
}

export interface CustomPrintingMethod {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  minimumQuantity: number;
  baseCharge: number;
  chargePerSide: number;
  isActive: boolean;
}

export interface CustomProductSummary {
  id: string;
  categoryId: string;
  subcategoryId?: string | null;
  categoryName: string;
  subcategoryName?: string | null;
  name: string;
  slug: string;
  description?: string | null;
  specification?: string | null;
  basePrice: number;
  thumbnailUrl?: string | null;
  modelUrl?: string | null;
  viewerMode: "auto" | "real3d" | "image360";
  modelFormat?: "glb" | "gltf" | "obj" | null;
  modelScale: number;
  modelPosition: [number, number, number];
  modelRotation: [number, number, number];
  materialNames: string[];
  modelArtworkMappings: Partial<Record<ProductSide, {
    position: [number, number, number];
    rotation: [number, number, number];
    size: [number, number];
  }>>;
  defaultColourId?: string | null;
  isActive: boolean;
  isFeatured: boolean;
  isPlaceholder: boolean;
  displayOrder: number;
  colourCount: number;
}

export interface CustomProductConfiguration extends CustomProductSummary {
  colours: CustomProductColour[];
  sizes: Array<{ id: string; name: string; additionalPrice: number; isActive: boolean }>;
  printAreas: CustomPrintArea[];
  printingMethods: CustomPrintingMethod[];
}

export interface CustomPricingBreakdown {
  productName: string;
  printingMethod: string;
  quantity: number;
  usedSides: ProductSide[];
  baseProduct: number;
  additionalColour: number;
  printingBase: number;
  printingSides: number;
  quantityDiscount: number;
  taxes: number;
  delivery: number;
  total: number;
}

export interface CustomisedCartData {
  type: "CUSTOMISED_PRODUCT";
  customProductId: string;
  customColourId: string;
  productName: string;
  productSlug: string;
  colourSlug: string;
  colourName: string;
  size: string;
  quantity: number;
  printingMethodId: string;
  printingMethodName: string;
  usedSides: ProductSide[];
  canvasJson: Record<ProductSide, Record<string, unknown> | null>;
  previewUrls: Record<ProductSide, string | null>;
  originalArtworkUrls: string[];
  pricingBreakdown: CustomPricingBreakdown;
  customerNote: string;
  productImage: string;
  previewPlacement: { left: number; top: number; width: number; height: number };
  framePlacements?: Record<ProductSide, { xPercent: number; yPercent: number; widthPercent: number; heightPercent: number }>;
  printingAreas?: Record<ProductSide, NormalizedRect>;
  safeAreaVersions?: Record<ProductSide, string>;
  highResolutionFiles?: string[];
  dpiWarningStatus?: Record<ProductSide, "ok" | "warning" | "unknown">;
  physicalOutputDimensions?: Partial<Record<ProductSide, { widthCm: number; heightCm: number }>>;
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  selectedColor?: string;
  selectedSize?: string;
  quantity: number;
  customization?: CustomDesign;
  customisation?: CustomisedCartData;
  savedForLater?: boolean;
}

export interface WishlistItem {
  id: string;
  productId: string;
  createdAt: string;
}

export interface Coupon {
  code: string;
  description: string;
  discountType: "flat" | "percentage";
  value: number;
  minimumOrderValue: number;
}

export interface OrderItem {
  id: string;
  productId: string;
  variantId?: string | null;
  selectedColor?: string;
  selectedSize?: string;
  quantity: number;
  price: number;
  customization?: CustomDesign;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  invoiceNumber?: string;
  status: "Pending" | "Placed" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled" | "Returned";
  paymentStatus?: "Pending" | "Paid" | "Failed" | "Refunded";
  paymentMethod: string;
  trackingNumber?: string | null;
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  address: Address;
  items: OrderItem[];
  trackingSteps: string[];
}

export interface CorporateEnquiry {
  companyName: string;
  contactPerson: string;
  workEmail: string;
  phoneNumber: string;
  requiredProducts: string;
  estimatedQuantity: string;
  budgetRange: string;
  eventDate: string;
  deliveryCity: string;
  customisationRequirements: string;
  fileName?: string;
  message: string;
  consent: boolean;
}

export interface BulkEnquiry {
  name: string;
  company: string;
  email: string;
  phone: string;
  quantity: string;
  products: string;
  designSupport: string;
  timeline: string;
  uploadName?: string;
  message: string;
}

export interface SellerApplication {
  brandName: string;
  applicantName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pinCode: string;
  website: string;
  productsOfInterest: string;
  businessDescription: string;
}
