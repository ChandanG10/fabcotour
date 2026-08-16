export const currencyFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export const cn = (...classes: Array<string | undefined | false | null>) =>
  classes.filter(Boolean).join(" ");

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const calculateDiscount = (price: number, originalPrice: number) =>
  Math.round(((originalPrice - price) / originalPrice) * 100);
