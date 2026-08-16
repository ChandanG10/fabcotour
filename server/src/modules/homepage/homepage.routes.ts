import { Router } from "express";
import { z } from "zod";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { requireAdminAuth } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/http.js";
import { parseJsonValue } from "../../utils/json.js";

const heroSchema = z.object({
  heading: z.string().min(2),
  description: z.string().min(2),
  primaryButtonLabel: z.string().min(2),
  primaryButtonLink: z.string().min(1),
  secondaryButtonLabel: z.string().min(2),
  secondaryButtonLink: z.string().min(1),
  badge: z.string().min(2),
  images: z
    .array(
      z.object({
        id: z.string(),
        imageUrl: z.string().url().nullable(),
        imagePublicId: z.string().nullable(),
        sortOrder: z.number().int().default(0)
      })
    )
    .default([]),
  imageUrl: z.string().url().nullable(),
  imagePublicId: z.string().nullable()
});

const categoryCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  link: z.string(),
  imageUrl: z.string().url().nullable(),
  imagePublicId: z.string().nullable(),
  sortOrder: z.number().int().default(0)
});

const benefitSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  icon: z.string().default("sparkles"),
  sortOrder: z.number().int().default(0)
});

const sectionSchema = z.object({
  title: z.string(),
  description: z.string(),
  productIds: z.array(z.string()).default([])
});

const homepageSchema = z.object({
  hero: heroSchema,
  categoryCards: z.array(categoryCardSchema),
  benefits: z.array(benefitSchema),
  featuredSection: sectionSchema,
  newArrivalsSection: sectionSchema
});

const siteSettingsSchema = z.object({
  siteName: z.string().min(2),
  announcementBar: z.object({
    enabled: z.boolean().default(true),
    items: z.array(z.string()).default([])
  }),
  supportEmail: z.string().email().nullable(),
  supportPhone: z.string().nullable(),
  businessHours: z.string().nullable(),
  socialLinks: z.record(z.string()).default({})
});

export const homepageRouter = Router();

homepageRouter.get(
  "/",
  asyncHandler(async (_request, response) => {
    const [homeRows] = await pool.query<RowDataPacket[]>("SELECT * FROM homepage_content WHERE id = 1 LIMIT 1");
    const [siteRows] = await pool.query<RowDataPacket[]>("SELECT * FROM site_settings WHERE id = 1 LIMIT 1");
    const home = homeRows[0];
    const site = siteRows[0];

    response.json({
      hero: parseJsonValue(home?.hero, {}),
      categoryCards: parseJsonValue(home?.category_cards, []),
      benefits: parseJsonValue(home?.benefits, []),
      featuredSection: parseJsonValue(home?.featured_section, {}),
      newArrivalsSection: parseJsonValue(home?.new_arrivals_section, {}),
      siteSettings: {
        siteName: site?.site_name ?? "FAB COUTURE",
        announcementBar: parseJsonValue(site?.announcement_bar, { enabled: true, items: [] }),
        supportEmail: site?.support_email ?? null,
        supportPhone: site?.support_phone ?? null,
        businessHours: site?.business_hours ?? null,
        socialLinks: parseJsonValue(site?.social_links, {})
      }
    });
  })
);

homepageRouter.put(
  "/",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = homepageSchema.parse(request.body);
    await pool.query(
      `UPDATE homepage_content
       SET hero = ?, category_cards = ?, benefits = ?, featured_section = ?, new_arrivals_section = ?
       WHERE id = 1`,
      [
        JSON.stringify(payload.hero),
        JSON.stringify(payload.categoryCards),
        JSON.stringify(payload.benefits),
        JSON.stringify(payload.featuredSection),
        JSON.stringify(payload.newArrivalsSection)
      ]
    );
    response.json({ success: true });
  })
);

homepageRouter.put(
  "/site-settings",
  requireAdminAuth,
  asyncHandler(async (request, response) => {
    const payload = siteSettingsSchema.parse(request.body);
    await pool.query(
      `UPDATE site_settings
       SET site_name = ?, announcement_bar = ?, support_email = ?, support_phone = ?, business_hours = ?, social_links = ?
       WHERE id = 1`,
      [
        payload.siteName,
        JSON.stringify(payload.announcementBar),
        payload.supportEmail,
        payload.supportPhone,
        payload.businessHours,
        JSON.stringify(payload.socialLinks)
      ]
    );
    response.json({ success: true });
  })
);
