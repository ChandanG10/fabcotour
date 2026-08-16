import {
  AlertTriangle,
  Archive,
  ArrowLeftRight,
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
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { LoadingState } from "../../components/common/Ui";
import { adminService } from "../../services/api";
import { ApiError } from "../../lib/http";
import { useAdminAuth } from "../AdminAuth";
import type { HomepagePayload, StoreCategory, StoreProduct } from "../../lib/storefront";

type DashboardSection =
  | "overview"
  | "products"
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
  seoTitle: string;
  seoMetaDescription: string;
  isBestseller: boolean;
  isFeatured: boolean;
  isNewArrival: boolean;
  isCustomisable: boolean;
  isArchived: boolean;
  isVisible: boolean;
  images: UploadedImage[];
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
} | null;

const basicCategoryBlueprint: Array<{
  audience: "men" | "women" | "kids";
  parent: { name: string; slug: string; description: string };
  children: Array<{ name: string; slug: string; description: string }>;
}> = [
  {
    audience: "men",
    parent: {
      name: "Men",
      slug: "men",
      description: "Core men’s category for tees, polos, hoodies and related apparel."
    },
    children: [
      { name: "T-Shirts", slug: "men-t-shirts", description: "Men’s printed and solid t-shirts." },
      { name: "Shirts", slug: "men-shirts", description: "Men’s casual and formal shirts." },
      { name: "Hoodies", slug: "men-hoodies", description: "Men’s hoodies and sweatshirts." }
    ]
  },
  {
    audience: "women",
    parent: {
      name: "Women",
      slug: "women",
      description: "Core women’s category for tops, t-shirts, hoodies and lifestyle apparel."
    },
    children: [
      { name: "T-Shirts", slug: "women-t-shirts", description: "Women’s printed and oversized t-shirts." },
      { name: "Tops", slug: "women-tops", description: "Women’s casual tops and essentials." },
      { name: "Hoodies", slug: "women-hoodies", description: "Women’s hoodies and sweatshirts." }
    ]
  },
  {
    audience: "kids",
    parent: {
      name: "Kids",
      slug: "kids",
      description: "Core kids category for printed t-shirts, sets and playful essentials."
    },
    children: [
      { name: "T-Shirts", slug: "kids-t-shirts", description: "Kids printed and graphic t-shirts." },
      { name: "Co-ord Sets", slug: "kids-co-ord-sets", description: "Kids matching co-ord sets." },
      { name: "Hoodies", slug: "kids-hoodies", description: "Kids hoodies and sweatshirts." }
    ]
  }
];

const sections: Array<{
  id: DashboardSection;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: Package },
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
  seoTitle: "",
  seoMetaDescription: "",
  isBestseller: false,
  isFeatured: false,
  isNewArrival: false,
  isCustomisable: true,
  isArchived: false,
  isVisible: true,
  images: []
});

const defaultCategoryForm = (): CategoryFormState => ({
  parentId: "",
  name: "",
  slug: "",
  description: "",
  audience: "unisex",
  imageUrl: "",
  imagePublicId: "",
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
    badge: "DESIGNED BY YOU • MADE BY FAB COUTURE",
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
    siteName: "FAB COUTURE",
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
      isPrimary: image.isPrimary
    }))
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
    isVisible: category.isVisible,
    displayOrder: String(category.displayOrder)
  };
}

