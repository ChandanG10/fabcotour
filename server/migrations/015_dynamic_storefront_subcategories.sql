-- Extend the existing parent/child category model without replacing or deleting data.
ALTER TABLE categories DROP INDEX slug;
ALTER TABLE categories ADD UNIQUE KEY uq_categories_parent_slug (parent_id, slug);
ALTER TABLE products ADD COLUMN subcategory_review_required TINYINT(1) NOT NULL DEFAULT 0 AFTER subcategory_id;
ALTER TABLE products ADD INDEX idx_products_subcategory (subcategory_id, is_visible);

INSERT INTO categories (id, parent_id, name, slug, description, audience, is_visible, display_order)
SELECT UUID(), NULL, seed.name, seed.slug, seed.description, seed.audience, 1, seed.display_order
FROM (
  SELECT 'Men' name, 'men' slug, 'Shop apparel and accessories for men.' description, 'men' audience, 10 display_order
  UNION ALL SELECT 'Women','women','Shop apparel and accessories for women.','women',20
  UNION ALL SELECT 'Kids','kids','Shop apparel and accessories for kids.','kids',30
) seed
WHERE NOT EXISTS (SELECT 1 FROM categories category WHERE category.parent_id IS NULL AND category.slug=seed.slug AND category.deleted_at IS NULL);

CREATE TEMPORARY TABLE seed_store_subcategories (
  audience VARCHAR(16) NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL,
  display_order INT NOT NULL,
  PRIMARY KEY (audience, slug)
);

INSERT INTO seed_store_subcategories (audience,name,slug,display_order) VALUES
('men','T-Shirts','t-shirts',10),('men','Shirts','shirts',20),('men','Polo Shirts','polo-shirts',30),('men','Hoodies & Sweatshirts','hoodies-sweatshirts',40),('men','Jackets','jackets',50),('men','Sweatpants','sweatpants',60),('men','Shorts','shorts',70),('men','Jeans','jeans',80),('men','Trousers','trousers',90),('men','Track Pants','track-pants',100),('men','Tank Tops','tank-tops',110),('men','Sportswear','sportswear',120),('men','Accessories','accessories',130),
('women','T-Shirts','t-shirts',10),('women','Tops','tops',20),('women','Crop Tops','crop-tops',30),('women','Shirts','shirts',40),('women','Hoodies & Sweatshirts','hoodies-sweatshirts',50),('women','Dresses','dresses',60),('women','Jackets','jackets',70),('women','Sweatpants','sweatpants',80),('women','Shorts','shorts',90),('women','Jeans','jeans',100),('women','Trousers','trousers',110),('women','Leggings','leggings',120),('women','Skirts','skirts',130),('women','Sportswear','sportswear',140),('women','Accessories','accessories',150),
('kids','T-Shirts','t-shirts',10),('kids','Shirts','shirts',20),('kids','Polo Shirts','polo-shirts',30),('kids','Hoodies & Sweatshirts','hoodies-sweatshirts',40),('kids','Dresses','dresses',50),('kids','Jackets','jackets',60),('kids','Shorts','shorts',70),('kids','Jeans','jeans',80),('kids','Trousers','trousers',90),('kids','Track Pants','track-pants',100),('kids','Leggings','leggings',110),('kids','Sportswear','sportswear',120),('kids','Accessories','accessories',130);

-- Reuse existing child records when their parent and name already identify the seed.
UPDATE categories child
INNER JOIN categories parent ON parent.id=child.parent_id AND parent.parent_id IS NULL
INNER JOIN seed_store_subcategories seed ON seed.audience=parent.audience AND LOWER(seed.name)=LOWER(child.name)
SET child.slug=seed.slug, child.display_order=seed.display_order, child.deleted_at=NULL
WHERE parent.slug IN ('men','women','kids');

INSERT INTO categories (id,parent_id,name,slug,description,audience,is_visible,display_order)
SELECT UUID(),parent.id,seed.name,seed.slug,CONCAT(seed.name,' for ',LOWER(parent.name),'.'),parent.audience,1,seed.display_order
FROM seed_store_subcategories seed
INNER JOIN categories parent ON parent.parent_id IS NULL AND parent.slug=seed.audience AND parent.deleted_at IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM categories child
  WHERE child.parent_id=parent.id AND child.slug=seed.slug AND child.deleted_at IS NULL
);

