import { v5 as uuidv5 } from "uuid";
import { pool, withTransaction } from "../src/db/pool.js";

const namespace = "896f7ed4-4c9f-4bf2-b9fb-69ce93687eab";
const idFor = (value: string) => uuidv5(value, namespace);

const categories = [
  ["apparel", "Apparel", null, 10],
  ["mens-unisex", "Men's / Unisex", "apparel", 10],
  ["women", "Women", "apparel", 20],
  ["kids", "Kids", "apparel", 30],
  ["jackets-pullovers", "Jackets & Pullovers", null, 20],
  ["adults", "Adults", "jackets-pullovers", 10],
  ["kids-jackets", "Kids", "jackets-pullovers", 20],
  ["accessories", "Accessories", null, 30],
  ["drinkware", "Drinkware", null, 40],
  ["stationery-other-products", "Stationery & Other Products", null, 50]
] as const;

const products = [
  ["oversized-round-neck-t-shirt-180-gsm", "Oversized Round-Neck T-Shirt", "apparel", "mens-unisex", "180 GSM · 100% cotton", 549],
  ["oversized-round-neck-t-shirt-220-gsm", "Oversized Round-Neck T-Shirt", "apparel", "mens-unisex", "220 GSM · Heavy cotton", 649],
  ["premium-round-neck-t-shirt-180-gsm", "Premium Round-Neck T-Shirt", "apparel", "mens-unisex", "180 GSM · Combed cotton", 599],
  ["premium-round-neck-t-shirt-220-gsm", "Premium Round-Neck T-Shirt", "apparel", "mens-unisex", "220 GSM · Premium cotton", 699],
  ["womens-round-neck-t-shirt", "Women’s Round-Neck T-Shirt", "apparel", "women", "180 GSM · Regular fit", 549],
  ["womens-oversized-t-shirt", "Women’s Oversized T-Shirt", "apparel", "women", "220 GSM · Relaxed fit", 649],
  ["kids-round-neck-t-shirt", "Kids Round-Neck T-Shirt", "apparel", "kids", "180 GSM · Soft cotton", 449],
  ["kids-polo-t-shirt", "Kids Polo T-Shirt", "apparel", "kids", "200 GSM · Piqué cotton", 599],
  ["pullover-hoodie", "Pullover Hoodie", "jackets-pullovers", "adults", "320 GSM · Brushed fleece", 1099],
  ["zipper-hoodie", "Zipper Hoodie", "jackets-pullovers", "adults", "320 GSM · Brushed fleece", 1299],
  ["baseball-cap", "Baseball Cap", "accessories", null, "Structured · Adjustable", 399],
  ["tote-bag", "Tote Bag", "accessories", null, "Canvas · 38 × 42 cm", 349],
  ["ceramic-mug", "Ceramic Mug", "drinkware", null, "325 ml · Gloss finish", 299]
] as const;

const colours = [
  ["white", "White", "#FDFDFC", 0],
  ["black", "Black", "#17191D", 30],
  ["navy", "Navy", "#14244B", 30],
  ["grey", "Grey", "#ADB3BA", 20]
] as const;

const sides = ["front", "back", "right", "left"] as const;
const defaultPrintAreas = {
  front: { x: 248, y: 202, width: 304, height: 570 },
  back: { x: 240, y: 166, width: 320, height: 598 },
  right: { x: 556, y: 193, width: 144, height: 202 },
  left: { x: 100, y: 193, width: 144, height: 202 }
} as const;

