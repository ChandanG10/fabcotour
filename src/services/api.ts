import { faqs, mockOrders, mockUser, reviews, testimonials } from "../data/catalog";
import { apiRequest, apiUpload } from "../lib/http";
import type { HomepagePayload, StoreCategory, StoreProduct } from "../lib/storefront";
import { normalizeCategory, normalizeHomepagePayload, normalizeProduct } from "../lib/storefront";
import type { CustomPricingBreakdown, CustomProductConfiguration, CustomProductSummary, CustomisedCartData, Order, Product, Review, User } from "../types/models";

interface ListResponse<T> {
  items: T[];
  meta?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ItemResponse<T> {
  item: T;
}

interface AdminProfile {
  id: string;
  email: string;
  name: string;
  firstName: string;
  lastName: string;
  role: "super_admin" | "editor";
  mustChangePassword: boolean;
}

async function fetchStoreCategories() {
  const response = await apiRequest<ListResponse<StoreCategory>>("/store/categories");
  if (!Array.isArray(response.items)) {
    throw new Error("The categories API returned an invalid response.");
  }
  return response.items;
}

async function fetchStoreProducts(params?: Record<string, string | number | boolean | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  });

  const query = searchParams.toString();
  const response = await apiRequest<ListResponse<StoreProduct>>(`/store/products${query ? `?${query}` : ""}`);
  if (!Array.isArray(response.items)) {
    throw new Error("The products API returned an invalid response.");
  }
  return response.items;
}

export const storefrontService = {
  async getHomepage() {
    return normalizeHomepagePayload(await apiRequest<HomepagePayload>("/store/homepage"));
  },
  async getCategories() {
    return fetchStoreCategories();
  },
  async getSubcategories(categorySlug: string) {
    const response = await apiRequest<ListResponse<StoreCategory>>(
      `/categories/${encodeURIComponent(categorySlug)}/subcategories`
    );
    return response.items;
  },
  async getProducts(params?: Record<string, string | number | boolean | undefined>) {
    return fetchStoreProducts(params);
  },
  async getNormalizedProducts(params?: Record<string, string | number | boolean | undefined>) {
    const [categories, products] = await Promise.all([fetchStoreCategories(), fetchStoreProducts(params)]);
    return products.map((product) => normalizeProduct(product, categories));
  },
  async getProductBySlug(slug: string) {
    const [categories, response] = await Promise.all([
      fetchStoreCategories(),
      apiRequest<ItemResponse<StoreProduct>>(`/store/products/${slug}`)
    ]);
    return normalizeProduct(response.item, categories);
  },
  async searchProducts(query: string) {
    const [categories, products] = await Promise.all([
      fetchStoreCategories(),
      fetchStoreProducts({ search: query })
    ]);
    return products.map((product) => normalizeProduct(product, categories));
  },
  async createOrder(payload: {
    customer: { name: string; email: string; phone: string };
    address: User["addresses"][number];
    paymentMethod: "Cash on delivery";
    couponCode?: string;
    items: Array<{
      type?: "STANDARD_PRODUCT";
      productId: string;
      variantId?: string;
      selectedColor?: string;
      selectedSize?: string;
      quantity: number;
      customization?: import("../types/models").CustomDesign;
    } | {
      type: "CUSTOMISED_PRODUCT";
      customProductId: string; customColourId: string; size: string; quantity: number; printingMethodId: string;
      usedSides: import("../types/models").ProductSide[];
      canvasJson: import("../types/models").CustomisedCartData["canvasJson"];
      previewUrls: import("../types/models").CustomisedCartData["previewUrls"];
      originalArtworkUrls: string[]; customerNote: string;
    }>;
  }) {
    const response = await apiRequest<ItemResponse<{
      id: string; orderNumber: string; invoiceNumber?: string; createdAt: string;
      status: Order["status"]; paymentStatus?: Order["paymentStatus"]; paymentMethod: string;
      trackingNumber?: string | null; subtotal: number; shipping: number; discount: number; total: number;
      address: User["addresses"][number];
      items: Array<{ id: string; productId: string; variantId?: string | null; selectedColor?: string; selectedSize?: string; quantity: number; price: number; customization?: import("../types/models").CustomDesign }>;
    }>>("/store/orders", { method: "POST", body: JSON.stringify(payload) });
    return {
      ...response.item,
      trackingSteps: ["Order confirmed", "Preparing for fulfilment"]
    } satisfies Order;
  },
  async trackOrder(orderNumber: string, email: string) {
    const query = new URLSearchParams({ email });
    const response = await apiRequest<ItemResponse<Order & { paymentStatus?: Order["paymentStatus"] }>>(
      `/store/orders/${encodeURIComponent(orderNumber)}?${query.toString()}`
    );
    const statusSteps: Record<string, string[]> = {
      Pending: ["Order received"], Confirmed: ["Order confirmed", "Preparing for fulfilment"],
      Processing: ["Order confirmed", "Production or packing in progress"],
      Shipped: ["Order confirmed", "Order shipped"],
      Delivered: ["Order confirmed", "Order shipped", "Delivered"],
      Cancelled: ["Order cancelled"], Returned: ["Return recorded"]
    };
    return { ...response.item, trackingSteps: statusSteps[response.item.status] ?? [response.item.status] };
  }
};

