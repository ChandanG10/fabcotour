import {
  AlertTriangle,
  Archive,
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  BarChart3,
  CreditCard,
  FolderTree,
  Home,
  ImagePlus,
  LayoutDashboard,
  LoaderCircle,
  LogOut,
  MessageSquare,
  Package,
  Palette,
  Pencil,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Star,
  Trash2,
  Upload,
  Users
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "../../components/common/Ui";
import { adminService, customisationService } from "../../services/api";
import { ApiError } from "../../lib/http";
import { useAdminAuth } from "../AdminAuth";
import type { HomepagePayload, StoreCategory, StoreProduct } from "../../lib/storefront";
import { CustomisationAdminPanel } from "../components/CustomisationAdminPanel";

type DashboardSection =
  | "overview"
  | "products"
  | "customisation"
  | "categories"
  | "homepage"
  | "orders"
  | "customers"
  | "coupons"
  | "reviews"
  | "enquiries"
  | "profile";

type UploadedImage = {
  id?: string;
  imageUrl: string;
  publicId: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
  variantColor: string | null;
  variantSize: string | null;
  variantView: "front" | "back" | "left" | "right" | null;
  isVariantPrimary: boolean;
};

type EditableVariant = {
  id?: string;
  sku: string;
  color: string | null;
  colorHex: string | null;
  size: string | null;
  stock: number;
  priceAdjustment: number;
};

type ProductFormState = {
  id?: string;
  categoryId: string;
  subcategoryId: string;
  name: string;
  slug: string;
  sku: string;
  shortDescription: string;
  description: string;
  specifications: string;
  audience: "men" | "women" | "kids" | "unisex" | "business";
  price: string;
  originalPrice: string;
  gstPercent: string;
  stock: string;
  sizes: string;
  colors: string;
  fabric: string;
  fit: string;
  gsm: string;
  printingMethod: string;
  productType: string;
  material: string;
  dimensions: string;
  weight: string;
  careInstructions: string;
  shippingInformation: string;
  variantLabel: string;
  customProductId: string;
  seoTitle: string;
  seoMetaDescription: string;
  isBestseller: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isCustomisable: boolean;
  isArchived: boolean;
  isVisible: boolean;
  images: UploadedImage[];
  variants: EditableVariant[];
};

type CategoryFormState = {
  id?: string;
  parentId: string;
  name: string;
  slug: string;
  description: string;
  audience: "men" | "women" | "kids" | "unisex" | "business";
  imageUrl: string;
  imagePublicId: string;
  bannerUrl: string;
  bannerPublicId: string;
  showInNavbar: boolean;
  seoTitle: string;
  seoDescription: string;
  isVisible: boolean;
  displayOrder: string;
};

type CouponFormState = {
  id?: string;
  code: string;
  description: string;
  discountType: "flat" | "percentage";
  value: string;
  minimumOrderValue: string;
  maximumDiscount: string;
  startsAt: string;
  endsAt: string;
  usageLimit: string;
  isActive: boolean;
};

type QuickSubcategoryFormState = {
  name: string;
  slug: string;
};

type ConfirmState = {
  title: string;
  description: string;
  actionLabel?: string;
  onConfirm: () => Promise<void> | void;
  moveTargets?: StoreCategory[];
  onMove?: (targetId: string) => Promise<void> | void;
} | null;

const imageUploadAccept = ".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp";
const maxImageUploadBytes = 5 * 1024 * 1024;
const supportedImageMimeTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/x-webp"]);

function isSupportedImageFile(file: File) {
  const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name);
  const genericMimeType = !file.type || file.type === "application/octet-stream";
  return supportedExtension && (genericMimeType || supportedImageMimeTypes.has(file.type.toLowerCase()));
}

const sections: Array<{
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
  { id: "customisation", label: "Customisation", icon: Palette },
  { id: "categories", label: "Categories", icon: FolderTree },
  { id: "homepage", label: "Homepage", icon: Home },
  { id: "orders", label: "Orders", icon: ShoppingBag },
  { id: "customers", label: "Customers", icon: Users },
  { id: "coupons", label: "Coupons", icon: CreditCard },
  { id: "reviews", label: "Reviews", icon: Star },
  { id: "enquiries", label: "Enquiries", icon: MessageSquare },
  { id: "profile", label: "Profile", icon: Settings }
];

const defaultProductForm = (): ProductFormState => ({
  categoryId: "",
  subcategoryId: "",
  name: "",
  slug: "",
  sku: "",
  shortDescription: "",
  description: "",
  specifications: "",
  audience: "men",
  price: "",
  originalPrice: "",
  gstPercent: "0",
  stock: "0",
  sizes: "",
  colors: "",
  fabric: "",
  fit: "",
  gsm: "",
  printingMethod: "",
  productType: "",
  material: "",
  dimensions: "",
  weight: "",
  careInstructions: "",
  shippingInformation: "",
  variantLabel: "Size",
  customProductId: "",
  seoTitle: "",
  seoMetaDescription: "",
  isBestseller: false,
  isFeatured: false,
  isNewArrival: false,
  isCustomisable: true,
  isArchived: false,
  isVisible: true,
  images: [],
  variants: []
});

const defaultCategoryForm = (): CategoryFormState => ({
  parentId: "",
  name: "",
  slug: "",
  description: "",
  audience: "unisex",
  imageUrl: "",
  imagePublicId: "",
  bannerUrl: "",
  bannerPublicId: "",
  showInNavbar: true,
  seoTitle: "",
  seoDescription: "",
  isVisible: true,
  displayOrder: "0"
});

const defaultCouponForm = (): CouponFormState => ({
  code: "",
  description: "",
  discountType: "percentage",
  value: "",
  minimumOrderValue: "0",
  maximumDiscount: "",
  startsAt: "",
  endsAt: "",
  usageLimit: "",
  isActive: true
});

const defaultQuickSubcategoryForm = (): QuickSubcategoryFormState => ({
  name: "",
  slug: ""
});

const emptyHomepage = (): HomepagePayload => ({
  hero: {
    heading: "Wear Your Imagination.",
    description: "Custom apparel, standout prints and thoughtful corporate gifts—made uniquely yours.",
    primaryButtonLabel: "Start Customising",
    primaryButtonLink: "/customise",
    secondaryButtonLabel: "Shop New Arrivals",
    secondaryButtonLink: "/shop",
    badge: "DESIGNED BY YOU • MADE BY Fabpodd",
    images: [],
    imageUrl: null,
    imagePublicId: null
  },
  categoryCards: [],
  benefits: [],
  featuredSection: {
    title: "Featured Products",
    description: "Editor-curated picks",
    productIds: []
  },
  newArrivalsSection: {
    title: "New Arrivals",
    description: "Fresh drops",
    productIds: []
  },
  siteSettings: {
    siteName: "Fabpodd",
    announcementBar: {
      enabled: true,
      items: []
    },
    supportEmail: "",
    supportPhone: "",
    businessHours: "",
    socialLinks: {}
  }
});