async function main() {
  await withTransaction(async (connection) => {
    for (const [slug, name, parentSlug, order] of categories) {
      await connection.query(
        `INSERT INTO custom_categories (id, parent_id, name, slug, description, display_order, is_active)
         VALUES (?, ?, ?, ?, ?, ?, 1)
         ON DUPLICATE KEY UPDATE name = VALUES(name), parent_id = VALUES(parent_id), display_order = VALUES(display_order), is_active = 1`,
        [idFor(`category:${slug}`), parentSlug ? idFor(`category:${parentSlug}`) : null, name, slug, `${name} customisation catalogue`, order]
      );
    }

    const methodId = idFor("method:dtf");
    await connection.query(
      `INSERT INTO custom_printing_methods (id, name, slug, description, minimum_quantity, base_charge, charge_per_side, is_active, display_order)
       VALUES (?, 'DTF', 'dtf', 'Direct-to-film transfer suitable for colourful artwork.', 1, 49, 99, 1, 10)
       ON DUPLICATE KEY UPDATE description = VALUES(description), base_charge = VALUES(base_charge), charge_per_side = VALUES(charge_per_side), is_active = 1`,
      [methodId]
    );

    for (let productIndex = 0; productIndex < products.length; productIndex += 1) {
      const [slug, name, categorySlug, subcategorySlug, specification, basePrice] = products[productIndex];
      const productId = idFor(`product:${slug}`);
      const whiteId = idFor(`colour:${slug}:white`);
      await connection.query(
        `INSERT INTO custom_products (
          id, category_id, subcategory_id, name, slug, description, specification, base_price,
          thumbnail_url, default_colour_id, is_active, is_featured, is_placeholder, display_order
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, 1, ?, 1, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), category_id = VALUES(category_id), subcategory_id = VALUES(subcategory_id),
          specification = VALUES(specification), base_price = VALUES(base_price), thumbnail_url = VALUES(thumbnail_url),
          is_active = 1, is_placeholder = 1, display_order = VALUES(display_order)`,
        [
          productId,
          idFor(`category:${categorySlug}`),
          subcategorySlug ? idFor(`category:${subcategorySlug}`) : null,
          name,
          slug,
          `${name} blank product for FabPodd customisation. Development placeholder imagery must be replaced before production.`,
          specification,
          basePrice,
          "/customisation/mockups/white-front.svg",
          productIndex < 4 ? 1 : 0,
          (productIndex + 1) * 10
        ]
      );

      for (let colourIndex = 0; colourIndex < colours.length; colourIndex += 1) {
        const [colourSlug, colourName, hexCode, additionalPrice] = colours[colourIndex];
        const colourId = idFor(`colour:${slug}:${colourSlug}`);
        await connection.query(
          `INSERT INTO custom_product_colours (
            id, product_id, name, slug, hex_code, additional_price, is_default, is_active, display_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)
          ON DUPLICATE KEY UPDATE name = VALUES(name), hex_code = VALUES(hex_code), additional_price = VALUES(additional_price),
            is_default = VALUES(is_default), is_active = 1, display_order = VALUES(display_order)`,
          [colourId, productId, colourName, colourSlug, hexCode, additionalPrice, colourSlug === "white" ? 1 : 0, (colourIndex + 1) * 10]
        );

        for (const side of sides) {
          await connection.query(
            `INSERT INTO custom_product_views (
              id, colour_id, side, image_url, natural_width, natural_height, is_placeholder
            ) VALUES (?, ?, ?, ?, 800, 920, 1)
            ON DUPLICATE KEY UPDATE image_url = VALUES(image_url), natural_width = 800, natural_height = 920, is_placeholder = 1`,
            [idFor(`view:${slug}:${colourSlug}:${side}`), colourId, side, `/customisation/mockups/${colourSlug}-${side}.svg`]
          );
          const printArea = defaultPrintAreas[side];
          await connection.query(
            `INSERT INTO custom_print_areas (
              id, product_id, colour_id, side, reference_width, reference_height, x, y, width, height,
              real_width_cm, real_height_cm, safe_margin, is_active
            ) VALUES (?, ?, ?, ?, 800, 920, ?, ?, ?, ?, 30, 40, 10, 1)
            ON DUPLICATE KEY UPDATE reference_width = 800, reference_height = 920, x = VALUES(x), y = VALUES(y),
              width = VALUES(width), height = VALUES(height), real_width_cm = 30, real_height_cm = 40, safe_margin = 10, is_active = 1`,
            [idFor(`print-area:${slug}:${colourSlug}:${side}`), productId, colourId, side, printArea.x, printArea.y, printArea.width, printArea.height]
          );
        }
      }

      await connection.query("UPDATE custom_products SET default_colour_id = ? WHERE id = ?", [whiteId, productId]);
      await connection.query(
        `INSERT IGNORE INTO custom_product_printing_methods (product_id, printing_method_id) VALUES (?, ?)`,
        [productId, methodId]
      );
      const sizeNames = categorySlug === "accessories" || categorySlug === "drinkware" ? ["One Size"] : ["S", "M", "L", "XL", "2XL"];
      for (let sizeIndex = 0; sizeIndex < sizeNames.length; sizeIndex += 1) {
        const size = sizeNames[sizeIndex];
        await connection.query(
          `INSERT INTO custom_product_sizes (id, product_id, name, additional_price, is_active, display_order)
           VALUES (?, ?, ?, ?, 1, ?)
           ON DUPLICATE KEY UPDATE additional_price = VALUES(additional_price), is_active = 1, display_order = VALUES(display_order)`,
          [idFor(`size:${slug}:${size}`), productId, size, size === "2XL" ? 80 : 0, (sizeIndex + 1) * 10]
        );
      }
    }
  });

  console.log(`Seeded ${products.length} separate custom products with four colours and four side configurations.`);
  await pool.end();
}

void main().catch(async (error) => {
  console.error(error);
  await pool.end();
  process.exit(1);
});
