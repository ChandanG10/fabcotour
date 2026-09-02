-- The customisation catalogue has its own taxonomy in custom_categories.
-- Mirror the Lifestyle choices under Accessories so they are available in the
-- Custom Product form without coupling custom products to storefront categories.
INSERT INTO custom_categories (
  id, parent_id, name, slug, description, display_order, is_active
)
SELECT '18b4d456-a34d-5a9e-9711-425910714ffe', NULL, 'Accessories', 'accessories',
       'Customisable lifestyle accessories.', 30, 1
WHERE NOT EXISTS (
  SELECT 1 FROM custom_categories WHERE slug='accessories'
);

UPDATE custom_categories
SET parent_id=NULL,
    name='Accessories',
    description='Customisable lifestyle accessories.',
    display_order=30,
    is_active=1,
    deleted_at=NULL
WHERE slug='accessories';

CREATE TEMPORARY TABLE seed_custom_lifestyle_subcategories (
  id CHAR(36) NOT NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL PRIMARY KEY,
  description TEXT NOT NULL,
  display_order INT NOT NULL
);

INSERT INTO seed_custom_lifestyle_subcategories (id, name, slug, description, display_order) VALUES
('fc110596-8579-5ba0-b132-ca78ba37a795','Tote Bags','tote-bags','Personalised totes for shopping, work and everyday carry.',10),
('01959c68-5b5f-55fd-a35d-6b122723ee9e','Travel & Carry','travel-carry','Personalised bags and accessories made for every journey.',20),
('cb0ee98e-2e7c-50e6-87f5-091b24a1a8d3','Drinkware','lifestyle-drinkware','Mugs, bottles and tumblers made unmistakably yours.',30),
('10362ee4-dc0c-52d4-8c22-dc622addc0b8','Work & Study','work-study','Personalised desk, school and office essentials.',40),
('44e03f7c-0d6a-5c83-b6ca-93bc718b7b02','Home & Living','home-living','Thoughtful personalised pieces for everyday spaces.',50),
('a970908b-13a3-512e-ae29-01209053d710','Tech Accessories','tech-accessories','Personalised protection and organisation for your devices.',60),
('46ea894a-35ad-5361-b203-fd82d367fd38','Personalised Gifts','personalised-gifts','Meaningful gifts designed around names, moments and memories.',70);

UPDATE custom_categories existing
INNER JOIN seed_custom_lifestyle_subcategories seed ON seed.slug=existing.slug
INNER JOIN custom_categories parent ON parent.slug='accessories' AND parent.parent_id IS NULL
SET existing.parent_id=parent.id,
    existing.name=seed.name,
    existing.description=seed.description,
    existing.display_order=seed.display_order,
    existing.is_active=1,
    existing.deleted_at=NULL;

INSERT INTO custom_categories (
  id, parent_id, name, slug, description, display_order, is_active
)
SELECT seed.id, parent.id, seed.name, seed.slug, seed.description,
       seed.display_order, 1
FROM seed_custom_lifestyle_subcategories seed
INNER JOIN custom_categories parent
  ON parent.slug='accessories' AND parent.parent_id IS NULL
WHERE NOT EXISTS (
  SELECT 1 FROM custom_categories existing WHERE existing.slug=seed.slug
);

UPDATE custom_products product
INNER JOIN custom_categories category ON category.slug='accessories' AND category.parent_id IS NULL
INNER JOIN custom_categories subcategory ON subcategory.slug='tote-bags' AND subcategory.parent_id=category.id
SET product.subcategory_id=subcategory.id
WHERE product.category_id=category.id
  AND product.slug='tote-bag'
  AND product.deleted_at IS NULL
  AND product.subcategory_id IS NULL;

DROP TEMPORARY TABLE seed_custom_lifestyle_subcategories;
