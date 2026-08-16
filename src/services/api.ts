import { faqs, mockOrders, mockUser, reviews, testimonials } from "../data/catalog";
import { apiRequest, apiUpload } from "../lib/http";
import type { HomepagePayload, StoreCategory, StoreProduct } from "../lib/storefront";
import { normalizeCategory, normalizeHomepagePayload, normalizeProduct } from "../lib/storefront";
import type { Order, Product, Review, User } from "../types/models";

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
  firstName: string;
  lastName: string;
  role: "super_admin" | "editor";
  mustChangePassword: boolean;
}

async function fetchStoreCategories() {
  const response = await apiRequest<ListResponse<StoreCategory>>("/store/categories");
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
  return response.items;
}

export const storefrontService = {
  async getHomepage() {
    return normalizeHomepagePayload(await apiRequest<HomepagePayload>("/store/homepage"));
  },
  async getCategories() {
    return fetchStoreCategories();
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
    return apiRequest<{ admin: AdminProfile }>("/admin/auth/login", {
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
    return apiRequest<{ admin: AdminProfile }>("/admin/auth/me");
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
  listProducts(page = 1, search = "") {
    const query = new URLSearchParams({ page: String(page), limit: "20", search });
    return apiRequest<ListResponse<StoreProduct>>(`/admin/products?${query.toString()}`);
  },
  getProduct(id: string) {
    return apiRequest<ItemResponse<StoreProduct>>(`/admin/products/${id}`);
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
    const response = await apiUpload<{ items: Array<{ url: string; publicId: string }> }>("/admin/uploads/images", formData);
    return response.items;
  }
};

export type { AdminProfile };
