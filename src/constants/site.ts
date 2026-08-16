import type { Coupon } from "../types/models";

export const siteConfig = {
  name: "FAB COUTURE",
  shortDescription:
    "Custom apparel, gifting and premium essentials with a warm, modern shopping experience.",
  description:
    "FAB COUTURE is a premium custom apparel and gifting storefront shaped by charcoal, cream and golden-yellow brand accents.",
  baseUrl: "https://fabcouture.example",
  announcement: "Free shipping on orders above ₹999  •  Easy 30-day returns  •  Secure payments",
  whatsappNumber: "+91 99999 99999",
  supportEmail: "hello@fabcouture.example",
  supportPhone: "+91 90000 00000",
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
