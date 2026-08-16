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
  printMethods: string[];
  images: string[];
  hoverImage: string;
  videoPlaceholder: string;
  description: string;
  colorOptions: string[];
  sizeOptions: string[];
  specifications: string[];
  printingCompatibility: string[];
  care: string[];
  delivery: string;
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
  layers: DesignLayer[];
}

export interface CartItem {
  id: string;
  productId: string;
  variantId: string;
  quantity: number;
  customization?: CustomDesign;
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
  variantId: string;
  quantity: number;
  price: number;
  customization?: CustomDesign;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: "Placed" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  paymentMethod: string;
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