function splitCommaLines(value: string) {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toSafeNumber(value: string, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalSafeNumber(value: string) {
  if (!value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toProductForm(product: StoreProduct): ProductFormState {
  return {
    id: product.id,
    categoryId: product.categoryId,
    subcategoryId: product.subcategoryId ?? "",
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    shortDescription: product.shortDescription ?? "",
    description: product.description ?? "",
    specifications: product.specifications.join("\n"),
    audience: product.audience,
    price: String(product.price),
    originalPrice: product.originalPrice == null ? "" : String(product.originalPrice),
    gstPercent: String(product.gstPercent),
    stock: String(product.stock),
    sizes: product.sizes.join(", "),
    colors: product.colors.join(", "),
    fabric: product.fabric ?? "",
    fit: product.fit ?? "",
    gsm: product.gsm ?? "",
    printingMethod: product.printingMethod ?? "",
    productType: product.productType ?? "",
    material: product.material ?? "",
    dimensions: product.dimensions ?? "",
    weight: product.weight ?? "",
    careInstructions: product.careInstructions ?? "",
    shippingInformation: product.shippingInformation ?? "",
    variantLabel: product.variantLabel ?? "Size",
    customProductId: product.customProductId ?? "",
    seoTitle: product.seoTitle ?? "",
    seoMetaDescription: product.seoMetaDescription ?? "",
    isBestseller: product.isBestseller,
    isFeatured: product.isFeatured,
    isNewArrival: product.isNewArrival,
    isCustomisable: product.isCustomisable,
    isArchived: product.isArchived,
    isVisible: product.isVisible,
    images: product.images.map((image) => ({
      id: image.id,
      imageUrl: image.imageUrl,
      publicId: image.publicId,
      altText: image.altText,
      sortOrder: image.sortOrder,
      isPrimary: image.isPrimary,
      variantColor: image.variantColor ?? null,
      variantSize: image.variantSize ?? null,
      variantView: image.variantView ?? null,
      isVariantPrimary: image.isVariantPrimary ?? false
    })),
    variants: product.variants
  };
}

function toCategoryForm(category: StoreCategory): CategoryFormState {
  return {
    id: category.id,
    parentId: category.parentId ?? "",
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    audience: category.audience,
    imageUrl: category.imageUrl ?? "",
    imagePublicId: category.imagePublicId ?? "",
    bannerUrl: category.bannerUrl ?? "",
    bannerPublicId: category.bannerPublicId ?? "",
    showInNavbar: category.showInNavbar,
    seoTitle: category.seoTitle ?? "",
    seoDescription: category.seoDescription ?? "",
    isVisible: category.isVisible,
    displayOrder: String(category.displayOrder)
  };
}

export default function AdminDashboardPage() {
  const { admin, loading, refresh, setAdmin } = useAdminAuth();
  const authFailureHandledRef = useRef(false);
  const skuSuggestionRequestRef = useRef(0);
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const [confirmMoveTarget, setConfirmMoveTarget] = useState("");

  const [dashboardData, setDashboardData] = useState<Awaited<ReturnType<typeof adminService.dashboard>> | null>(null);
  const [productsData, setProductsData] = useState<Awaited<ReturnType<typeof adminService.listProducts>> | null>(null);
  const [categoriesData, setCategoriesData] = useState<Awaited<ReturnType<typeof adminService.listCategories>> | null>(null);
  const [homepageData, setHomepageData] = useState<HomepagePayload | null>(null);
  const [ordersData, setOrdersData] = useState<Awaited<ReturnType<typeof adminService.listOrders>> | null>(null);
  const [customersData, setCustomersData] = useState<Awaited<ReturnType<typeof adminService.listCustomers>> | null>(null);
  const [couponsData, setCouponsData] = useState<Awaited<ReturnType<typeof adminService.listCoupons>> | null>(null);
  const [reviewsData, setReviewsData] = useState<Awaited<ReturnType<typeof adminService.listReviews>> | null>(null);
  const [corporateEnquiries, setCorporateEnquiries] = useState<Array<Record<string, unknown>>>([]);
  const [bulkEnquiries, setBulkEnquiries] = useState<Array<Record<string, unknown>>>([]);
  const [contactEnquiries, setContactEnquiries] = useState<Array<Record<string, unknown>>>([]);

  const [productSearch, setProductSearch] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState("");
  const [productSubcategoryFilter, setProductSubcategoryFilter] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm());
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm());
  const [couponForm, setCouponForm] = useState<CouponFormState>(defaultCouponForm());
  const [homepageForm, setHomepageForm] = useState<HomepagePayload>(emptyHomepage());
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [quickSubcategoryForm, setQuickSubcategoryForm] = useState<QuickSubcategoryFormState>(defaultQuickSubcategoryForm());
  const [skuGenerating, setSkuGenerating] = useState(false);
  const [customisationProducts, setCustomisationProducts] = useState<Awaited<ReturnType<typeof customisationService.getProducts>>>([]);

  const categories = useMemo(() => categoriesData?.items ?? [], [categoriesData?.items]);
  const parentCategoryOptions = useMemo(() => categories.filter((category) => !category.parentId), [categories]);
  const availableCategoryOptions = useMemo(
    () =>
      parentCategoryOptions.filter((category) =>
        category.isVisible && ["men", "women", "kids", "unisex", "business"].includes(category.audience)
      ),
    [parentCategoryOptions]
  );
  const subcategoryOptions = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parentId &&
          category.parentId === productForm.categoryId &&
          (category.isVisible || category.id === productForm.subcategoryId)
      ),
    [categories, productForm.categoryId, productForm.subcategoryId]
  );
  const selectedParentCategory = useMemo(
    () => availableCategoryOptions.find((category) => category.id === productForm.categoryId) ?? null,
    [availableCategoryOptions, productForm.categoryId]
  );
  const selectedSubcategory = useMemo(
    () => subcategoryOptions.find((category) => category.id === productForm.subcategoryId) ?? null,
    [subcategoryOptions, productForm.subcategoryId]
  );
  const productFilterSubcategories = useMemo(
    () => categories.filter((category) => category.parentId === productCategoryFilter),
    [categories, productCategoryFilter]
  );
  const storefrontRoute = selectedParentCategory ? `/shop/${selectedParentCategory.slug}` : "Select a category to assign the product";
  const storefrontPlacement = selectedParentCategory
    ? `${selectedParentCategory.name}${selectedSubcategory ? ` > ${selectedSubcategory.name}` : ""}`
    : "No category selected";

  const suggestProductSku = async (categoryId: string, subcategoryId = "") => {
    if (!categoryId) {
      skuSuggestionRequestRef.current += 1;
      setSkuGenerating(false);
      return;
    }

    const requestId = skuSuggestionRequestRef.current + 1;
    const productId = productForm.id;
    skuSuggestionRequestRef.current = requestId;
    setSkuGenerating(true);

    try {
      const response = await adminService.suggestProductSku(categoryId, subcategoryId);
      if (skuSuggestionRequestRef.current !== requestId) {
        return;
      }

      setProductForm((state) => {
        if (state.id !== productId || state.categoryId !== categoryId || state.subcategoryId !== subcategoryId) {
          return state;
        }
        return { ...state, sku: response.sku };
      });
    } catch (error) {
      if (skuSuggestionRequestRef.current === requestId) {
        toast.error(error instanceof Error ? error.message : "SKU could not be generated. You can enter one manually.");
      }
    } finally {
      if (skuSuggestionRequestRef.current === requestId) {
        setSkuGenerating(false);
      }
    }
  };

  const runAction = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  const handleAuthFailure = (error: unknown) => {
    if (!(error instanceof ApiError) || error.status !== 401) {
      return false;
    }

    if (!authFailureHandledRef.current) {
      authFailureHandledRef.current = true;
      setAdmin(null);
      toast.error("Admin session expired. Please sign in again.");
    }

    return true;
  };

  useEffect(() => {
    if (admin) {
      authFailureHandledRef.current = false;
      void customisationService.getProducts().then(setCustomisationProducts).catch(() => setCustomisationProducts([]));
    }
  }, [admin]);

  const loadDashboard = async () => {
    try {
      const data = await adminService.dashboard();
      setDashboardData(data);
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Dashboard could not be loaded.");
      }
    }
  };

  const loadProducts = async () => {
    try {
      const data = await adminService.listProducts(1, productSearch, productCategoryFilter, productSubcategoryFilter);
      setProductsData(data);
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Products could not be loaded.");
      }
    }
  };

  const loadCategories = async () => {
    try {
      const data = await adminService.listCategories(1);
      setCategoriesData(data);
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Categories could not be loaded.");
      }
    }
  };

  const loadHomepage = async () => {
    try {
      const data = await adminService.getHomepage();
      setHomepageData(data);
      setHomepageForm(data);
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Homepage content could not be loaded.");
      }
    }
  };

  const loadOrders = async () => {
    try {
      setOrdersData(await adminService.listOrders(1));
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Orders could not be loaded.");
      }
    }
  };

  const loadCustomers = async () => {
    try {
      setCustomersData(await adminService.listCustomers(1, customerSearch));
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Customers could not be loaded.");
      }
    }
  };

  const loadCoupons = async () => {
    try {
      setCouponsData(await adminService.listCoupons(1));
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Coupons could not be loaded.");
      }
    }
  };

  const loadReviews = async () => {
    try {
      setReviewsData(await adminService.listReviews(1));
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Reviews could not be loaded.");
      }
    }
  };

  const loadEnquiries = async () => {
    try {
      const [corporate, bulk, contact] = await Promise.all([
        adminService.listEnquiries("corporate"),
        adminService.listEnquiries("bulk"),
        adminService.listEnquiries("contact")
      ]);
      setCorporateEnquiries(corporate.items);
      setBulkEnquiries(bulk.items);
      setContactEnquiries(contact.items);
    } catch (error) {
      if (!handleAuthFailure(error)) {
        toast.error(error instanceof Error ? error.message : "Enquiries could not be loaded.");
      }
    }
  };

  useEffect(() => {
    if (loading || !admin) {
      return;
    }

    void loadDashboard();
    void loadCategories();
    void loadHomepage();
    void loadProducts();
    void loadOrders();
    void loadCustomers();
    void loadCoupons();
    void loadReviews();
    void loadEnquiries();
  // Loaders intentionally share the current authenticated dashboard state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [admin, loading]);

  const visibleProducts = productsData?.items ?? [];

  const sectionTitle = useMemo(() => sections.find((section) => section.id === activeSection)?.label ?? "Dashboard", [activeSection]);

  const handleImageUpload = async (files: FileList | null, onApply: (uploads: UploadedImage[]) => void) => {
    if (!files?.length) {
      return;
    }

    const selectedFiles = Array.from(files);
    if (selectedFiles.some((file) => !isSupportedImageFile(file))) {
      toast.error("Only valid JPG, PNG and WebP images can be uploaded.");
      return;
    }

    if (selectedFiles.some((file) => file.size > maxImageUploadBytes)) {
      toast.error("Each image must be 5 MB or smaller.");
      return;
    }

    try {
      await runAction("upload-images", async () => {
        const uploads = await adminService.uploadImages(selectedFiles);
        onApply(
          uploads.map((upload, index) => ({
            imageUrl: upload.url,
            publicId: upload.publicId,
            altText: null,
            sortOrder: index,
            isPrimary: false,
            variantColor: null,
            variantSize: null,
            variantView: null,
            isVariantPrimary: false
          }))
        );
        toast.success("Images uploaded.");
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    }
  };

  const updateProductImage = (imageIndex: number, patch: Partial<UploadedImage>) => {
    setProductForm((state) => {
      const current = state.images[imageIndex];
      if (!current) {
        return state;
      }

      const updated = { ...current, ...patch };
      if (!updated.variantColor) {
        updated.variantSize = null;
        updated.variantView = null;
        updated.isVariantPrimary = false;
      }

      const images = state.images.map((image, index) => index === imageIndex ? updated : image);
      if (updated.isVariantPrimary && updated.variantColor) {
        images.forEach((image, index) => {
          if (
            index !== imageIndex &&
            image.variantColor?.trim().toLowerCase() === updated.variantColor?.trim().toLowerCase()
          ) {
            images[index] = { ...image, isVariantPrimary: false };
          }
        });
      }

      return { ...state, images };
    });
  };

  const moveProductImage = async (imageIndex: number, direction: -1 | 1) => {
    const destination = imageIndex + direction;
    if (destination < 0 || destination >= productForm.images.length) return;
    const reordered = [...productForm.images];
    [reordered[imageIndex], reordered[destination]] = [reordered[destination], reordered[imageIndex]];
    const images = reordered.map((image, index) => ({ ...image, sortOrder: index }));
    setProductForm((state) => ({ ...state, images }));

    if (productForm.id && images.every((image) => image.id)) {
      await runAction("reorder-images", async () => {
        await adminService.reorderProductImages(productForm.id as string, images.map((image) => ({
          id: image.id as string,
          sortOrder: image.sortOrder,
          isPrimary: image.isPrimary
        })));
        toast.success("Image order saved.");
      });
    }
  };

  const updateProductVariant = (variantIndex: number, patch: Partial<EditableVariant>) => {
    setProductForm((state) => ({
      ...state,
      variants: state.variants.map((variant, index) => index === variantIndex ? { ...variant, ...patch } : variant)
    }));
  };

  const submitProduct = async () => {
    if (!productForm.categoryId) {
      toast.error("Choose a main category.");
      return;
    }
    if (["men", "women", "kids", "lifestyle"].includes(selectedParentCategory?.slug ?? "") && !productForm.subcategoryId) {
      toast.error("Choose a subcategory for this product.");
      return;
    }
    if (productForm.subcategoryId && !selectedSubcategory) {
      toast.error("The selected subcategory does not belong to this main category.");
      return;
    }
    const payload = {
      categoryId: productForm.categoryId,
      subcategoryId: productForm.subcategoryId || null,
      name: productForm.name,
      slug: productForm.slug || undefined,
      sku: productForm.sku,
      shortDescription: productForm.shortDescription || null,
      description: productForm.description || null,
      specifications: splitCommaLines(productForm.specifications),
      audience: productForm.audience,
      price: toSafeNumber(productForm.price, 0),
      originalPrice: toOptionalSafeNumber(productForm.originalPrice),
      gstPercent: toSafeNumber(productForm.gstPercent, 0),
      stock: Math.max(0, Math.trunc(toSafeNumber(productForm.stock, 0))),
      sizes: splitCommaLines(productForm.sizes),
      colors: splitCommaLines(productForm.colors),
      fabric: productForm.fabric || null,
      fit: productForm.fit || null,
      gsm: productForm.gsm || null,
      printingMethod: productForm.printingMethod || null,
      productType: productForm.productType || null,
      material: productForm.material || null,
      dimensions: productForm.dimensions || null,
      weight: productForm.weight || null,
      careInstructions: productForm.careInstructions || null,
      shippingInformation: productForm.shippingInformation || null,
      variantLabel: productForm.variantLabel || null,
      customProductId: productForm.customProductId || null,
      seoTitle: productForm.seoTitle || null,
      seoMetaDescription: productForm.seoMetaDescription || null,
      isBestseller: productForm.isBestseller,
      isFeatured: productForm.isFeatured,
      isNewArrival: productForm.isNewArrival,
      isCustomisable: productForm.isCustomisable,
      isArchived: productForm.isArchived,
      isVisible: productForm.isVisible,
      images: productForm.images.map((image, index) => ({
        id: image.id,
        imageUrl: image.imageUrl,
        publicId: image.publicId,
        altText: image.altText,
        sortOrder: Math.max(0, Math.trunc(index)),
        isPrimary: image.isPrimary,
        variantColor: image.variantColor,
        variantSize: image.variantSize,
        variantView: image.variantView,
        isVariantPrimary: image.isVariantPrimary
      })),
      variants: productForm.variants
    };

    try {
      await runAction("save-product", async () => {
        if (productForm.id) {
          await adminService.updateProduct(productForm.id, payload);
          toast.success("Product updated.");
        } else {
          await adminService.createProduct(payload);
          toast.success("Product created.");
        }

        setProductForm(defaultProductForm());
        await loadProducts();
        await loadDashboard();
      });
    } catch (error) {
      if (error instanceof ApiError && error.details && typeof error.details === "object") {
        const fieldErrors = (error.details as { fieldErrors?: Record<string, string[]> }).fieldErrors;
        const firstFieldMessage = fieldErrors
          ? Object.values(fieldErrors).flat().find(Boolean)
          : null;
        toast.error(firstFieldMessage ?? error.message);
        return;
      }

      toast.error(error instanceof Error ? error.message : "Product could not be saved.");
    }
  };

  const submitCategory = async () => {
    const payload = {
      parentId: categoryForm.parentId || null,
      name: categoryForm.name,
      slug: categoryForm.slug || undefined,
      description: categoryForm.description || null,
      audience: categoryForm.audience,
      imageUrl: categoryForm.imageUrl || null,
      imagePublicId: categoryForm.imagePublicId || null,
      bannerUrl: categoryForm.bannerUrl || null,
      bannerPublicId: categoryForm.bannerPublicId || null,
      showInNavbar: categoryForm.showInNavbar,
      seoTitle: categoryForm.seoTitle || null,
      seoDescription: categoryForm.seoDescription || null,
      isVisible: categoryForm.isVisible,
      displayOrder: Number(categoryForm.displayOrder || 0)
    };

    await runAction("save-category", async () => {
      if (categoryForm.id) {
        if (categoryForm.parentId) await adminService.updateSubcategory(categoryForm.id, payload);
        else await adminService.updateCategory(categoryForm.id, payload);
        toast.success("Category updated.");
      } else if (categoryForm.parentId) {
        await adminService.createSubcategory(categoryForm.parentId, payload);
        toast.success("Subcategory created.");
      } else {
        await adminService.createCategory(payload);
        toast.success("Category created.");
      }

      setCategoryForm(defaultCategoryForm());
      await loadCategories();
    });
  };

  const submitCoupon = async () => {
    const payload = {
      code: couponForm.code,
      description: couponForm.description || null,
      discountType: couponForm.discountType,
      value: Number(couponForm.value || 0),
      minimumOrderValue: Number(couponForm.minimumOrderValue || 0),
      maximumDiscount: couponForm.maximumDiscount ? Number(couponForm.maximumDiscount) : null,
      startsAt: couponForm.startsAt ? new Date(couponForm.startsAt).toISOString() : null,
      endsAt: couponForm.endsAt ? new Date(couponForm.endsAt).toISOString() : null,
      usageLimit: couponForm.usageLimit ? Number(couponForm.usageLimit) : null,
      isActive: couponForm.isActive
    };

    await runAction("save-coupon", async () => {
      if (couponForm.id) {
        await adminService.updateCoupon(couponForm.id, payload);
        toast.success("Coupon updated.");
      } else {
        await adminService.createCoupon(payload);
        toast.success("Coupon created.");
      }

      setCouponForm(defaultCouponForm());
      await loadCoupons();
    });
  };

  const createQuickSubcategory = async () => {
    if (!productForm.categoryId || !selectedParentCategory) {
      toast.error("Select a main category first.");
      return;
    }

    if (!quickSubcategoryForm.name.trim()) {
      toast.error("Enter a subcategory name.");
      return;
    }

    const fallbackSlug = quickSubcategoryForm.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    await runAction("create-subcategory", async () => {
      const response = await adminService.createSubcategory(selectedParentCategory.id, {
        name: quickSubcategoryForm.name.trim(),
        slug: quickSubcategoryForm.slug.trim() || fallbackSlug,
        description: `${selectedParentCategory.name} ${quickSubcategoryForm.name.trim()} category.`,
        audience: selectedParentCategory.audience,
        imageUrl: null,
        imagePublicId: null,
        isVisible: true,
        displayOrder: 0
      });

      const nextSubcategory = response.item as StoreCategory;
      setQuickSubcategoryForm(defaultQuickSubcategoryForm());
      await loadCategories();
      setProductForm((state) => ({
        ...state,
        subcategoryId: nextSubcategory.id
      }));
      void suggestProductSku(productForm.categoryId, nextSubcategory.id);
      toast.success("Subcategory created and selected.");
    });
  };

  const reorderSubcategory = async (subcategory: StoreCategory, direction: -1 | 1) => {
    if (!subcategory.parentId) return;
    const siblings = categories
      .filter((category) => category.parentId === subcategory.parentId)
      .sort((left, right) => left.displayOrder - right.displayOrder);
    const index = siblings.findIndex((category) => category.id === subcategory.id);
    const target = siblings[index + direction];
    if (!target) return;
    const reordered = [...siblings];
    reordered[index] = target;
    reordered[index + direction] = subcategory;
    await runAction("reorder-subcategories", async () => {
      await adminService.reorderSubcategories(
        reordered.map((category, nextIndex) => ({ id: category.id, displayOrder: (nextIndex + 1) * 10 }))
      );
      await loadCategories();
    });
  };

  const categoryPayload = (category: StoreCategory, overrides: Record<string, unknown> = {}) => ({
    parentId: category.parentId,
    name: category.name,
    slug: category.slug,
    description: category.description,
    audience: category.audience,
    imageUrl: category.imageUrl,
    imagePublicId: category.imagePublicId,
    bannerUrl: category.bannerUrl,
    bannerPublicId: category.bannerPublicId,
    showInNavbar: category.showInNavbar,
    seoTitle: category.seoTitle,
    seoDescription: category.seoDescription,
    isVisible: category.isVisible,
    displayOrder: category.displayOrder,
    ...overrides
  });

  const reorderMainCategory = async (category: StoreCategory, direction: -1 | 1) => {
    const parents = [...parentCategoryOptions].sort((left, right) => left.displayOrder - right.displayOrder);
    const index = parents.findIndex((item) => item.id === category.id);
    const target = parents[index + direction];
    if (!target) return;
    parents[index] = target;
    parents[index + direction] = category;
    await runAction("reorder-main-categories", async () => {
      await Promise.all(parents.map((item, nextIndex) =>
        adminService.updateCategory(item.id, categoryPayload(item, { displayOrder: (nextIndex + 1) * 10 }))
      ));
      await loadCategories();
    });
  };

  const submitHomepage = async () => {
    const heroImages = homepageForm.hero.images
      .filter((image) => image.imageUrl)
      .map((image, index) => ({
        ...image,
        sortOrder: index
      }));
    const primaryHeroImage = heroImages[0] ?? null;

    await runAction("save-homepage", async () => {
      await adminService.updateHomepage({
        hero: {
          ...homepageForm.hero,
          images: heroImages,
          imageUrl: primaryHeroImage?.imageUrl ?? null,
          imagePublicId: primaryHeroImage?.imagePublicId ?? null
        },
        categoryCards: homepageForm.categoryCards,
        benefits: homepageForm.benefits,
        featuredSection: homepageForm.featuredSection,
        newArrivalsSection: homepageForm.newArrivalsSection
      });
      await adminService.updateSiteSettings(homepageForm.siteSettings);
      toast.success("Homepage content updated.");
      await loadHomepage();
    });
  };

  const submitPasswordChange = async () => {
    await runAction("change-password", async () => {
      await adminService.changePassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "" });
      toast.success("Password changed.");
      await refresh();
    });
  };

  const logout = async () => {
    await runAction("logout", async () => {
      await adminService.logout();
      setAdmin(null);
      toast.success("Logged out.");
    });
  };

  const applyConfirm = async () => {
    if (!confirmState) {
      return;
    }
    try {
      await confirmState.onConfirm();
    } finally {
      setConfirmState(null);
    }
  };

  useEffect(() => {
    if (!sidebarOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-[#f5efe4] text-brand-black">
      <div className="flex min-h-screen">
        {sidebarOpen ? (
          <button
            type="button"
            aria-label="Close administration navigation"
            className="fixed inset-0 z-[35] bg-black/45 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        ) : null}
        <aside className={`fixed inset-y-0 left-0 z-40 flex w-[min(280px,calc(100vw-24px))] flex-col overflow-y-auto border-r border-black/8 bg-[#0b0b0b] px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-[max(1.5rem,env(safe-area-inset-top))] text-white transition-transform ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:w-[280px] lg:translate-x-0`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ffc928]">Fabpodd</p>
              <h1 className="mt-2 font-heading text-2xl font-extrabold">Admin Panel</h1>
            </div>
            <button type="button" aria-label="Close navigation" className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-white/10 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>
          <nav className="mt-8 flex-1 space-y-2">
            {sections.map((section) => {
              const Icon = section.icon;
              const active = section.id === activeSection;
              return (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => {
                    setActiveSection(section.id);
                    setSidebarOpen(false);
                  }}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${active ? "bg-[#ffc928] text-brand-black" : "text-white/70 hover:bg-white/8 hover:text-white"}`}
                >
                  <Icon className="h-4 w-4" />
                  {section.label}
                </button>
              );
            })}
          </nav>
          <div className="mt-8 rounded-[24px] border border-white/10 bg-white/5 p-4 text-sm text-white/68">
            <p className="font-semibold text-white">{admin?.firstName} {admin?.lastName}</p>
            <p className="mt-1">{admin?.email}</p>
            {admin?.mustChangePassword ? (
              <p className="mt-3 inline-flex rounded-full bg-[#ffc928] px-3 py-1 text-xs font-semibold text-brand-black">
                Password change required
              </p>
            ) : null}
          </div>
        </aside>

        <div className="min-w-0 flex-1 lg:pl-[280px]">
          <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f7f2e8]/90 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex min-w-0 items-center gap-3">
                <button type="button" aria-label="Open navigation" className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full border border-black/10 bg-white lg:hidden" onClick={() => setSidebarOpen(true)}>
                  <LayoutDashboard className="h-4 w-4" />
                </button>
                <div className="min-w-0">
                  <p className="hidden text-xs font-semibold uppercase tracking-[0.28em] text-brand-black/45 sm:block">Administration</p>
                  <h2 className="truncate font-heading text-xl font-extrabold sm:text-2xl">{sectionTitle}</h2>
                </div>
              </div>
              <button type="button" aria-label="Logout" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-3 text-sm font-semibold sm:px-4" onClick={() => void logout()}>
                {busy === "logout" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                <span className="hidden min-[380px]:inline">Logout</span>
              </button>
            </div>
            <div className="border-t border-black/8 px-4 py-3 sm:px-6 lg:hidden">
              <select
                value={activeSection}
                onChange={(event) => setActiveSection(event.target.value as DashboardSection)}
                className="min-h-11 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm font-semibold outline-none"
              >
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
          </header>

          <main className="min-w-0 overflow-x-clip px-3 py-5 sm:px-6 sm:py-6 lg:px-8">
            {activeSection === "overview" ? (
              <div className="space-y-6">
                {!dashboardData ? <LoadingState label="Loading dashboard" /> : (
                  <>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <MetricCard label="Products" value={dashboardData.stats.products} icon={Package} />
                      <MetricCard label="Orders" value={dashboardData.stats.orders} icon={ShoppingBag} />
                      <MetricCard label="Customers" value={dashboardData.stats.customers} icon={Users} />
                      <MetricCard label="Revenue" value={`₹${dashboardData.stats.revenue.toLocaleString("en-IN")}`} icon={BarChart3} />
                    </div>
                    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
                      <Panel title="Recent Orders" description="Latest customer checkouts and status tracking.">
                        <SimpleTable
                          columns={["Order", "Customer", "Status", "Total"]}
                          rows={dashboardData.recentOrders.map((order) => [
                            String(order.order_number ?? "—"),
                            String(order.customer_name ?? "—"),
                            String(order.status ?? "—"),
                            `₹${Number(order.total_amount ?? 0).toLocaleString("en-IN")}`
                          ])}
                        />
                      </Panel>
                      <Panel title="Low Stock Products" description="Products that need replenishment or archiving.">
                        <SimpleTable
                          columns={["Product", "SKU", "Stock"]}
                          rows={dashboardData.lowStockProducts.map((product) => [
                            String(product.name ?? "—"),
                            String(product.sku ?? "—"),
                            String(product.stock ?? "0")
                          ])}
                        />
                      </Panel>
                    </div>
                    <Panel title="Sales Trend" description="Monthly revenue snapshot from the orders table.">
                      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        {dashboardData.salesChart.map((point) => (
                          <div key={String(point.month)} className="rounded-[22px] border border-black/8 bg-white p-4">
                            <p className="text-sm font-semibold text-brand-black">{String(point.month)}</p>
                            <p className="mt-2 text-2xl font-extrabold">₹{Number(point.revenue ?? 0).toLocaleString("en-IN")}</p>
                          </div>
                        ))}
                      </div>
                    </Panel>
                  </>
                )}
              </div>
            ) : null}

            {activeSection === "products" ? (
              <div className="grid min-w-0 items-start gap-6 min-[1800px]:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
                <Panel title="Product Catalogue" description="Create, edit, archive and remove storefront products.">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                    <div className="flex min-h-11 min-w-0 flex-1 items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3">
                      <Search className="h-4 w-4 text-brand-black/40" />
                      <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} className="min-w-0 w-full border-0 bg-transparent outline-none" placeholder="Search by name or SKU" />
                    </div>
                    <button type="button" className="min-h-11 rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void loadProducts()}>
                      Search
                    </button>
                  </div>
                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <select
                      value={productCategoryFilter}
                      onChange={(event) => {
                        setProductCategoryFilter(event.target.value);
                        setProductSubcategoryFilter("");
                      }}
                      className={inputClass}
                      aria-label="Filter by main category"
                    >
                      <option value="">All main categories</option>
                      {parentCategoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                    <select value={productSubcategoryFilter} onChange={(event) => setProductSubcategoryFilter(event.target.value)} className={inputClass} disabled={!productCategoryFilter} aria-label="Filter by subcategory">
                      <option value="">All subcategories</option>
                      {productFilterSubcategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-4 md:hidden">
                    {visibleProducts.map((product) => (
                      <div key={product.id} className="rounded-[24px] border border-black/8 bg-white p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="break-words text-lg font-semibold leading-tight">{product.name}</div>
                            <div className="mt-1 break-all text-xs text-brand-black/52">{product.sku}</div>
                          </div>
                          <div className="shrink-0 rounded-full bg-[#f8f1e3] px-3 py-1 text-xs font-semibold capitalize">
                            {product.audience}
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                          <div className="col-span-2 rounded-2xl bg-[#f8f1e3] px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-black/45">Placement</p>
                            <p className="mt-1 font-semibold">{categories.find((item) => item.id === product.categoryId)?.name ?? "Unassigned"} · {categories.find((item) => item.id === product.subcategoryId)?.name ?? "Needs review"}</p>
                          </div>
                          <div className="rounded-2xl bg-[#f8f1e3] px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-black/45">Price</p>
                            <p className="mt-1 font-semibold">₹{Number(product.price).toLocaleString("en-IN")}</p>
                          </div>
                          <div className="rounded-2xl bg-[#f8f1e3] px-3 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-brand-black/45">Stock</p>
                            <p className="mt-1 font-semibold">{product.stock}</p>
                          </div>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          {product.isFeatured ? <FlagPill label="Featured" /> : null}
                          {product.isNewArrival ? <FlagPill label="New" /> : null}
                          {product.isBestseller ? <FlagPill label="Bestseller" /> : null}
                          {product.isArchived ? <FlagPill label="Archived" tone="dark" /> : null}
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold"
                            onClick={() => setProductForm(toProductForm(product))}
                          >
                            <Pencil className="h-4 w-4" />
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-black/10 bg-white px-4 py-3 text-sm font-semibold"
                            onClick={() =>
                              void runAction("archive-product", async () => {
                                await adminService.archiveProduct(product.id, !product.isArchived);
                                await loadProducts();
                              })
                            }
                          >
                            <Archive className="h-4 w-4" />
                            {product.isArchived ? "Unarchive" : "Archive"}
                          </button>
                          <button
                            type="button"
                            className="inline-flex items-center justify-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 sm:col-span-2"
                            onClick={() =>
                              setConfirmState({
                                title: "Delete product",
                                description: `This removes ${product.name} from the storefront and soft-deletes its record.`,
                                onConfirm: async () => {
                                  await adminService.deleteProduct(product.id);
                                  toast.success("Product deleted.");
                                  await loadProducts();
                                  await loadDashboard();
                                }
                              })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden min-w-0 overflow-hidden rounded-[24px] border border-black/8 bg-white md:block">
                    <div className="overflow-x-auto">
                      <table className="min-w-[760px] text-left text-sm">
                        <thead className="bg-[#f8f1e3] text-brand-black/68">
                          <tr>
                            {["Product", "Main Category", "Subcategory", "Price", "Stock", "Flags", "Actions"].map((heading) => (
                              <th key={heading} className="px-4 py-3 font-semibold">{heading}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {visibleProducts.map((product) => (
                            <tr key={product.id} className="border-t border-black/6">
                              <td className="px-4 py-3">
                                <div className="font-semibold">{product.name}</div>
                                <div className="text-xs text-brand-black/52">{product.sku}</div>
                              </td>
                              <td className="px-4 py-3">{categories.find((item) => item.id === product.categoryId)?.name ?? "—"}</td>
                              <td className="px-4 py-3">{categories.find((item) => item.id === product.subcategoryId)?.name ?? <span className="text-amber-700">Needs review</span>}</td>
                              <td className="px-4 py-3">₹{Number(product.price).toLocaleString("en-IN")}</td>
                              <td className="px-4 py-3">{product.stock}</td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2 text-xs">
                                  {product.isFeatured ? <FlagPill label="Featured" /> : null}
                                  {product.isNewArrival ? <FlagPill label="New" /> : null}
                                  {product.isBestseller ? <FlagPill label="Bestseller" /> : null}
                                  {product.isArchived ? <FlagPill label="Archived" tone="dark" /> : null}
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap gap-2">
                                  <IconButton icon={Pencil} label="Edit" onClick={() => setProductForm(toProductForm(product))} />
                                  <IconButton
                                    icon={Archive}
                                    label={product.isArchived ? "Unarchive" : "Archive"}
                                    onClick={() => void runAction("archive-product", async () => {
                                      await adminService.archiveProduct(product.id, !product.isArchived);
                                      await loadProducts();
                                    })}
                                  />
                                  <IconButton
                                    icon={Trash2}
                                    label="Delete"
                                    onClick={() =>
                                      setConfirmState({
                                        title: "Delete product",
                                        description: `This removes ${product.name} from the storefront and soft-deletes its record.`,
                                        onConfirm: async () => {
                                          await adminService.deleteProduct(product.id);
                                          toast.success("Product deleted.");
                                          await loadProducts();
                                          await loadDashboard();
                                        }
                                      })
                                    }
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </Panel>

                <Panel title={productForm.id ? "Edit Product" : "Create Product"} description="Cloudinary uploads are attached here and flow straight to the storefront API.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Name"><input value={productForm.name} onChange={(event) => setProductForm((state) => ({ ...state, name: event.target.value }))} className={inputClass} /></Field>
                    <Field
                      label="SKU"
                      hint={skuGenerating ? "Generating from your selection..." : "Generated from category and subcategory. You can edit it."}
                    >
                      <input
                        value={productForm.sku}
                        onChange={(event) => setProductForm((state) => ({ ...state, sku: event.target.value.toUpperCase() }))}
                        className={inputClass}
                        placeholder="Select a category to generate"
                        aria-busy={skuGenerating}
                      />
                    </Field>
                    <Field label="Slug"><input value={productForm.slug} onChange={(event) => setProductForm((state) => ({ ...state, slug: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Audience">
                      <select
                        value={productForm.audience}
                        onChange={(event) =>
                          setProductForm((state) => ({
                            ...state,
                            audience: event.target.value as ProductFormState["audience"],
                            categoryId: "",
                            subcategoryId: ""
                          }))
                        }
                        className={inputClass}
                      >
                        {["men", "women", "kids", "unisex", "business"].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                    <div className="md:col-span-2 rounded-[24px] border border-black/8 bg-white px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <Field label="Main Category *">
                          <select
                            value={productForm.categoryId}
                            onChange={(event) => {
                              const nextCategoryId = event.target.value;
                              const selectedCategory = availableCategoryOptions.find((category) => category.id === nextCategoryId);
                              setProductForm((state) => ({
                                ...state,
                                categoryId: nextCategoryId,
                                subcategoryId: "",
                                audience: selectedCategory?.audience ?? state.audience
                              }));
                              setQuickSubcategoryForm(defaultQuickSubcategoryForm());
                              void suggestProductSku(nextCategoryId);
                            }}
                            className={inputClass}
                          >
                            <option value="">
                              {availableCategoryOptions.length ? "Select category" : "Create categories in Categories tab first"}
                            </option>
                            {availableCategoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </Field>
                        <Field label="Subcategory *">
                          <select
                            value={productForm.subcategoryId}
                            onChange={(event) => {
                              const nextSubcategoryId = event.target.value;
                              setProductForm((state) => ({ ...state, subcategoryId: nextSubcategoryId }));
                              void suggestProductSku(productForm.categoryId, nextSubcategoryId);
                            }}
                            className={inputClass}
                            disabled={!productForm.categoryId}
                          >
                            <option value="">
                              {productForm.categoryId ? "Select subcategory" : "Select main category first"}
                            </option>
                            {subcategoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </Field>
                      </div>

                      <div className="mt-4 grid gap-3 md:grid-cols-2">
                        <div className="rounded-[20px] border border-dashed border-black/10 bg-[#f8f1e3] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-black/45">Navbar destination</p>
                          <p className="mt-2 text-sm font-semibold text-brand-black">{storefrontPlacement}</p>
                          <p className="mt-1 text-sm text-brand-black/58">This product will appear under the `{storefrontRoute}` navigation page.</p>
                        </div>
                        <div className="rounded-[20px] border border-dashed border-black/10 bg-[#f8f1e3] px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-black/45">Filter mapping</p>
                          <p className="mt-2 text-sm font-semibold text-brand-black">Category/Subcategory controls the shop page bucket.</p>
                          <p className="mt-1 text-sm text-brand-black/58">Sizes, colours, fabric, fit, print method and customisable all feed the customer-side Refine results filters.</p>
                        </div>
                      </div>

                      <div className="mt-4 rounded-[20px] border border-black/8 bg-[#fffaf0] px-4 py-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-sm font-semibold">Create subcategory here</h4>
                            <p className="mt-1 text-sm text-brand-black/58">If the needed subcategory is missing, create it under the selected main category without leaving this form.</p>
                          </div>
                          <span className="rounded-full bg-brand-black px-3 py-1 text-xs font-semibold text-white">
                            {selectedParentCategory ? selectedParentCategory.name : "Select category first"}
                          </span>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_1fr_auto]">
                          <Field label="Subcategory Name">
                            <input
                              value={quickSubcategoryForm.name}
                              onChange={(event) => setQuickSubcategoryForm((state) => ({ ...state, name: event.target.value }))}
                              placeholder="Example: Oversized T-Shirts"
                              className={inputClass}
                              disabled={!productForm.categoryId}
                            />
                          </Field>
                          <Field label="Slug (optional)">
                            <input
                              value={quickSubcategoryForm.slug}
                              onChange={(event) => setQuickSubcategoryForm((state) => ({ ...state, slug: event.target.value }))}
                              placeholder="men-oversized-t-shirts"
                              className={inputClass}
                              disabled={!productForm.categoryId}
                            />
                          </Field>
                          <div className="flex items-end">
                            <button
                              type="button"
                              className="w-full rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => void createQuickSubcategory()}
                              disabled={!productForm.categoryId || busy === "create-subcategory"}
                            >
                              {busy === "create-subcategory" ? "Creating..." : "Create Subcategory"}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <Field label="Price"><input value={productForm.price} onChange={(event) => setProductForm((state) => ({ ...state, price: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Original Price"><input value={productForm.originalPrice} onChange={(event) => setProductForm((state) => ({ ...state, originalPrice: event.target.value }))} className={inputClass} /></Field>
                    <Field label="GST %"><input value={productForm.gstPercent} onChange={(event) => setProductForm((state) => ({ ...state, gstPercent: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Stock"><input value={productForm.stock} onChange={(event) => setProductForm((state) => ({ ...state, stock: event.target.value }))} className={inputClass} /></Field>
                    <div className="md:col-span-2 rounded-[24px] border border-black/8 bg-white px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold">Refine results fields</h4>
                          <p className="mt-1 text-sm text-brand-black/58">These values appear on the storefront filter panel, so enter them exactly how shoppers should refine products.</p>
                        </div>
                        <span className="rounded-full bg-[#f8f1e3] px-3 py-1 text-xs font-semibold text-brand-black">Storefront filters</span>
                      </div>
                      <div className="mt-4 grid gap-4 md:grid-cols-2">
                        <Field label={selectedParentCategory?.slug === "lifestyle" ? "Sizes, capacities or models" : "Sizes"}><input value={productForm.sizes} onChange={(event) => setProductForm((state) => ({ ...state, sizes: event.target.value }))} placeholder={selectedParentCategory?.slug === "lifestyle" ? "500 ml, 750 ml or A5, A4" : "S, M, L, XL"} className={inputClass} /></Field>
                        <Field label="Colours"><input value={productForm.colors} onChange={(event) => setProductForm((state) => ({ ...state, colors: event.target.value }))} placeholder="Black, White, Cream" className={inputClass} /></Field>
                        <Field label="Fabric"><input value={productForm.fabric} onChange={(event) => setProductForm((state) => ({ ...state, fabric: event.target.value }))} placeholder="Cotton, Terry, Linen" className={inputClass} /></Field>
                        <Field label="Fit"><input value={productForm.fit} onChange={(event) => setProductForm((state) => ({ ...state, fit: event.target.value }))} placeholder="Oversized, Regular, Relaxed" className={inputClass} /></Field>
                        <Field label="Printing Method"><input value={productForm.printingMethod} onChange={(event) => setProductForm((state) => ({ ...state, printingMethod: event.target.value }))} placeholder="DTF, Screen Print, Embroidery" className={inputClass} /></Field>
                        <Field label="GSM"><input value={productForm.gsm} onChange={(event) => setProductForm((state) => ({ ...state, gsm: event.target.value }))} placeholder="180, 220" className={inputClass} /></Field>
                      </div>
                    </div>
                    {selectedParentCategory?.slug === "lifestyle" ? (
                      <div className="md:col-span-2 rounded-[24px] border border-black/8 bg-white px-4 py-4">
                        <h4 className="text-sm font-semibold">Lifestyle product details</h4>
                        <p className="mt-1 text-sm text-brand-black/58">Use the variant label for the selector customers see, such as Capacity, Model or Notebook size. Link an existing Customisation product to open its configured mockups and print areas.</p>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <Field label="Product type"><input value={productForm.productType} onChange={(event) => setProductForm((state) => ({ ...state, productType: event.target.value }))} placeholder="Ceramic Mug" className={inputClass} /></Field>
                          <Field label="Variant label"><input value={productForm.variantLabel} onChange={(event) => setProductForm((state) => ({ ...state, variantLabel: event.target.value }))} placeholder="Capacity" className={inputClass} /></Field>
                          <Field label="Material"><input value={productForm.material} onChange={(event) => setProductForm((state) => ({ ...state, material: event.target.value }))} placeholder="Glazed ceramic" className={inputClass} /></Field>
                          <Field label="Dimensions"><input value={productForm.dimensions} onChange={(event) => setProductForm((state) => ({ ...state, dimensions: event.target.value }))} placeholder="9 × 8 cm" className={inputClass} /></Field>
                          <Field label="Weight"><input value={productForm.weight} onChange={(event) => setProductForm((state) => ({ ...state, weight: event.target.value }))} placeholder="320 g" className={inputClass} /></Field>
                          <Field label="Customisation product"><select value={productForm.customProductId} onChange={(event) => setProductForm((state) => ({ ...state, customProductId: event.target.value }))} className={inputClass}><option value="">Not linked</option>{customisationProducts.map((product) => <option key={product.id} value={product.id}>{product.name} · {product.categoryName}</option>)}</select></Field>
                          <Field label="Care instructions"><textarea value={productForm.careInstructions} onChange={(event) => setProductForm((state) => ({ ...state, careInstructions: event.target.value }))} rows={3} className={textareaClass} /></Field>
                          <Field label="Shipping information"><textarea value={productForm.shippingInformation} onChange={(event) => setProductForm((state) => ({ ...state, shippingInformation: event.target.value }))} rows={3} className={textareaClass} /></Field>
                        </div>
                      </div>
                    ) : null}
                    <div className="md:col-span-2">
                      <Field label="Short Description"><textarea value={productForm.shortDescription} onChange={(event) => setProductForm((state) => ({ ...state, shortDescription: event.target.value }))} rows={2} className={textareaClass} /></Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Description"><textarea value={productForm.description} onChange={(event) => setProductForm((state) => ({ ...state, description: event.target.value }))} rows={4} className={textareaClass} /></Field>
                    </div>
                    <div className="md:col-span-2">
                      <Field label="Specifications"><textarea value={productForm.specifications} onChange={(event) => setProductForm((state) => ({ ...state, specifications: event.target.value }))} rows={4} className={textareaClass} placeholder="One spec per line" /></Field>
                    </div>
                    <Field label="SEO Title"><input value={productForm.seoTitle} onChange={(event) => setProductForm((state) => ({ ...state, seoTitle: event.target.value }))} className={inputClass} /></Field>
                    <Field label="SEO Meta Description"><input value={productForm.seoMetaDescription} onChange={(event) => setProductForm((state) => ({ ...state, seoMetaDescription: event.target.value }))} className={inputClass} /></Field>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-3">
                    {[
                      ["Bestseller", "isBestseller"],
                      ["Featured", "isFeatured"],
                      ["New Arrival", "isNewArrival"],
                      ["Customisable", "isCustomisable"],
                      ["Archived", "isArchived"],
                      ["Visible", "isVisible"]
                    ].map(([label, key]) => (
                      <label key={key} className="flex min-h-11 items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={Boolean(productForm[key as keyof ProductFormState])}
                          onChange={(event) =>
                            setProductForm((state) => ({ ...state, [key]: event.target.checked }))
                          }
                        />
                        {label}
                      </label>
                    ))}
                  </div>

                  <div className="mt-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold">Gallery Images</h3>
                        <p className="text-sm text-brand-black/58">Upload JPG, PNG or WebP images. Set a storefront primary and optionally assign each image to a colour, size and view.</p>
                      </div>
                      <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">
                        <Upload className="h-4 w-4" />
                        Upload
                        <input
                          type="file"
                          accept={imageUploadAccept}
                          multiple
                          className="hidden"
                          onChange={(event) =>
                            void handleImageUpload(event.target.files, (uploads) =>
                              setProductForm((state) => ({
                                ...state,
                                images: [
                                  ...state.images,
                                  ...uploads.map((upload, index) => ({
                                    ...upload,
                                    sortOrder: state.images.length + index,
                                    isPrimary: state.images.length === 0 && index === 0
                                  }))
                                ]
                              }))
                            )
                          }
                        />
                      </label>
                    </div>
                    <div className="mt-4 grid min-w-0 gap-3 sm:grid-cols-2">
                      {productForm.images.map((image, index) => (
                        <div key={`${image.publicId}-${index}`} className="min-w-0 overflow-hidden rounded-[22px] border border-black/8 bg-white p-3">
                          <img src={image.imageUrl} alt={`Upload ${index + 1}`} className="aspect-[4/3] w-full rounded-[18px] object-cover" />
                          <div className="mt-3 grid min-w-0 gap-3">
                            <label className="flex min-h-11 min-w-0 items-center gap-2 text-xs font-semibold">
                              <input
                                type="radio"
                                name="primary-image"
                                checked={image.isPrimary}
                                onChange={() =>
                                  setProductForm((state) => ({
                                    ...state,
                                    images: state.images.map((entry, entryIndex) => ({
                                      ...entry,
                                      isPrimary: entryIndex === index
                                    }))
                                  }))
                                }
                              />
                              Storefront primary
                            </label>
                            <Field label="Image alt text" hint="Used by screen readers and search engines">
                              <input value={image.altText ?? ""} onChange={(event) => updateProductImage(index, { altText: event.target.value || null })} placeholder={productForm.name || "Describe this product image"} className={inputClass} />
                            </Field>
                            <div className="grid min-w-0 grid-cols-3 gap-2">
                              <IconButton
                                icon={ArrowUp}
                                label="Earlier"
                                className="w-full justify-center"
                                disabled={index === 0 || busy === "reorder-images"}
                                onClick={() => void moveProductImage(index, -1)}
                              />
                              <IconButton
                                icon={ArrowDown}
                                label="Later"
                                className="w-full justify-center"
                                disabled={index === productForm.images.length - 1 || busy === "reorder-images"}
                                onClick={() => void moveProductImage(index, 1)}
                              />
                              <IconButton
                                icon={Trash2}
                                label="Remove"
                                className="w-full justify-center"
                                onClick={() =>
                                  void runAction("remove-image", async () => {
                                    if (productForm.id && image.id) {
                                      await adminService.deleteProductImage(productForm.id, image.id);
                                    }
                                    setProductForm((state) => ({
                                      ...state,
                                      images: state.images.filter((_, entryIndex) => entryIndex !== index).map((entry, entryIndex, remaining) => ({
                                        ...entry,
                                        sortOrder: entryIndex,
                                        isPrimary: entry.isPrimary || (!remaining.some((candidate) => candidate.isPrimary) && entryIndex === 0)
                                      }))
                                    }));
                                  })
                                }
                              />
                            </div>
                          </div>
                          <details className="mt-3 rounded-[18px] border border-black/8 bg-brand-offwhite p-3">
                            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold">Assign Variant</summary>
                            <div className="mt-3 grid gap-3">
                              <label className="space-y-1.5 text-xs font-semibold">
                                <span>Colour</span>
                                <select
                                  value={image.variantColor ?? ""}
                                  onChange={(event) =>
                                    updateProductImage(index, {
                                      variantColor: event.target.value || null,
                                      variantView: event.target.value ? image.variantView ?? "front" : null
                                    })
                                  }
                                  className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none"
                                >
                                  <option value="">Unassigned</option>
                                  {Array.from(new Set([
                                    ...splitCommaLines(productForm.colors),
                                    ...(image.variantColor ? [image.variantColor] : [])
                                  ])).map((color) => (
                                    <option key={color} value={color}>{color}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1.5 text-xs font-semibold">
                                <span>Size</span>
                                <select
                                  value={image.variantSize ?? ""}
                                  disabled={!image.variantColor}
                                  onChange={(event) => updateProductImage(index, { variantSize: event.target.value || null })}
                                  className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                                >
                                  <option value="">All Sizes</option>
                                  {Array.from(new Set([
                                    ...splitCommaLines(productForm.sizes),
                                    ...(image.variantSize ? [image.variantSize] : [])
                                  ])).map((size) => (
                                    <option key={size} value={size}>{size}</option>
                                  ))}
                                </select>
                              </label>
                              <label className="space-y-1.5 text-xs font-semibold">
                                <span>View</span>
                                <select
                                  value={image.variantView ?? ""}
                                  disabled={!image.variantColor}
                                  onChange={(event) => updateProductImage(index, {
                                    variantView: (event.target.value || null) as UploadedImage["variantView"]
                                  })}
                                  className="min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm outline-none disabled:opacity-50"
                                >
                                  <option value="">Select view</option>
                                  <option value="front">Front</option>
                                  <option value="back">Back</option>
                                  <option value="left">Left</option>
                                  <option value="right">Right</option>
                                </select>
                              </label>
                              <label className="flex min-h-11 items-center gap-2 self-end rounded-xl border border-black/8 bg-white px-3 py-2.5 text-xs font-semibold">
                                <input
                                  type="checkbox"
                                  disabled={!image.variantColor}
                                  checked={image.isVariantPrimary}
                                  onChange={(event) => updateProductImage(index, { isVariantPrimary: event.target.checked })}
                                />
                                Primary image for this colour
                              </label>
                            </div>
                          </details>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 rounded-[24px] border border-black/8 bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Inventory variants</h3>
                        <p className="mt-1 text-sm text-brand-black/58">Every saved variant field is editable here: SKU, colour, colour code, {selectedParentCategory?.slug === "lifestyle" ? "capacity/model" : "size"}, stock and price adjustment.</p>
                      </div>
                      <button
                        type="button"
                        className="inline-flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2 text-sm font-semibold"
                        onClick={() => setProductForm((state) => ({
                          ...state,
                          variants: [...state.variants, {
                            id: crypto.randomUUID(),
                            sku: `${state.sku || "PRODUCT"}-VAR-${state.variants.length + 1}`,
                            color: splitCommaLines(state.colors)[0] ?? null,
                            colorHex: null,
                            size: splitCommaLines(state.sizes)[0] ?? null,
                            stock: 0,
                            priceAdjustment: 0
                          }]
                        }))}
                      >
                        <Plus className="h-4 w-4" /> Add variant
                      </button>
                    </div>
                    {productForm.variants.length ? (
                      <div className="mt-4 space-y-3">
                        {productForm.variants.map((variant, index) => (
                          <div key={variant.id ?? `variant-${index}`} className="grid gap-3 rounded-[18px] bg-brand-offwhite p-3 md:grid-cols-2 xl:grid-cols-[1.4fr_1fr_0.8fr_1fr_0.7fr_0.8fr_auto] xl:items-end">
                            <Field label="Variant SKU"><input value={variant.sku} onChange={(event) => updateProductVariant(index, { sku: event.target.value.toUpperCase() })} className={inputClass} /></Field>
                            <Field label="Colour"><input value={variant.color ?? ""} onChange={(event) => updateProductVariant(index, { color: event.target.value || null })} className={inputClass} /></Field>
                            <Field label="Hex"><input value={variant.colorHex ?? ""} onChange={(event) => updateProductVariant(index, { colorHex: event.target.value || null })} placeholder="#000000" className={inputClass} /></Field>
                            <Field label={selectedParentCategory?.slug === "lifestyle" ? productForm.variantLabel || "Option" : "Size"}><input value={variant.size ?? ""} onChange={(event) => updateProductVariant(index, { size: event.target.value || null })} className={inputClass} /></Field>
                            <Field label="Stock"><input type="number" min="0" value={variant.stock} onChange={(event) => updateProductVariant(index, { stock: Math.max(0, Number(event.target.value) || 0) })} className={inputClass} /></Field>
                            <Field label="Price adjustment"><input type="number" min="0" step="0.01" value={variant.priceAdjustment} onChange={(event) => updateProductVariant(index, { priceAdjustment: Math.max(0, Number(event.target.value) || 0) })} className={inputClass} /></Field>
                            <IconButton icon={Trash2} label="Remove" className="w-full justify-center" onClick={() => setProductForm((state) => ({ ...state, variants: state.variants.filter((_, variantIndex) => variantIndex !== index) }))} />
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-4 rounded-[18px] border border-dashed border-black/12 px-4 py-6 text-center text-sm text-brand-black/58">No inventory variants. Add one when stock or pricing differs by colour, size, capacity or model.</p>}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className="min-h-11 rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void submitProduct()}>
                      {busy === "save-product" ? "Saving..." : productForm.id ? "Update Product" : "Create Product"}
                    </button>
                    <button type="button" className="min-h-11 rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold" onClick={() => setProductForm(defaultProductForm())}>
                      Reset
                    </button>
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeSection === "customisation" ? <CustomisationAdminPanel /> : null}

            {activeSection === "categories" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
                <Panel title="Categories & Subcategories" description="Manage visibility, hierarchy and category imagery.">
                  <p className="mb-4 text-sm leading-6 text-brand-black/58">Open a main category to add, order, publish or archive its storefront menu items.</p>
                  <div className="space-y-3">
                    {parentCategoryOptions.map((parent) => {
                      const children = categories.filter((category) => category.parentId === parent.id).sort((left, right) => left.displayOrder - right.displayOrder);
                      return (
                        <details key={parent.id} open className="group overflow-hidden rounded-[24px] border border-black/8 bg-white">
                          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-[#f8f1e3] px-4 py-4">
                            <div>
                              <p className="font-heading text-xl font-bold">{parent.name}</p>
                              <p className="mt-1 text-xs text-brand-black/52">{children.length} subcategories · {parent.isVisible ? "Active" : "Inactive"}</p>
                            </div>
                            <div className="flex flex-wrap justify-end gap-2" onClick={(event) => event.preventDefault()}>
                              <button type="button" className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold" onClick={() => setCategoryForm({ ...defaultCategoryForm(), parentId: parent.id, audience: parent.audience })}>+ Add subcategory</button>
                              <IconButton icon={ArrowUp} label="Move category up" onClick={() => void reorderMainCategory(parent, -1)} />
                              <IconButton icon={ArrowDown} label="Move category down" onClick={() => void reorderMainCategory(parent, 1)} />
                              <button type="button" className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold" onClick={() => void adminService.updateCategory(parent.id, categoryPayload(parent, { isVisible: !parent.isVisible })).then(loadCategories)}>{parent.isVisible ? "Deactivate" : "Activate"}</button>
                              <IconButton icon={Pencil} label="Edit category" onClick={() => setCategoryForm(toCategoryForm(parent))} />
                            </div>
                          </summary>
                          <div className="divide-y divide-black/6 px-3">
                            {children.length ? children.map((subcategory) => (
                              <div key={subcategory.id} className="grid gap-3 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="font-semibold">{subcategory.name}</p>
                                    <span className={subcategory.isVisible ? "rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-semibold text-emerald-700" : "rounded-full bg-brand-navy/8 px-2 py-1 text-[11px] font-semibold text-brand-navy/70"}>{subcategory.isVisible ? "Active" : "Inactive"}</span>
                                  </div>
                                  <p className="mt-1 text-xs text-brand-black/52">/{subcategory.slug} · {subcategory.productCount ?? 0} products · order {subcategory.displayOrder}</p>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                  <IconButton icon={ArrowUp} label="Move up" onClick={() => void reorderSubcategory(subcategory, -1)} />
                                  <IconButton icon={ArrowDown} label="Move down" onClick={() => void reorderSubcategory(subcategory, 1)} />
                                  <IconButton icon={Pencil} label="Edit" onClick={() => setCategoryForm(toCategoryForm(subcategory))} />
                                  <button type="button" className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold" onClick={() => void adminService.setSubcategoryStatus(subcategory.id, !subcategory.isVisible).then(loadCategories)}>{subcategory.isVisible ? "Archive" : "Activate"}</button>
                                  <IconButton
                                    icon={Trash2}
                                    label="Delete"
                                    onClick={() => {
                                      setConfirmMoveTarget("");
                                      setConfirmState({
                                      title: (subcategory.productCount ?? 0) > 0 ? "Archive subcategory" : "Delete subcategory",
                                      description: (subcategory.productCount ?? 0) > 0
                                        ? `${subcategory.name} has ${subcategory.productCount} assigned products, so it cannot be deleted. Archive it to remove it from customer menus while preserving product links.`
                                        : `Permanently delete ${subcategory.name}? This empty subcategory can be removed safely.`,
                                      actionLabel: (subcategory.productCount ?? 0) > 0 ? "Archive" : "Delete",
                                      onConfirm: async () => {
                                        if ((subcategory.productCount ?? 0) > 0) await adminService.setSubcategoryStatus(subcategory.id, false);
                                        else await adminService.deleteSubcategory(subcategory.id);
                                        toast.success((subcategory.productCount ?? 0) > 0 ? "Subcategory archived." : "Subcategory deleted.");
                                        await loadCategories();
                                      },
                                      moveTargets: (subcategory.productCount ?? 0) > 0 ? children.filter((item) => item.id !== subcategory.id && item.isVisible) : undefined,
                                      onMove: (subcategory.productCount ?? 0) > 0 ? async (targetId) => {
                                        await adminService.moveSubcategoryProducts(subcategory.id, targetId);
                                        toast.success(`Products moved and ${subcategory.name} deleted.`);
                                        await Promise.all([loadCategories(), loadProducts()]);
                                      } : undefined
                                    });}}
                                  />
                                </div>
                              </div>
                            )) : <p className="px-2 py-5 text-sm text-brand-black/52">No subcategories yet. Add the first menu item for {parent.name}.</p>}
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </Panel>
                <Panel title={categoryForm.id ? "Edit Category" : "Create Category"} description="Use a top-level category like Men, Women or Kids first. Then add subcategories under the selected parent.">
                  <div className="grid gap-4">
                    <Field label="Name"><input value={categoryForm.name} onChange={(event) => setCategoryForm((state) => ({ ...state, name: event.target.value, slug: state.id || state.slug ? state.slug : event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") }))} className={inputClass} /></Field>
                    <Field label="Slug"><input value={categoryForm.slug} onChange={(event) => setCategoryForm((state) => ({ ...state, slug: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Parent Category">
                      <select value={categoryForm.parentId} onChange={(event) => setCategoryForm((state) => ({ ...state, parentId: event.target.value }))} className={inputClass}>
                        <option value="">Top level</option>
                        {parentCategoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                      </select>
                    </Field>
                    <Field label="Audience">
                      <select value={categoryForm.audience} onChange={(event) => setCategoryForm((state) => ({ ...state, audience: event.target.value as CategoryFormState["audience"] }))} className={inputClass}>
                        {["men", "women", "kids", "unisex", "business"].map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                    <Field label="Description"><textarea value={categoryForm.description} onChange={(event) => setCategoryForm((state) => ({ ...state, description: event.target.value }))} rows={3} className={textareaClass} /></Field>
                    <Field label="SEO Title"><input value={categoryForm.seoTitle} onChange={(event) => setCategoryForm((state) => ({ ...state, seoTitle: event.target.value }))} maxLength={255} className={inputClass} /></Field>
                    <Field label="SEO Description"><textarea value={categoryForm.seoDescription} onChange={(event) => setCategoryForm((state) => ({ ...state, seoDescription: event.target.value }))} maxLength={300} rows={3} className={textareaClass} /></Field>
                    <Field label="Display Order"><input value={categoryForm.displayOrder} onChange={(event) => setCategoryForm((state) => ({ ...state, displayOrder: event.target.value }))} className={inputClass} /></Field>
                    <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-medium">
                      <input type="checkbox" checked={categoryForm.isVisible} onChange={(event) => setCategoryForm((state) => ({ ...state, isVisible: event.target.checked }))} />
                      Visible on storefront
                    </label>
                    <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-medium">
                      <input type="checkbox" checked={categoryForm.showInNavbar} onChange={(event) => setCategoryForm((state) => ({ ...state, showInNavbar: event.target.checked }))} />
                      Show in navigation
                    </label>
                    <div className="rounded-[24px] border border-dashed border-black/14 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold">Category Image</p>
                          <p className="text-sm text-brand-black/58">Upload once and save the category.</p>
                        </div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold">
                          <ImagePlus className="h-4 w-4" />
                          Upload
                          <input type="file" accept={imageUploadAccept} className="hidden" onChange={(event) => void handleImageUpload(event.target.files, (uploads) => setCategoryForm((state) => ({ ...state, imageUrl: uploads[0]?.imageUrl ?? "", imagePublicId: uploads[0]?.publicId ?? "" })))} />
                        </label>
                      </div>
                      {categoryForm.imageUrl ? <img src={categoryForm.imageUrl} alt="Category" className="mt-4 aspect-[16/10] w-full rounded-[20px] object-cover" /> : null}
                    </div>
                    <div className="rounded-[24px] border border-dashed border-black/14 bg-white p-4">
                      <div className="flex items-center justify-between gap-3">
                        <div><p className="text-sm font-semibold">Category Banner</p><p className="text-sm text-brand-black/58">Used as the full-width Lifestyle hero image.</p></div>
                        <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold"><ImagePlus className="h-4 w-4" />Upload<input type="file" accept={imageUploadAccept} className="hidden" onChange={(event) => void handleImageUpload(event.target.files, (uploads) => setCategoryForm((state) => ({ ...state, bannerUrl: uploads[0]?.imageUrl ?? "", bannerPublicId: uploads[0]?.publicId ?? "" })))} /></label>
                      </div>
                      {categoryForm.bannerUrl ? <img src={categoryForm.bannerUrl} alt="Category banner" className="mt-4 aspect-[16/6] w-full rounded-[20px] object-cover" /> : null}
                    </div>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void submitCategory()}>
                      {busy === "save-category" ? "Saving..." : categoryForm.id ? "Update Category" : "Create Category"}
                    </button>
                    <button type="button" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold" onClick={() => setCategoryForm(defaultCategoryForm())}>
                      Reset
                    </button>
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeSection === "homepage" ? (
              <Panel title="Homepage Management" description="Hero copy, cards, announcements and merchandising sections are all editable here.">
                {!homepageData ? <LoadingState label="Loading homepage content" /> : (
                  <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
                    <div className="space-y-6">
                      <SubPanel title="Hero">
                        <div className="grid gap-4">
                          <Field label="Heading"><input value={homepageForm.hero.heading} onChange={(event) => setHomepageForm((state) => ({ ...state, hero: { ...state.hero, heading: event.target.value } }))} className={inputClass} /></Field>
                          <Field label="Description"><textarea value={homepageForm.hero.description} onChange={(event) => setHomepageForm((state) => ({ ...state, hero: { ...state.hero, description: event.target.value } }))} rows={3} className={textareaClass} /></Field>
                          <Field label="Primary Button Label"><input value={homepageForm.hero.primaryButtonLabel} onChange={(event) => setHomepageForm((state) => ({ ...state, hero: { ...state.hero, primaryButtonLabel: event.target.value } }))} className={inputClass} /></Field>
                          <Field label="Primary Button Link"><input value={homepageForm.hero.primaryButtonLink} onChange={(event) => setHomepageForm((state) => ({ ...state, hero: { ...state.hero, primaryButtonLink: event.target.value } }))} className={inputClass} /></Field>
                          <Field label="Secondary Button Label"><input value={homepageForm.hero.secondaryButtonLabel} onChange={(event) => setHomepageForm((state) => ({ ...state, hero: { ...state.hero, secondaryButtonLabel: event.target.value } }))} className={inputClass} /></Field>
                          <Field label="Secondary Button Link"><input value={homepageForm.hero.secondaryButtonLink} onChange={(event) => setHomepageForm((state) => ({ ...state, hero: { ...state.hero, secondaryButtonLink: event.target.value } }))} className={inputClass} /></Field>
                          <Field label="Badge"><input value={homepageForm.hero.badge} onChange={(event) => setHomepageForm((state) => ({ ...state, hero: { ...state.hero, badge: event.target.value } }))} className={inputClass} /></Field>
                          <div className="rounded-[24px] border border-dashed border-black/14 bg-white p-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold">Hero Slider Images</p>
                                <p className="text-sm text-brand-black/58">Upload multiple JPG, PNG or WebP images. The first image appears first in the automatic slider.</p>
                              </div>
                              <label className="inline-flex max-w-max cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">
                                <Upload className="h-4 w-4" />
                                Upload Hero Images
                                <input
                                  type="file"
                                  accept={imageUploadAccept}
                                  multiple
                                  className="hidden"
                                  onChange={(event) =>
                                    void handleImageUpload(event.target.files, (uploads) =>
                                      setHomepageForm((state) => ({
                                        ...state,
                                        hero: {
                                          ...state.hero,
                                          images: [
                                            ...state.hero.images,
                                            ...uploads.map((upload, index) => ({
                                              id: `hero-image-${Date.now()}-${index}`,
                                              imageUrl: upload.imageUrl,
                                              imagePublicId: upload.publicId,
                                              sortOrder: state.hero.images.length + index
                                            }))
                                          ]
                                        }
                                      }))
                                    )
                                  }
                                />
                              </label>
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-2">
                              {homepageForm.hero.images.map((image, index) => (
                                <div key={image.id} className="rounded-[22px] border border-black/8 bg-[#fcfaf6] p-3">
                                  {image.imageUrl ? <img src={image.imageUrl} alt={`Hero slide ${index + 1}`} className="aspect-[16/10] w-full rounded-[18px] object-cover" /> : null}
                                  <div className="mt-3 flex items-center justify-between gap-2">
                                    <span className="text-xs font-semibold text-brand-black/58">Slide {index + 1}</span>
                                    <div className="flex gap-2">
                                      <IconButton
                                        icon={ArrowLeftRight}
                                        label="Move"
                                        onClick={() =>
                                          setHomepageForm((state) => {
                                            const next = [...state.hero.images];
                                            if (index > 0) {
                                              [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                            }
                                            return {
                                              ...state,
                                              hero: {
                                                ...state.hero,
                                                images: next.map((entry, entryIndex) => ({
                                                  ...entry,
                                                  sortOrder: entryIndex
                                                }))
                                              }
                                            };
                                          })
                                        }
                                      />
                                      <IconButton
                                        icon={Trash2}
                                        label="Remove"
                                        onClick={() =>
                                          setHomepageForm((state) => ({
                                            ...state,
                                            hero: {
                                              ...state.hero,
                                              images: state.hero.images
                                                .filter((_, entryIndex) => entryIndex !== index)
                                                .map((entry, entryIndex) => ({
                                                  ...entry,
                                                  sortOrder: entryIndex
                                                }))
                                            }
                                          }))
                                        }
                                      />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </SubPanel>

                      <SubPanel title="Announcement & Support">
                        <Field label="Site Name"><input value={homepageForm.siteSettings.siteName} onChange={(event) => setHomepageForm((state) => ({ ...state, siteSettings: { ...state.siteSettings, siteName: event.target.value } }))} className={inputClass} /></Field>
                        <Field label="Announcement Items"><textarea value={homepageForm.siteSettings.announcementBar.items.join("\n")} onChange={(event) => setHomepageForm((state) => ({ ...state, siteSettings: { ...state.siteSettings, announcementBar: { ...state.siteSettings.announcementBar, items: splitCommaLines(event.target.value) } } }))} rows={4} className={textareaClass} /></Field>
                        <div className="grid gap-4 md:grid-cols-2">
                          <Field label="Support Email"><input value={homepageForm.siteSettings.supportEmail ?? ""} onChange={(event) => setHomepageForm((state) => ({ ...state, siteSettings: { ...state.siteSettings, supportEmail: event.target.value } }))} className={inputClass} /></Field>
                          <Field label="Support Phone"><input value={homepageForm.siteSettings.supportPhone ?? ""} onChange={(event) => setHomepageForm((state) => ({ ...state, siteSettings: { ...state.siteSettings, supportPhone: event.target.value } }))} className={inputClass} /></Field>
                        </div>
                        <Field label="Business Hours"><input value={homepageForm.siteSettings.businessHours ?? ""} onChange={(event) => setHomepageForm((state) => ({ ...state, siteSettings: { ...state.siteSettings, businessHours: event.target.value } }))} className={inputClass} /></Field>
                      </SubPanel>
                    </div>

                    <div className="space-y-6">
                      <SubPanel title="Category Cards">
                        <div className="space-y-4">
                          {homepageForm.categoryCards.map((card, index) => (
                            <div key={card.id} className="rounded-[24px] border border-black/8 bg-white p-4">
                              <div className="grid gap-4 md:grid-cols-2">
                                <Field label="Title"><input value={card.title} onChange={(event) => setHomepageForm((state) => ({ ...state, categoryCards: state.categoryCards.map((entry, entryIndex) => entryIndex === index ? { ...entry, title: event.target.value } : entry) }))} className={inputClass} /></Field>
                                <Field label="Link"><input value={card.link} onChange={(event) => setHomepageForm((state) => ({ ...state, categoryCards: state.categoryCards.map((entry, entryIndex) => entryIndex === index ? { ...entry, link: event.target.value } : entry) }))} className={inputClass} /></Field>
                              </div>
                              <div className="mt-3 flex items-center justify-between gap-3">
                                <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 px-4 py-2.5 text-sm font-semibold">
                                  <ImagePlus className="h-4 w-4" />
                                  Upload
                                  <input type="file" accept={imageUploadAccept} className="hidden" onChange={(event) => void handleImageUpload(event.target.files, (uploads) => setHomepageForm((state) => ({ ...state, categoryCards: state.categoryCards.map((entry, entryIndex) => entryIndex === index ? { ...entry, imageUrl: uploads[0]?.imageUrl ?? null, imagePublicId: uploads[0]?.publicId ?? null } : entry) })))} />
                                </label>
                                <IconButton icon={Trash2} label="Remove" onClick={() => setHomepageForm((state) => ({ ...state, categoryCards: state.categoryCards.filter((_, entryIndex) => entryIndex !== index) }))} />
                              </div>
                              {card.imageUrl ? <img src={card.imageUrl} alt={card.title} className="mt-3 aspect-[16/10] w-full rounded-[18px] object-cover" /> : null}
                            </div>
                          ))}
                          <button type="button" className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold" onClick={() => setHomepageForm((state) => ({ ...state, categoryCards: [...state.categoryCards, { id: `card-${Date.now()}`, title: "New Card", link: "/shop", imageUrl: null, imagePublicId: null, sortOrder: state.categoryCards.length }] }))}>
                            <Plus className="mr-2 inline h-4 w-4" />
                            Add Card
                          </button>
                        </div>
                      </SubPanel>

                      <SubPanel title="Benefits & Merchandising">
                        <Field label="Benefits"><textarea value={homepageForm.benefits.map((item) => `${item.title}|${item.description}|${item.icon}`).join("\n")} onChange={(event) => setHomepageForm((state) => ({ ...state, benefits: event.target.value.split("\n").filter(Boolean).map((line, index) => { const [title, description, icon] = line.split("|"); return { id: `benefit-${index}`, title: title?.trim() ?? "", description: description?.trim() ?? "", icon: icon?.trim() ?? "sparkles", sortOrder: index }; }) }))} rows={5} className={textareaClass} placeholder="TITLE|DESCRIPTION|ICON" /></Field>
                        <Field label="Featured Product IDs"><textarea value={homepageForm.featuredSection.productIds.join(", ")} onChange={(event) => setHomepageForm((state) => ({ ...state, featuredSection: { ...state.featuredSection, productIds: splitCommaLines(event.target.value) } }))} rows={2} className={textareaClass} /></Field>
                        <Field label="New Arrival Product IDs"><textarea value={homepageForm.newArrivalsSection.productIds.join(", ")} onChange={(event) => setHomepageForm((state) => ({ ...state, newArrivalsSection: { ...state.newArrivalsSection, productIds: splitCommaLines(event.target.value) } }))} rows={2} className={textareaClass} /></Field>
                      </SubPanel>
                    </div>
                  </div>
                )}
                <div className="mt-6">
                  <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void submitHomepage()}>
                    {busy === "save-homepage" ? "Saving..." : "Save Homepage Content"}
                  </button>
                </div>
              </Panel>
            ) : null}

            {activeSection === "orders" ? (
              <Panel title="Orders" description="Update lifecycle status, payment status and tracking numbers.">
                <SimpleTable
                  columns={["Order", "Customer", "Items", "Status", "Payment", "Tracking", "Total"]}
                  rows={(ordersData?.items ?? []).map((order) => {
                    const orderItems = Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : [];
                    return [
                    <div key={`order-${String(order.id)}`}><p>{String(order.order_number ?? "—")}</p><p className="text-xs text-brand-black/50">{String(order.invoice_number ?? "")}</p></div>,
                    `${String(order.customer_name ?? "—")} (${String(order.customer_email ?? "—")})`,
                    <div key={`items-${String(order.id)}`} className="space-y-2">
                      {orderItems.map((item) => {
                        const customization = item.customization && typeof item.customization === "object" ? item.customization as Record<string, unknown> : null;
                        return <div key={String(item.id)} className="flex items-center gap-2 text-xs">
                          {typeof customization?.previewImage === "string" ? <img src={customization.previewImage} alt="Saved custom preview" className="h-12 w-10 rounded-lg object-cover" /> : null}
                          <span>{String(item.product_name ?? "Item")} × {String(item.quantity ?? 1)}{customization ? ` · ${String(customization.productColor ?? "")} / ${String(customization.size ?? "")}` : ""}</span>
                        </div>;
                      })}
                    </div>,
                    <select key={`status-${order.id as string}`} defaultValue={String(order.status ?? "Pending")} className={inputClass} onChange={(event) => void adminService.updateOrder(String(order.id), { status: event.target.value }).then(() => { toast.success("Order status updated."); void loadOrders(); })}>
                      {["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>,
                    <select key={`payment-${order.id as string}`} defaultValue={String(order.payment_status ?? "Pending")} className={inputClass} onChange={(event) => void adminService.updateOrder(String(order.id), { paymentStatus: event.target.value }).then(() => { toast.success("Payment status updated."); void loadOrders(); })}>
                      {["Pending", "Paid", "Failed", "Refunded"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>,
                    <input key={`tracking-${order.id as string}`} defaultValue={String(order.tracking_number ?? "")} className={inputClass} onBlur={(event) => void adminService.updateOrder(String(order.id), { trackingNumber: event.target.value || null }).then(() => { toast.success("Tracking number saved."); })} />,
                    `₹${Number(order.total_amount ?? 0).toLocaleString("en-IN")}`
                  ];})}
                />
              </Panel>
            ) : null}

            {activeSection === "customers" ? (
              <Panel title="Customers" description="Read-only customer directory and search.">
                <div className="mb-4 flex gap-3">
                  <input value={customerSearch} onChange={(event) => setCustomerSearch(event.target.value)} className={inputClass} placeholder="Search by name or email" />
                  <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void loadCustomers()}>
                    Search
                  </button>
                </div>
                <SimpleTable
                  columns={["Name", "Email", "Phone", "Role", "Created"]}
                  rows={(customersData?.items ?? []).map((customer) => [
                    `${String(customer.first_name ?? "")} ${String(customer.last_name ?? "")}`.trim() || "—",
                    String(customer.email ?? "—"),
                    String(customer.phone ?? "—"),
                    String(customer.role ?? "customer"),
                    String(customer.created_at ?? "—")
                  ])}
                />
              </Panel>
            ) : null}

            {activeSection === "coupons" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
                <Panel title="Coupons" description="Manage active discount codes and validity windows.">
                  <SimpleTable
                    columns={["Code", "Discount", "Min Order", "Usage", "Active", "Actions"]}
                    rows={(couponsData?.items ?? []).map((coupon) => [
                      String(coupon.code ?? "—"),
                      `${String(coupon.discount_type ?? "percentage")} · ${coupon.value ?? 0}`,
                      `₹${Number(coupon.minimum_order_value ?? 0).toLocaleString("en-IN")}`,
                      `${coupon.usage_count ?? 0}/${coupon.usage_limit ?? "∞"}`,
                      Number(coupon.is_active ?? 0) ? "Yes" : "No",
                      <div className="flex gap-2" key={String(coupon.id)}>
                        <IconButton icon={Pencil} label="Edit" onClick={() => setCouponForm({
                          id: String(coupon.id),
                          code: String(coupon.code ?? ""),
                          description: String(coupon.description ?? ""),
                          discountType: (coupon.discount_type as "flat" | "percentage") ?? "percentage",
                          value: String(coupon.value ?? ""),
                          minimumOrderValue: String(coupon.minimum_order_value ?? 0),
                          maximumDiscount: String(coupon.maximum_discount ?? ""),
                          startsAt: String(coupon.starts_at ?? "").slice(0, 16),
                          endsAt: String(coupon.ends_at ?? "").slice(0, 16),
                          usageLimit: String(coupon.usage_limit ?? ""),
                          isActive: Boolean(coupon.is_active)
                        })} />
                        <IconButton
                          icon={Trash2}
                          label="Delete"
                          onClick={() =>
                            setConfirmState({
                              title: "Delete coupon",
                              description: `Remove coupon ${String(coupon.code)} from the active list.`,
                              onConfirm: async () => {
                                await adminService.deleteCoupon(String(coupon.id));
                                toast.success("Coupon deleted.");
                                await loadCoupons();
                              }
                            })
                          }
                        />
                      </div>
                    ])}
                  />
                </Panel>
                <Panel title={couponForm.id ? "Edit Coupon" : "Create Coupon"} description="Flat and percentage discount support is available.">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Code"><input value={couponForm.code} onChange={(event) => setCouponForm((state) => ({ ...state, code: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Type">
                      <select value={couponForm.discountType} onChange={(event) => setCouponForm((state) => ({ ...state, discountType: event.target.value as CouponFormState["discountType"] }))} className={inputClass}>
                        <option value="percentage">percentage</option>
                        <option value="flat">flat</option>
                      </select>
                    </Field>
                    <Field label="Value"><input value={couponForm.value} onChange={(event) => setCouponForm((state) => ({ ...state, value: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Minimum Order"><input value={couponForm.minimumOrderValue} onChange={(event) => setCouponForm((state) => ({ ...state, minimumOrderValue: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Maximum Discount"><input value={couponForm.maximumDiscount} onChange={(event) => setCouponForm((state) => ({ ...state, maximumDiscount: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Usage Limit"><input value={couponForm.usageLimit} onChange={(event) => setCouponForm((state) => ({ ...state, usageLimit: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Starts At"><input type="datetime-local" value={couponForm.startsAt} onChange={(event) => setCouponForm((state) => ({ ...state, startsAt: event.target.value }))} className={inputClass} /></Field>
                    <Field label="Ends At"><input type="datetime-local" value={couponForm.endsAt} onChange={(event) => setCouponForm((state) => ({ ...state, endsAt: event.target.value }))} className={inputClass} /></Field>
                    <div className="md:col-span-2">
                      <Field label="Description"><textarea value={couponForm.description} onChange={(event) => setCouponForm((state) => ({ ...state, description: event.target.value }))} rows={3} className={textareaClass} /></Field>
                    </div>
                    <label className="md:col-span-2 flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-medium">
                      <input type="checkbox" checked={couponForm.isActive} onChange={(event) => setCouponForm((state) => ({ ...state, isActive: event.target.checked }))} />
                      Coupon is active
                    </label>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void submitCoupon()}>
                      {busy === "save-coupon" ? "Saving..." : couponForm.id ? "Update Coupon" : "Create Coupon"}
                    </button>
                    <button type="button" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold" onClick={() => setCouponForm(defaultCouponForm())}>
                      Reset
                    </button>
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeSection === "reviews" ? (
              <Panel title="Reviews" description="Approve or disable customer reviews pulled from the database.">
                <SimpleTable
                  columns={["Product", "Customer", "Rating", "Title", "Approved", "Actions"]}
                  rows={(reviewsData?.items ?? []).map((review) => [
                    String(review.product_id ?? "—"),
                    String(review.customer_name ?? "—"),
                    String(review.rating ?? "—"),
                    String(review.title ?? "—"),
                    Number(review.is_approved ?? 0) ? "Yes" : "No",
                    <button key={String(review.id)} type="button" className="rounded-full bg-brand-black px-4 py-2 text-xs font-semibold text-white" onClick={() => void adminService.updateReview(String(review.id), !Boolean(review.is_approved)).then(() => { toast.success("Review status updated."); void loadReviews(); })}>
                      {Boolean(review.is_approved) ? "Unapprove" : "Approve"}
                    </button>
                  ])}
                />
              </Panel>
            ) : null}

            {activeSection === "enquiries" ? (
              <div className="space-y-6">
                <Panel title="Corporate Enquiries" description="Business gifting and enterprise requests.">
                  <EnquiryTable rows={corporateEnquiries} kind="corporate" onUpdated={loadEnquiries} />
                </Panel>
                <Panel title="Bulk Enquiries" description="Quantity-driven bulk order requests.">
                  <EnquiryTable rows={bulkEnquiries} kind="bulk" onUpdated={loadEnquiries} />
                </Panel>
                <Panel title="Contact Enquiries" description="Inbound contact form submissions.">
                  <EnquiryTable rows={contactEnquiries} kind="contact" onUpdated={loadEnquiries} />
                </Panel>
              </div>
            ) : null}

            {activeSection === "profile" ? (
              <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                <Panel title="Admin Profile" description="Current authenticated admin details.">
                  <div className="rounded-[24px] border border-black/8 bg-white p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow text-brand-black">
                        <ShieldCheck className="h-6 w-6" />
                      </div>
                      <div>
                        <p className="font-semibold">{admin?.firstName} {admin?.lastName}</p>
                        <p className="text-sm text-brand-black/60">{admin?.email}</p>
                      </div>
                    </div>
                    <div className="mt-5 grid gap-3 text-sm text-brand-black/68">
                      <div className="rounded-2xl bg-[#f8f1e3] px-4 py-3">Role: {admin?.role}</div>
                      <div className="rounded-2xl bg-[#f8f1e3] px-4 py-3">Must change password: {admin?.mustChangePassword ? "Yes" : "No"}</div>
                    </div>
                  </div>
                </Panel>
                <Panel title="Change Password" description="Force-change is supported on first login.">
                  <div className="grid gap-4">
                    <Field label="Current Password"><input type="password" value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((state) => ({ ...state, currentPassword: event.target.value }))} className={inputClass} /></Field>
                    <Field label="New Password"><input type="password" value={passwordForm.newPassword} onChange={(event) => setPasswordForm((state) => ({ ...state, newPassword: event.target.value }))} className={inputClass} /></Field>
                  </div>
                  <div className="mt-6 flex gap-3">
                    <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void submitPasswordChange()}>
                      {busy === "change-password" ? "Updating..." : "Change Password"}
                    </button>
                    <button type="button" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold" onClick={() => void logout()}>
                      Sign Out
                    </button>
                  </div>
                </Panel>
              </div>
            ) : null}
          </main>
        </div>
      </div>

      {confirmState ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4">
          <div className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-600">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-heading text-2xl font-extrabold">{confirmState.title}</h3>
                <p className="mt-2 text-sm leading-7 text-brand-black/64">{confirmState.description}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void applyConfirm()}>
                {confirmState.actionLabel ?? "Confirm"}
              </button>
              <button type="button" className="rounded-full border border-black/10 px-5 py-3 text-sm font-semibold" onClick={() => setConfirmState(null)}>
                Cancel
              </button>
            </div>
            {confirmState.moveTargets?.length && confirmState.onMove ? (
              <div className="mt-5 border-t border-black/8 pt-5">
                <p className="text-sm font-semibold">Or move assigned products before deleting</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row">
                  <select value={confirmMoveTarget} onChange={(event) => setConfirmMoveTarget(event.target.value)} className={inputClass}>
                    <option value="">Choose destination</option>
                    {confirmState.moveTargets.map((target) => <option key={target.id} value={target.id}>{target.name}</option>)}
                  </select>
                  <button type="button" disabled={!confirmMoveTarget} className="shrink-0 rounded-full bg-brand-yellow px-5 py-3 text-sm font-semibold text-brand-black disabled:opacity-45" onClick={() => void Promise.resolve(confirmState.onMove?.(confirmMoveTarget)).then(() => setConfirmState(null))}>Move & delete</button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon
}: {
  label: string;
  value: string | number;
  icon: typeof Package;
}) {
  return (
    <div className="rounded-[28px] border border-black/8 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-brand-black/40">{label}</p>
          <p className="mt-3 font-heading text-4xl font-extrabold">{value}</p>
        </div>
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-yellow text-brand-black">
          <Icon className="h-6 w-6" />
        </span>
      </div>
    </div>
  );
}

function Panel({
  title,
  description,
  children
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-[24px] border border-black/8 bg-[#f8f1e3] p-4 shadow-sm sm:rounded-[32px] sm:p-6">
      <div className="mb-5">
        <h3 className="font-heading text-2xl font-extrabold">{title}</h3>
        <p className="mt-2 text-sm leading-7 text-brand-black/64">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SubPanel({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0 rounded-[22px] border border-black/8 bg-white p-4 sm:rounded-[26px] sm:p-5">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  hint,
  children
}: {
  label: React.ReactNode;
  hint?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-brand-black">{label}</span>
        {hint ? <span className="text-xs font-medium text-brand-black/52">{hint}</span> : null}
      </span>
      {children}
    </label>
  );
}

function SimpleTable({
  columns,
  rows
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-black/12 bg-white px-4 py-8 text-center text-sm text-brand-black/58">
        No records available.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-black/8 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[#f8f1e3] text-brand-black/68">
            <tr>
              {columns.map((column) => (
                <th key={column} className="px-4 py-3 font-semibold">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t border-black/6 align-top">
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} className="px-4 py-3">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function IconButton({
  icon: Icon,
  label,
  onClick,
  disabled = false,
  className = ""
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <button type="button" disabled={disabled} className={`inline-flex min-h-11 min-w-0 items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-35 ${className}`} onClick={onClick}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function FlagPill({ label, tone }: { label: string; tone?: "dark" }) {
  return (
    <span className={`rounded-full px-3 py-1 ${tone === "dark" ? "bg-brand-black text-white" : "bg-brand-yellow/25 text-brand-black"}`}>
      {label}
    </span>
  );
}

function EnquiryTable({
  rows,
  kind,
  onUpdated
}: {
  rows: Array<Record<string, unknown>>;
  kind: "corporate" | "bulk" | "contact";
  onUpdated: () => Promise<void>;
}) {
  return (
    <SimpleTable
      columns={["Name", "Email", "Status", "Message / Products", "Action"]}
      rows={rows.map((row) => [
        String(row.contact_person ?? row.name ?? "—"),
        String(row.work_email ?? row.email ?? "—"),
        String(row.status ?? "New"),
        String(row.required_products ?? row.products ?? row.message ?? "—"),
        <select
          key={String(row.id)}
          defaultValue={String(row.status ?? "New")}
          className={inputClass}
          onChange={(event) =>
            void adminService.updateEnquiry(kind, String(row.id), event.target.value).then(() => {
              toast.success("Enquiry updated.");
              void onUpdated();
            })
          }
        >
          {["New", "Contacted", "Quoted", "Closed"].map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>
      ])}
    />
  );
}

const inputClass = "min-h-11 min-w-0 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none";
const textareaClass = "min-w-0 w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none";
