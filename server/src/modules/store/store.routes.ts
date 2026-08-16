import { Router } from "express";
import type { RowDataPacket } from "mysql2";
import { pool } from "../../db/pool.js";
import { asyncHandler } from "../../utils/http.js";
import { parseJsonValue } from "../../utils/json.js";
import { storeProductsRouter } from "../products/products.routes.js";

export const storeRouter = Router();

storeRouter.use("/products", storeProductsRouter);

storeRouter.get(
  "/categories",
  asyncHandler(async (_request, response) => {
    const [rows] = await pool.query<RowDataPacket[]>(
      `SELECT * FROM categories WHERE deleted_at IS NULL AND is_visible = 1 ORDER BY display_order ASC, created_at DESC`
    );
    response.json({
      items: rows.map((row) => ({
        id: row.id,
        parentId: row.parent_id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        audience: row.audience,
        imageUrl: row.image_url,
        imagePublicId: row.image_public_id,
        isVisible: Boolean(row.is_visible),
        displayOrder: row.display_order
      }))
    });
  })
);

storeRouter.get(
  "/homepage",
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
