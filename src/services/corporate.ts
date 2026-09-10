import { apiRequest, apiUpload } from "../lib/http";
import type { CorporateProduct } from "../types/corporate";
export const corporateService = {
 list: (admin = false, search = "", category = "", signal?: AbortSignal) => apiRequest<{ items: CorporateProduct[]; categories: string[] }>(`${admin ? "/admin" : ""}/corporate-products?${new URLSearchParams({ search, category })}`, { signal }),
 get: (slug: string, signal?: AbortSignal) => apiRequest<{ item: CorporateProduct }>(`/corporate-products/${encodeURIComponent(slug)}`, { signal }),
 save: (product: Omit<CorporateProduct, "id"> & { id?: string }) => apiRequest<{ item: CorporateProduct }>(`/admin/corporate-products${product.id ? `/${product.id}` : ""}`, { method: product.id ? "PUT" : "POST", body: JSON.stringify(product) }),
 patch: (id: string, patch: Partial<Pick<CorporateProduct, "isActive" | "isFeatured" | "displayOrder">>) => apiRequest<{ item: CorporateProduct }>(`/admin/corporate-products/${id}`, { method: "PATCH", body: JSON.stringify(patch) }),
 remove: (id: string) => apiRequest<void>(`/admin/corporate-products/${id}`, { method: "DELETE" }),
 enquire: (slug: string, data: FormData) => apiUpload<{ id: string; message: string }>(`/corporate-products/${encodeURIComponent(slug)}/enquiries`, data)
};
