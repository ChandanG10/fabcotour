export interface CorporateProduct {
 id: string; name: string; slug: string; category: string; shortDescription: string; description: string;
 mainImage: string; additionalImages: string[]; includedItems: string[]; minimumOrderQuantity: number;
 startingPrice: number | null; pricingType: "starting_from" | "request_quote" | "fixed_price";
 customisationAvailable: boolean; logoPrintingAvailable: boolean; employeeNamePersonalisation: boolean;
 customPackagingAvailable: boolean; bulkQuantityAvailable: boolean; deliveryInformation: string;
 isFeatured: boolean; isActive: boolean; displayOrder: number;
}
export function corporatePrice(product: CorporateProduct) {
 if (product.pricingType === "request_quote" || product.startingPrice === null) return "Request Quote";
 const price = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(product.startingPrice);
 return product.pricingType === "starting_from" ? `Starting from ${price}` : price;
}