-- Consolidate only unmistakable legacy aliases into the new canonical children.
-- The legacy category records are retained but hidden, so history remains auditable.
UPDATE products product
INNER JOIN categories legacy ON legacy.id=product.subcategory_id AND legacy.deleted_at IS NULL
INNER JOIN categories parent ON parent.id=legacy.parent_id AND parent.slug IN ('men','women','kids')
INNER JOIN categories canonical ON canonical.parent_id=parent.id AND canonical.deleted_at IS NULL
  AND canonical.slug = CASE
    WHEN LOWER(TRIM(legacy.name)) IN ('t-shirt','t-shirts','men t-shirt','men t-shirts','women t-shirt','women t-shirts','kids t-shirt','kids t-shirts') THEN 't-shirts'
    WHEN LOWER(TRIM(legacy.name)) IN ('hoodie','hoodies','sweatshirt','sweatshirts') THEN 'hoodies-sweatshirts'
    ELSE '__not-an-obvious-alias__'
  END
SET product.subcategory_id=canonical.id, product.subcategory_review_required=0
WHERE legacy.id<>canonical.id;

UPDATE categories legacy
INNER JOIN categories parent ON parent.id=legacy.parent_id AND parent.slug IN ('men','women','kids')
INNER JOIN categories canonical ON canonical.parent_id=parent.id AND canonical.deleted_at IS NULL
  AND canonical.slug = CASE
    WHEN LOWER(TRIM(legacy.name)) IN ('t-shirt','t-shirts','men t-shirt','men t-shirts','women t-shirt','women t-shirts','kids t-shirt','kids t-shirts') THEN 't-shirts'
    WHEN LOWER(TRIM(legacy.name)) IN ('hoodie','hoodies','sweatshirt','sweatshirts') THEN 'hoodies-sweatshirts'
    ELSE '__not-an-obvious-alias__'
  END
SET legacy.is_visible=0
WHERE legacy.id<>canonical.id;

-- Assign only high-confidence unmapped products. Everything else remains untouched and is flagged.
UPDATE products product
INNER JOIN categories parent ON parent.id=product.category_id AND parent.parent_id IS NULL
INNER JOIN categories child ON child.parent_id=parent.id AND child.deleted_at IS NULL
SET product.subcategory_id=child.id, product.subcategory_review_required=0
WHERE product.subcategory_id IS NULL
  AND parent.slug IN ('men','women','kids')
  AND child.slug = CASE
    WHEN LOWER(product.name) LIKE '%polo%' THEN 'polo-shirts'
    WHEN LOWER(product.name) LIKE '%t-shirt%' OR LOWER(product.name) LIKE '%tee%' THEN 't-shirts'
    WHEN LOWER(product.name) LIKE '%hoodie%' OR LOWER(product.name) LIKE '%sweatshirt%' THEN 'hoodies-sweatshirts'
    WHEN LOWER(product.name) LIKE '%crop top%' THEN 'crop-tops'
    WHEN LOWER(product.name) LIKE '%tank%' THEN 'tank-tops'
    WHEN LOWER(product.name) LIKE '%shirt%' THEN 'shirts'
    WHEN LOWER(product.name) LIKE '%jacket%' THEN 'jackets'
    WHEN LOWER(product.name) LIKE '%sweatpant%' THEN 'sweatpants'
    WHEN LOWER(product.name) LIKE '%track pant%' THEN 'track-pants'
    WHEN LOWER(product.name) LIKE '%trouser%' THEN 'trousers'
    WHEN LOWER(product.name) LIKE '%short%' THEN 'shorts'
    WHEN LOWER(product.name) LIKE '%jean%' THEN 'jeans'
    WHEN LOWER(product.name) LIKE '%legging%' THEN 'leggings'
    WHEN LOWER(product.name) LIKE '%skirt%' THEN 'skirts'
    WHEN LOWER(product.name) LIKE '%dress%' THEN 'dresses'
    WHEN LOWER(product.name) LIKE '%sport%' THEN 'sportswear'
    WHEN LOWER(product.name) LIKE '%accessor%' OR LOWER(product.name) LIKE '%cap%' OR LOWER(product.name) LIKE '%bag%' THEN 'accessories'
    ELSE '__unmapped__'
  END;

UPDATE products product
INNER JOIN categories parent ON parent.id=product.category_id AND parent.parent_id IS NULL
SET product.subcategory_review_required=1
WHERE product.subcategory_id IS NULL AND parent.slug IN ('men','women','kids');

DROP TEMPORARY TABLE seed_store_subcategories;