export const customisationService = {
  async getProducts() {
    const response = await apiRequest<ListResponse<CustomProductSummary>>("/customisation/products");
    return response.items;
  },
  async getConfiguration(slug: string) {
    const response = await apiRequest<ItemResponse<CustomProductConfiguration>>(`/customisation/products/${encodeURIComponent(slug)}/configuration`);
    return response.item;
  },
  async uploadArtwork(file: File, signal?: AbortSignal) {
    const formData = new FormData();
    formData.append("artwork", file);
    const response = await apiUpload<ItemResponse<{ id: string; url: string; publicId: string; width: number; height: number; originalName: string }>>("/customisation/uploads", formData, signal);
    return response.item;
  },
  async price(payload: {
    customProductId: string; customColourId: string; size: string; quantity: number;
    printingMethodId: string; usedSides: CustomisedCartData["usedSides"]; canvasJson: CustomisedCartData["canvasJson"];
  }) {
    const response = await apiRequest<ItemResponse<CustomPricingBreakdown>>("/customisation/price", { method: "POST", body: JSON.stringify(payload) });
    return response.item;
  }
};

export const catalogService = {
  async getCategories() {
    const categories = await storefrontService.getCategories();
    return categories.map(normalizeCategory);
  },
  async getProducts() {
    return storefrontService.getNormalizedProducts();
  },
  async getFeaturedProducts() {
    return storefrontService.getNormalizedProducts({ featured: true });
  },
  async getProductBySlug(slug: string) {
    try {
      return await storefrontService.getProductBySlug(slug);
    } catch {
      return null;
    }
  },
  async searchProducts(query: string) {
    return storefrontService.searchProducts(query);
  },
  async getRelatedProducts(product: Product) {
    const products = await storefrontService.getNormalizedProducts({ categoryId: product.categoryId });
    return products.filter((item) => item.id !== product.id).slice(0, 4);
  },
  async getFrequentlyBoughtTogether(product: Product) {
    const products = await storefrontService.getNormalizedProducts({ audience: product.audience[0] ?? "unisex" });
    return products.filter((item) => item.id !== product.id).slice(0, 4);
  },
  async getReviews(productId: string) {
    return reviews.filter((review) => review.productId === productId);
  }
};

export const contentService = {
  async getTestimonials() {
    return testimonials;
  },
  async getFaqs() {
    return faqs;
  }
};

export const accountService = {
  async getUser(): Promise<User> {
    return mockUser;
  },
  async getOrders(): Promise<Order[]> {
    return mockOrders;
  },
  async submitReview(review: Review) {
    return { success: true, review };
  }
};

