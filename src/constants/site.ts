import type { Coupon } from "../types/models";

export const siteConfig = {
  name: "FAB COUTURE",
  shortDescription:
    "Custom apparel, gifting and premium essentials with a warm, modern shopping experience.",
  description:
    "FAB COUTURE is a premium custom apparel and gifting storefront shaped by charcoal, cream and golden-yellow brand accents.",
  baseUrl: import.meta.env.VITE_SITE_URL?.trim() || "https://fabcouture.vertexsoftware.in",
  announcement: "Free shipping on orders above ₹999  •  Easy 30-day returns  •  Secure payments",
  whatsappNumber: import.meta.env.VITE_WHATSAPP_NUMBER?.trim() || "+91 90000 00000",
  supportEmail: import.meta.env.VITE_SUPPORT_EMAIL?.trim() || "admin@fabcouture.in",
  supportPhone: import.meta.env.VITE_SUPPORT_PHONE?.trim() || "+91 90000 00000",
  businessAddress: import.meta.env.VITE_BUSINESS_ADDRESS?.trim() || "Bengaluru, Karnataka, India",
  grievanceOfficer: import.meta.env.VITE_GRIEVANCE_OFFICER?.trim() || "Customer Grievance Officer",
  grievanceEmail: import.meta.env.VITE_GRIEVANCE_EMAIL?.trim() || "admin@fabcouture.in",
  businessHours: "Monday to Saturday, 10:00 AM to 7:00 PM",
  minimumOrderQuantity: 12
};

export const coupons: Coupon[] = [
  {
    code: "FAB10",
    description: "10% off on fresh drops above Rs. 2,499",
    discountType: "percentage",
    value: 10,
    minimumOrderValue: 2499
  },
  {
    code: "TEAM500",
    description: "Flat Rs. 500 off on team orders above Rs. 6,000",
    discountType: "flat",
    value: 500,
    minimumOrderValue: 6000
  }
];

export const navLinks = [
  { label: "New In", to: "/shop" },
  { label: "Men", to: "/shop/men" },
  { label: "Women", to: "/shop/women" },
  { label: "Kids", to: "/shop/kids" },
  { label: "Customise", to: "/customise" },
  { label: "Corporate Gifting", to: "/corporate-gifting" }
];
