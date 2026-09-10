import { z } from "zod";

const imageUrl = z.string().trim().max(2048).refine(value => /^\/images\/corporate\/[a-z0-9-]+\.webp$/.test(value) || /^https:\/\/[^\s]+$/i.test(value), "Use an uploaded HTTPS image or a corporate asset path.");
export const corporateProductSchema = z.object({
 name: z.string().trim().min(2).max(200),
 slug: z.string().trim().min(2).max(200).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens."),
 category: z.string().trim().min(2).max(120),
 shortDescription: z.string().trim().min(5).max(600),
 description: z.string().trim().min(5).max(20000),
 mainImage: imageUrl,
 additionalImages: z.array(imageUrl).max(10),
 includedItems: z.array(z.string().trim().min(1).max(200)).min(1).max(50),
 minimumOrderQuantity: z.number().int().min(1).max(1000000),
 startingPrice: z.number().min(0).max(9999999999.99).nullable(),
 pricingType: z.enum(["starting_from", "request_quote", "fixed_price"]),
 customisationAvailable: z.boolean(), logoPrintingAvailable: z.boolean(),
 employeeNamePersonalisation: z.boolean(), customPackagingAvailable: z.boolean(), bulkQuantityAvailable: z.boolean(),
 deliveryInformation: z.string().trim().min(2).max(5000),
 isFeatured: z.boolean(), isActive: z.boolean(), displayOrder: z.number().int().min(0).max(1000000)
}).superRefine((data, ctx) => {
 if (data.pricingType !== "request_quote" && data.startingPrice === null) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startingPrice"], message: "Enter a price for this pricing type." });
});
export type CorporateProductInput = z.infer<typeof corporateProductSchema>;
export const corporateQuoteSchema = z.object({
 name: z.string().trim().min(2).max(160), companyName: z.string().trim().min(2).max(255),
 email: z.string().trim().email().max(255), phone: z.string().trim().min(10).max(32).regex(/^[+()\d\s-]+$/),
 quantity: z.coerce.number().int().min(1).max(1000000), message: z.string().trim().min(10).max(10000)
});