export default function AdminDashboardPage() {
  const { admin, refresh, setAdmin } = useAdminAuth();
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);

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
  const [customerSearch, setCustomerSearch] = useState("");
  const [productForm, setProductForm] = useState<ProductFormState>(defaultProductForm());
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(defaultCategoryForm());
  const [couponForm, setCouponForm] = useState<CouponFormState>(defaultCouponForm());
  const [homepageForm, setHomepageForm] = useState<HomepagePayload>(emptyHomepage());
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "" });
  const [quickSubcategoryForm, setQuickSubcategoryForm] = useState<QuickSubcategoryFormState>(defaultQuickSubcategoryForm());

  const categories = categoriesData?.items ?? [];
  const parentCategoryOptions = categories.filter((category) => !category.parentId);
  const availableCategoryOptions = useMemo(
    () =>
      parentCategoryOptions.filter((category) =>
        ["men", "women", "kids", "unisex", "business"].includes(category.audience)
      ),
    [parentCategoryOptions]
  );
  const subcategoryOptions = useMemo(
    () =>
      categories.filter(
        (category) =>
          category.parentId &&
          category.parentId === productForm.categoryId
      ),
    [categories, productForm.categoryId]
  );
  const selectedParentCategory = useMemo(
    () => availableCategoryOptions.find((category) => category.id === productForm.categoryId) ?? null,
    [availableCategoryOptions, productForm.categoryId]
  );
  const selectedSubcategory = useMemo(
    () => subcategoryOptions.find((category) => category.id === productForm.subcategoryId) ?? null,
    [subcategoryOptions, productForm.subcategoryId]
  );
  const storefrontRoute = selectedParentCategory ? `/shop/${selectedParentCategory.slug}` : "Select a category to assign the product";
  const storefrontPlacement = selectedParentCategory
    ? `${selectedParentCategory.name}${selectedSubcategory ? ` > ${selectedSubcategory.name}` : ""}`
    : "No category selected";

  const runAction = async (key: string, task: () => Promise<void>) => {
    setBusy(key);
    try {
      await task();
    } finally {
      setBusy(null);
    }
  };

  const loadDashboard = async () => {
    const data = await adminService.dashboard();
    setDashboardData(data);
  };

  const loadProducts = async () => {
    const data = await adminService.listProducts(1, productSearch);
    setProductsData(data);
  };

  const loadCategories = async () => {
    const data = await adminService.listCategories(1);
    setCategoriesData(data);
  };

  const loadHomepage = async () => {
    const data = await adminService.getHomepage();
    setHomepageData(data);
    setHomepageForm(data);
  };

  const loadOrders = async () => {
    setOrdersData(await adminService.listOrders(1));
  };

  const loadCustomers = async () => {
    setCustomersData(await adminService.listCustomers(1, customerSearch));
  };

  const loadCoupons = async () => {
    setCouponsData(await adminService.listCoupons(1));
  };

  const loadReviews = async () => {
    setReviewsData(await adminService.listReviews(1));
  };

  const loadEnquiries = async () => {
    const [corporate, bulk, contact] = await Promise.all([
      adminService.listEnquiries("corporate"),
      adminService.listEnquiries("bulk"),
      adminService.listEnquiries("contact")
    ]);
    setCorporateEnquiries(corporate.items);
    setBulkEnquiries(bulk.items);
    setContactEnquiries(contact.items);
  };

  useEffect(() => {
    void loadDashboard();
    void loadCategories();
    void loadHomepage();
    void loadProducts();
    void loadOrders();
    void loadCustomers();
    void loadCoupons();
    void loadReviews();
    void loadEnquiries();
  }, []);

  const visibleProducts = productsData?.items ?? [];

  const sectionTitle = useMemo(() => sections.find((section) => section.id === activeSection)?.label ?? "Dashboard", [activeSection]);

  const handleImageUpload = async (files: FileList | null, onApply: (uploads: UploadedImage[]) => void) => {
    if (!files?.length) {
      return;
    }

    try {
      await runAction("upload-images", async () => {
        const uploads = await adminService.uploadImages(Array.from(files));
        onApply(
          uploads.map((upload, index) => ({
            imageUrl: upload.url,
            publicId: upload.publicId,
            altText: null,
            sortOrder: index,
            isPrimary: false
          }))
        );
        toast.success("Images uploaded.");
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed.");
    }
  };

  const submitProduct = async () => {
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
        isPrimary: image.isPrimary
      })),
      variants: []
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
      isVisible: categoryForm.isVisible,
      displayOrder: Number(categoryForm.displayOrder || 0)
    };

    await runAction("save-category", async () => {
      if (categoryForm.id) {
        await adminService.updateCategory(categoryForm.id, payload);
        toast.success("Category updated.");
      } else {
        await adminService.createCategory(payload);
        toast.success("Category created.");
      }

      setCategoryForm(defaultCategoryForm());
      await loadCategories();
    });
  };

  const setupBasicCategories = async () => {
    await runAction("seed-basic-categories", async () => {
      const existingBySlug = new Map(categories.map((category) => [category.slug, category]));

      for (const blueprint of basicCategoryBlueprint) {
        let parent = existingBySlug.get(blueprint.parent.slug);

        if (!parent) {
          const createdParent = await adminService.createCategory({
            parentId: null,
            name: blueprint.parent.name,
            slug: blueprint.parent.slug,
            description: blueprint.parent.description,
            audience: blueprint.audience,
            imageUrl: null,
            imagePublicId: null,
            isVisible: true,
            displayOrder: 0
          });
          parent = createdParent.item as StoreCategory;
          existingBySlug.set(parent.slug, parent);
        }

        for (const child of blueprint.children) {
          if (existingBySlug.has(child.slug)) {
            continue;
          }

          const createdChild = await adminService.createCategory({
            parentId: parent.id,
            name: child.name,
            slug: child.slug,
            description: child.description,
            audience: blueprint.audience,
            imageUrl: null,
            imagePublicId: null,
            isVisible: true,
            displayOrder: 0
          });
          const childItem = createdChild.item as StoreCategory;
          existingBySlug.set(childItem.slug, childItem);
        }
      }

      toast.success("Basic Men, Women and Kids categories created.");
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

    const fallbackSlug = `${selectedParentCategory.slug}-${quickSubcategoryForm.name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")}`;

    await runAction("create-subcategory", async () => {
      const response = await adminService.createCategory({
        parentId: selectedParentCategory.id,
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
      toast.success("Subcategory created and selected.");
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

  return (
    <div className="min-h-screen bg-[#f5efe4] text-brand-black">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-40 w-[280px] border-r border-black/8 bg-[#0b0b0b] px-5 py-6 text-white transition ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#ffc928]">FAB COUTURE</p>
              <h1 className="mt-2 font-heading text-2xl font-extrabold">Admin Panel</h1>
            </div>
            <button type="button" className="rounded-full border border-white/10 p-2 lg:hidden" onClick={() => setSidebarOpen(false)}>
              <ArrowLeftRight className="h-4 w-4" />
            </button>
          </div>
          <nav className="mt-8 space-y-2">
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
                  className={`flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${active ? "bg-[#ffc928] text-brand-black" : "text-white/70 hover:bg-white/8 hover:text-white"}`}
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

        <div className="flex-1 lg:pl-[280px]">
          <header className="sticky top-0 z-30 border-b border-black/8 bg-[#f7f2e8]/90 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <button type="button" className="rounded-full border border-black/10 bg-white p-2 lg:hidden" onClick={() => setSidebarOpen(true)}>
                  <LayoutDashboard className="h-4 w-4" />
                </button>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-black/45">Administration</p>
                  <h2 className="font-heading text-2xl font-extrabold">{sectionTitle}</h2>
                </div>
              </div>
              <button type="button" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold" onClick={() => void logout()}>
                {busy === "logout" ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                Logout
              </button>
            </div>
          </header>

          <main className="px-4 py-6 sm:px-6 lg:px-8">
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
              <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                <Panel title="Product Catalogue" description="Create, edit, archive and remove storefront products.">
                  <div className="mb-4 flex flex-col gap-3 sm:flex-row">
                    <div className="flex flex-1 items-center gap-3 rounded-full border border-black/10 bg-white px-4 py-3">
                      <Search className="h-4 w-4 text-brand-black/40" />
                      <input value={productSearch} onChange={(event) => setProductSearch(event.target.value)} className="w-full border-0 bg-transparent outline-none" placeholder="Search by name or SKU" />
                    </div>
                    <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void loadProducts()}>
                      Search
                    </button>
                  </div>
                  <div className="overflow-hidden rounded-[24px] border border-black/8 bg-white">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-[#f8f1e3] text-brand-black/68">
                          <tr>
                            {["Product", "Audience", "Price", "Stock", "Flags", "Actions"].map((heading) => (
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
                              <td className="px-4 py-3 capitalize">{product.audience}</td>
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
                    <Field label="SKU"><input value={productForm.sku} onChange={(event) => setProductForm((state) => ({ ...state, sku: event.target.value }))} className={inputClass} /></Field>
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
                        <Field label="Category">
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
                            }}
                            className={inputClass}
                          >
                            <option value="">
                              {availableCategoryOptions.length ? "Select category" : "Create categories in Categories tab first"}
                            </option>
                            {availableCategoryOptions.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
                          </select>
                        </Field>
                        <Field label="Subcategory">
                          <select value={productForm.subcategoryId} onChange={(event) => setProductForm((state) => ({ ...state, subcategoryId: event.target.value }))} className={inputClass}>
                            <option value="">
                              {productForm.categoryId ? "Optional subcategory" : "Select category first"}
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
                        <Field label="Sizes"><input value={productForm.sizes} onChange={(event) => setProductForm((state) => ({ ...state, sizes: event.target.value }))} placeholder="S, M, L, XL" className={inputClass} /></Field>
                        <Field label="Colours"><input value={productForm.colors} onChange={(event) => setProductForm((state) => ({ ...state, colors: event.target.value }))} placeholder="Black, White, Cream" className={inputClass} /></Field>
                        <Field label="Fabric"><input value={productForm.fabric} onChange={(event) => setProductForm((state) => ({ ...state, fabric: event.target.value }))} placeholder="Cotton, Terry, Linen" className={inputClass} /></Field>
                        <Field label="Fit"><input value={productForm.fit} onChange={(event) => setProductForm((state) => ({ ...state, fit: event.target.value }))} placeholder="Oversized, Regular, Relaxed" className={inputClass} /></Field>
                        <Field label="Printing Method"><input value={productForm.printingMethod} onChange={(event) => setProductForm((state) => ({ ...state, printingMethod: event.target.value }))} placeholder="DTF, Screen Print, Embroidery" className={inputClass} /></Field>
                        <Field label="GSM"><input value={productForm.gsm} onChange={(event) => setProductForm((state) => ({ ...state, gsm: event.target.value }))} placeholder="180, 220" className={inputClass} /></Field>
                      </div>
                    </div>
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
                      <label key={key} className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-medium">
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
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold">Gallery Images</h3>
                        <p className="text-sm text-brand-black/58">Upload JPG, PNG or WebP images. Set one primary image for storefront cards and detail pages.</p>
                      </div>
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold">
                        <Upload className="h-4 w-4" />
                        Upload
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {productForm.images.map((image, index) => (
                        <div key={`${image.publicId}-${index}`} className="rounded-[22px] border border-black/8 bg-white p-3">
                          <img src={image.imageUrl} alt={`Upload ${index + 1}`} className="aspect-[4/3] w-full rounded-[18px] object-cover" />
                          <div className="mt-3 flex items-center justify-between gap-3">
                            <label className="flex items-center gap-2 text-xs font-semibold">
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
                              Primary
                            </label>
                            <div className="flex gap-2">
                              <IconButton
                                icon={ArrowLeftRight}
                                label="Move"
                                onClick={() =>
                                  setProductForm((state) => {
                                    const next = [...state.images];
                                    if (index > 0) {
                                      [next[index - 1], next[index]] = [next[index], next[index - 1]];
                                    }
                                    return {
                                      ...state,
                                      images: next.map((entry, entryIndex) => ({ ...entry, sortOrder: entryIndex }))
                                    };
                                  })
                                }
                              />
                              <IconButton
                                icon={Trash2}
                                label="Remove"
                                onClick={() =>
                                  void runAction("remove-image", async () => {
                                    if (productForm.id && image.id) {
                                      await adminService.deleteProductImage(productForm.id, image.id);
                                    }
                                    setProductForm((state) => ({
                                      ...state,
                                      images: state.images.filter((_, entryIndex) => entryIndex !== index).map((entry, entryIndex) => ({
                                        ...entry,
                                        sortOrder: entryIndex,
                                        isPrimary: entry.isPrimary && index !== entryIndex
                                      }))
                                    }));
                                  })
                                }
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button type="button" className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white" onClick={() => void submitProduct()}>
                      {busy === "save-product" ? "Saving..." : productForm.id ? "Update Product" : "Create Product"}
                    </button>
                    <button type="button" className="rounded-full border border-black/10 bg-white px-5 py-3 text-sm font-semibold" onClick={() => setProductForm(defaultProductForm())}>
                      Reset
                    </button>
                  </div>
                </Panel>
              </div>
            ) : null}

            {activeSection === "categories" ? (
              <div className="grid gap-6 xl:grid-cols-[1fr_0.92fr]">
                <Panel title="Categories & Subcategories" description="Manage visibility, hierarchy and category imagery.">
                  <div className="mb-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      className="rounded-full bg-brand-black px-5 py-3 text-sm font-semibold text-white"
                      onClick={() => void setupBasicCategories()}
                    >
                      {busy === "seed-basic-categories" ? "Creating..." : "Add Basic Men / Women / Kids Categories"}
                    </button>
                    <p className="self-center text-sm text-brand-black/58">
                      Creates top-level categories and simple subcategories so product creation is easier.
                    </p>
                  </div>
                  <SimpleTable
                    columns={["Name", "Audience", "Parent", "Visible", "Actions"]}
                    rows={categories.map((category) => [
                      category.name,
                      category.audience,
                      categories.find((entry) => entry.id === category.parentId)?.name ?? "Top level",
                      category.isVisible ? "Yes" : "No",
                      <div className="flex gap-2" key={category.id}>
                        <IconButton icon={Pencil} label="Edit" onClick={() => setCategoryForm(toCategoryForm(category))} />
                        <IconButton
                          icon={Trash2}
                          label="Delete"
                          onClick={() =>
                            setConfirmState({
                              title: "Delete category",
                              description: `This will soft-delete ${category.name}.`,
                              onConfirm: async () => {
                                await adminService.deleteCategory(category.id);
                                toast.success("Category deleted.");
                                await loadCategories();
                              }
                            })
                          }
                        />
                      </div>
                    ])}
                  />
                </Panel>
                <Panel title={categoryForm.id ? "Edit Category" : "Create Category"} description="Use a top-level category like Men, Women or Kids first. Then add subcategories under the selected parent.">
                  <div className="grid gap-4">
                    <Field label="Name"><input value={categoryForm.name} onChange={(event) => setCategoryForm((state) => ({ ...state, name: event.target.value }))} className={inputClass} /></Field>
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
                    <Field label="Display Order"><input value={categoryForm.displayOrder} onChange={(event) => setCategoryForm((state) => ({ ...state, displayOrder: event.target.value }))} className={inputClass} /></Field>
                    <label className="flex items-center gap-3 rounded-2xl border border-black/8 bg-white px-4 py-3 text-sm font-medium">
                      <input type="checkbox" checked={categoryForm.isVisible} onChange={(event) => setCategoryForm((state) => ({ ...state, isVisible: event.target.checked }))} />
                      Visible on storefront
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
                          <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleImageUpload(event.target.files, (uploads) => setCategoryForm((state) => ({ ...state, imageUrl: uploads[0]?.imageUrl ?? "", imagePublicId: uploads[0]?.publicId ?? "" })))} />
                        </label>
                      </div>
                      {categoryForm.imageUrl ? <img src={categoryForm.imageUrl} alt="Category" className="mt-4 aspect-[16/10] w-full rounded-[20px] object-cover" /> : null}
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
                                  accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
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
                                  <input type="file" accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp" className="hidden" onChange={(event) => void handleImageUpload(event.target.files, (uploads) => setHomepageForm((state) => ({ ...state, categoryCards: state.categoryCards.map((entry, entryIndex) => entryIndex === index ? { ...entry, imageUrl: uploads[0]?.imageUrl ?? null, imagePublicId: uploads[0]?.publicId ?? null } : entry) })))} />
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
                  columns={["Order", "Customer", "Status", "Payment", "Tracking", "Actions"]}
                  rows={(ordersData?.items ?? []).map((order) => [
                    String(order.order_number ?? "—"),
                    `${String(order.customer_name ?? "—")} (${String(order.customer_email ?? "—")})`,
                    <select key={`status-${order.id as string}`} defaultValue={String(order.status ?? "Pending")} className={inputClass} onChange={(event) => void adminService.updateOrder(String(order.id), { status: event.target.value }).then(() => { toast.success("Order status updated."); void loadOrders(); })}>
                      {["Pending", "Confirmed", "Processing", "Shipped", "Delivered", "Cancelled", "Returned"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>,
                    <select key={`payment-${order.id as string}`} defaultValue={String(order.payment_status ?? "Pending")} className={inputClass} onChange={(event) => void adminService.updateOrder(String(order.id), { paymentStatus: event.target.value }).then(() => { toast.success("Payment status updated."); void loadOrders(); })}>
                      {["Pending", "Paid", "Failed", "Refunded"].map((status) => <option key={status} value={status}>{status}</option>)}
                    </select>,
                    <input key={`tracking-${order.id as string}`} defaultValue={String(order.tracking_number ?? "")} className={inputClass} onBlur={(event) => void adminService.updateOrder(String(order.id), { trackingNumber: event.target.value || null }).then(() => { toast.success("Tracking number saved."); })} />,
                    `₹${Number(order.total_amount ?? 0).toLocaleString("en-IN")}`
                  ])}
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
    <section className="rounded-[32px] border border-black/8 bg-[#f8f1e3] p-5 shadow-sm sm:p-6">
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
    <div className="rounded-[26px] border border-black/8 bg-white p-5">
      <h4 className="font-semibold">{title}</h4>
      <div className="mt-4 space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-semibold text-brand-black">{label}</span>
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
  onClick
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
}) {
  return (
    <button type="button" className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-3 py-2 text-xs font-semibold" onClick={onClick}>
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

const inputClass = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none";
const textareaClass = "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm outline-none";