export const adminService = {
  login(payload: { email: string; password: string }) {
    return apiRequest<{ success: true; admin: AdminProfile }>("/admin/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  logout() {
    return apiRequest<void>("/admin/auth/logout", {
      method: "POST"
    });
  },
  me() {
    return apiRequest<{ success: true; admin: AdminProfile }>("/admin/auth/me");
  },
  changePassword(payload: { currentPassword: string; newPassword: string }) {
    return apiRequest<{ message: string }>("/admin/auth/change-password", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  dashboard() {
    return apiRequest<{
      stats: { products: number; orders: number; customers: number; revenue: number };
      recentOrders: Array<Record<string, unknown>>;
      lowStockProducts: Array<Record<string, unknown>>;
      salesChart: Array<Record<string, unknown>>;
    }>("/admin/dashboard");
  },
  listProducts(page = 1, search = "", categoryId = "", subcategoryId = "") {
    const query = new URLSearchParams({ page: String(page), limit: "20", search });
    if (categoryId) query.set("categoryId", categoryId);
    if (subcategoryId) query.set("subcategoryId", subcategoryId);
    return apiRequest<ListResponse<StoreProduct>>(`/admin/products?${query.toString()}`);
  },
  getProduct(id: string) {
    return apiRequest<ItemResponse<StoreProduct>>(`/admin/products/${id}`);
  },
  suggestProductSku(categoryId: string, subcategoryId = "") {
    const query = new URLSearchParams({ categoryId });
    if (subcategoryId) {
      query.set("subcategoryId", subcategoryId);
    }
    return apiRequest<{ sku: string }>(`/admin/products/sku/suggestion?${query.toString()}`);
  },
  createProduct(payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<StoreProduct>>("/admin/products", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateProduct(id: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<StoreProduct>>(`/admin/products/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteProduct(id: string) {
    return apiRequest<void>(`/admin/products/${id}`, { method: "DELETE" });
  },
  archiveProduct(id: string, isArchived: boolean) {
    return apiRequest<ItemResponse<StoreProduct>>(`/admin/products/${id}/archive`, {
      method: "PATCH",
      body: JSON.stringify({ isArchived })
    });
  },
  reorderProductImages(id: string, images: Array<{ id: string; sortOrder: number; isPrimary: boolean }>) {
    return apiRequest<ItemResponse<StoreProduct>>(`/admin/products/${id}/images/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ images })
    });
  },
  deleteProductImage(productId: string, imageId: string) {
    return apiRequest<void>(`/admin/products/${productId}/images/${imageId}`, {
      method: "DELETE"
    });
  },
  listCategories(page = 1, search = "") {
    const query = new URLSearchParams({ page: String(page), limit: "50", search });
    return apiRequest<ListResponse<StoreCategory>>(`/admin/categories?${query.toString()}`);
  },
  createCategory(payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<StoreCategory>>("/admin/categories", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateCategory(id: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<StoreCategory>>(`/admin/categories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteCategory(id: string) {
    return apiRequest<void>(`/admin/categories/${id}`, { method: "DELETE" });
  },
  createSubcategory(categoryId: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<StoreCategory>>(`/admin/categories/${categoryId}/subcategories`, {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateSubcategory(id: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<StoreCategory>>(`/admin/subcategories/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  setSubcategoryStatus(id: string, isVisible: boolean) {
    return apiRequest<ItemResponse<StoreCategory>>(`/admin/subcategories/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({ isVisible })
    });
  },
  reorderSubcategories(items: Array<{ id: string; displayOrder: number }>) {
    return apiRequest<{ success: true }>("/admin/subcategories/reorder", {
      method: "PATCH",
      body: JSON.stringify({ items })
    });
  },
  deleteSubcategory(id: string) {
    return apiRequest<void>(`/admin/subcategories/${id}`, { method: "DELETE" });
  },
  moveSubcategoryProducts(id: string, targetSubcategoryId: string) {
    return apiRequest<{ success: true }>(`/admin/subcategories/${id}/move-products`, {
      method: "PATCH",
      body: JSON.stringify({ targetSubcategoryId })
    });
  },
  getHomepage() {
    return apiRequest<HomepagePayload>("/admin/homepage").then(normalizeHomepagePayload);
  },
  updateHomepage(payload: Omit<HomepagePayload, "siteSettings">) {
    return apiRequest<{ success: true }>("/admin/homepage", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  updateSiteSettings(payload: HomepagePayload["siteSettings"]) {
    return apiRequest<{ success: true }>("/admin/homepage/site-settings", {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  listOrders(page = 1) {
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    return apiRequest<ListResponse<Record<string, unknown>>>(`/admin/orders?${query.toString()}`);
  },
  updateOrder(id: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<Record<string, unknown>>>(`/admin/orders/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  listCustomers(page = 1, search = "") {
    const query = new URLSearchParams({ page: String(page), limit: "20", search });
    return apiRequest<ListResponse<Record<string, unknown>>>(`/admin/customers?${query.toString()}`);
  },
  listCoupons(page = 1) {
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    return apiRequest<ListResponse<Record<string, unknown>>>(`/admin/coupons?${query.toString()}`);
  },
  createCoupon(payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<Record<string, unknown>>>("/admin/coupons", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  updateCoupon(id: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<Record<string, unknown>>>(`/admin/coupons/${id}`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
  },
  deleteCoupon(id: string) {
    return apiRequest<void>(`/admin/coupons/${id}`, { method: "DELETE" });
  },
  listReviews(page = 1) {
    const query = new URLSearchParams({ page: String(page), limit: "20" });
    return apiRequest<ListResponse<Record<string, unknown>>>(`/admin/reviews?${query.toString()}`);
  },
  updateReview(id: string, isApproved: boolean) {
    return apiRequest<ItemResponse<Record<string, unknown>>>(`/admin/reviews/${id}`, {
      method: "PUT",
      body: JSON.stringify({ isApproved })
    });
  },
  listEnquiries(kind: "corporate" | "bulk" | "contact") {
    return apiRequest<ListResponse<Record<string, unknown>>>(`/admin/enquiries/${kind}`);
  },
  updateEnquiry(kind: "corporate" | "bulk" | "contact", id: string, status: string) {
    return apiRequest<{ success: true }>(`/admin/enquiries/${kind}/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status })
    });
  },
  async uploadImages(files: File[]) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append("images", file);
    });
    const response = await apiUpload<{ items: Array<{ url: string; publicId: string; width: number; height: number }> }>("/admin/uploads/images", formData);
    return response.items;
  },
  async uploadCustomModel(file: File) {
    const formData = new FormData();
    formData.append("model", file);
    const response = await apiUpload<ItemResponse<{ url: string; publicId: string; originalName: string }>>("/admin/uploads/models", formData);
    return response.item;
  },
  listCustomCategories() {
    return apiRequest<ListResponse<Record<string, unknown>>>("/admin/customisation/categories");
  },
  createCustomCategory(payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<Record<string, unknown>>>("/admin/customisation/categories", { method: "POST", body: JSON.stringify(payload) });
  },
  updateCustomCategory(id: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<Record<string, unknown>>>(`/admin/customisation/categories/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteCustomCategory(id: string) {
    return apiRequest<void>(`/admin/customisation/categories/${id}`, { method: "DELETE" });
  },
  listCustomProducts() {
    return apiRequest<ListResponse<CustomProductSummary>>("/admin/customisation/products");
  },
  getCustomProductConfiguration(slug: string) {
    return apiRequest<ItemResponse<CustomProductConfiguration>>(`/admin/customisation/products/${encodeURIComponent(slug)}/configuration`).then((response) => response.item);
  },
  createCustomProduct(payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<CustomProductConfiguration>>("/admin/customisation/products", { method: "POST", body: JSON.stringify(payload) });
  },
  updateCustomProduct(id: string, payload: Record<string, unknown>) {
    return apiRequest<ItemResponse<CustomProductConfiguration>>(`/admin/customisation/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
  },
  deleteCustomProduct(id: string) {
    return apiRequest<void>(`/admin/customisation/products/${id}`, { method: "DELETE" });
  },
  listCustomPrintingMethods() {
    return apiRequest<ListResponse<Record<string, unknown>>>("/admin/customisation/printing-methods");
  },
  listCustomOrders() {
    return apiRequest<ListResponse<Record<string, unknown>>>("/admin/customisation/orders");
  }
};

export type { AdminProfile };
