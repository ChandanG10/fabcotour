-- Lifestyle extends the existing storefront taxonomy and product/customisation systems.
-- No products are seeded: administrators decide what is published.
ALTER TABLE categories
  ADD COLUMN banner_url TEXT NULL AFTER image_public_id,
  ADD COLUMN banner_public_id VARCHAR(255) NULL AFTER banner_url,
  ADD COLUMN show_in_navbar TINYINT(1) NOT NULL DEFAULT 1 AFTER banner_public_id,
  ADD COLUMN seo_title VARCHAR(255) NULL AFTER show_in_navbar,
  ADD COLUMN seo_description VARCHAR(300) NULL AFTER seo_title;

ALTER TABLE products
  ADD COLUMN product_type VARCHAR(160) NULL AFTER subcategory_review_required,
  ADD COLUMN material VARCHAR(255) NULL AFTER product_type,
  ADD COLUMN dimensions VARCHAR(255) NULL AFTER material,
  ADD COLUMN weight VARCHAR(120) NULL AFTER dimensions,
  ADD COLUMN care_instructions TEXT NULL AFTER weight,
  ADD COLUMN shipping_information TEXT NULL AFTER care_instructions,
  ADD COLUMN variant_label VARCHAR(80) NULL AFTER shipping_information,
  ADD COLUMN custom_product_id CHAR(36) NULL AFTER variant_label,
  ADD CONSTRAINT fk_products_custom_product FOREIGN KEY (custom_product_id) REFERENCES custom_products(id) ON DELETE SET NULL,
  ADD INDEX idx_products_custom_product (custom_product_id);

INSERT INTO categories (
  id, parent_id, name, slug, description, audience, is_visible, show_in_navbar,
  display_order, seo_title, seo_description
)
SELECT UUID(), NULL, 'Lifestyle', 'lifestyle',
       'Personalise the products you use every day.', 'unisex', 1, 1, 40,
       'Personalised Lifestyle Products',
       'Shop personalised bags, drinkware, work essentials, home accessories, tech accessories and gifts.'
WHERE NOT EXISTS (
  SELECT 1 FROM categories WHERE parent_id IS NULL AND slug='lifestyle' AND deleted_at IS NULL
);

CREATE TEMPORARY TABLE seed_lifestyle_subcategories (
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL PRIMARY KEY,
  description TEXT NOT NULL,
  display_order INT NOT NULL
);

INSERT INTO seed_lifestyle_subcategories (name, slug, description, display_order) VALUES
('Tote Bags','tote-bags','Personalised totes for shopping, work and everyday carry.',10),
('Travel & Carry','travel-carry','Personalised bags and accessories made for every journey.',20),
('Drinkware','drinkware','Mugs, bottles and tumblers made unmistakably yours.',30),
('Work & Study','work-study','Personalised desk, school and office essentials.',40),
('Home & Living','home-living','Thoughtful personalised pieces for everyday spaces.',50),
('Tech Accessories','tech-accessories','Personalised protection and organisation for your devices.',60),
('Personalised Gifts','personalised-gifts','Meaningful gifts designed around names, moments and memories.',70);

INSERT INTO categories (
  id, parent_id, name, slug, description, audience, is_visible, show_in_navbar,
  display_order, seo_title, seo_description
)
SELECT UUID(), parent.id, seed.name, seed.slug, seed.description, 'unisex', 1, 1,
       seed.display_order, CONCAT(seed.name, ' | FabPodd Lifestyle'), seed.description
FROM seed_lifestyle_subcategories seed
INNER JOIN categories parent
  ON parent.parent_id IS NULL AND parent.slug='lifestyle' AND parent.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM categories child
  WHERE child.parent_id=parent.id AND child.slug=seed.slug AND child.deleted_at IS NULL
);

DROP TEMPORARY TABLE seed_lifestyle_subcategories;
