CREATE TABLE IF NOT EXISTS custom_categories (
  id CHAR(36) PRIMARY KEY,
  parent_id CHAR(36) NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NULL,
  thumbnail_url VARCHAR(1000) NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_custom_categories_parent FOREIGN KEY (parent_id) REFERENCES custom_categories(id) ON DELETE SET NULL,
  INDEX idx_custom_categories_parent (parent_id, display_order),
  INDEX idx_custom_categories_active (is_active, deleted_at)
);

CREATE TABLE IF NOT EXISTS custom_products (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  subcategory_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT NULL,
  specification VARCHAR(160) NULL,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  thumbnail_url VARCHAR(1000) NULL,
  default_colour_id CHAR(36) NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_placeholder TINYINT(1) NOT NULL DEFAULT 0,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_custom_products_category FOREIGN KEY (category_id) REFERENCES custom_categories(id),
  CONSTRAINT fk_custom_products_subcategory FOREIGN KEY (subcategory_id) REFERENCES custom_categories(id) ON DELETE SET NULL,
  INDEX idx_custom_products_catalogue (is_active, display_order, deleted_at)
);

CREATE TABLE IF NOT EXISTS custom_product_colours (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(140) NOT NULL,
  hex_code VARCHAR(16) NOT NULL,
  additional_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_custom_colours_product FOREIGN KEY (product_id) REFERENCES custom_products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_custom_product_colour_slug (product_id, slug),
  INDEX idx_custom_colours_product (product_id, is_active, display_order)
);

ALTER TABLE custom_products
  ADD CONSTRAINT fk_custom_products_default_colour FOREIGN KEY (default_colour_id) REFERENCES custom_product_colours(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS custom_product_sizes (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  name VARCHAR(64) NOT NULL,
  additional_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_sizes_product FOREIGN KEY (product_id) REFERENCES custom_products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_custom_product_size (product_id, name)
);

CREATE TABLE IF NOT EXISTS custom_product_views (
  id CHAR(36) PRIMARY KEY,
  colour_id CHAR(36) NOT NULL,
  side ENUM('front', 'back', 'right', 'left') NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  public_id VARCHAR(500) NULL,
  natural_width INT NOT NULL DEFAULT 800,
  natural_height INT NOT NULL DEFAULT 1000,
  is_placeholder TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_views_colour FOREIGN KEY (colour_id) REFERENCES custom_product_colours(id) ON DELETE CASCADE,
  UNIQUE KEY uq_custom_colour_side (colour_id, side)
);

CREATE TABLE IF NOT EXISTS custom_print_areas (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  colour_id CHAR(36) NULL,
  side ENUM('front', 'back', 'right', 'left') NOT NULL,
  reference_width INT NOT NULL,
  reference_height INT NOT NULL,
  x DECIMAL(10,3) NOT NULL,
  y DECIMAL(10,3) NOT NULL,
  width DECIMAL(10,3) NOT NULL,
  height DECIMAL(10,3) NOT NULL,
  real_width_cm DECIMAL(8,2) NOT NULL,
  real_height_cm DECIMAL(8,2) NOT NULL,
  safe_margin DECIMAL(8,2) NOT NULL DEFAULT 8,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_print_areas_product FOREIGN KEY (product_id) REFERENCES custom_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_print_areas_colour FOREIGN KEY (colour_id) REFERENCES custom_product_colours(id) ON DELETE CASCADE,
  UNIQUE KEY uq_custom_print_area (product_id, colour_id, side)
);

CREATE TABLE IF NOT EXISTS custom_printing_methods (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NULL,
  minimum_quantity INT NOT NULL DEFAULT 1,
  base_charge DECIMAL(10,2) NOT NULL DEFAULT 0,
  charge_per_side DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_product_printing_methods (
  product_id CHAR(36) NOT NULL,
  printing_method_id CHAR(36) NOT NULL,
  PRIMARY KEY (product_id, printing_method_id),
  CONSTRAINT fk_custom_product_methods_product FOREIGN KEY (product_id) REFERENCES custom_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_product_methods_method FOREIGN KEY (printing_method_id) REFERENCES custom_printing_methods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_printing_charges (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NULL,
  printing_method_id CHAR(36) NOT NULL,
  side ENUM('front', 'back', 'right', 'left') NULL,
  minimum_quantity INT NOT NULL DEFAULT 1,
  maximum_quantity INT NULL,
  charge DECIMAL(10,2) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_charges_product FOREIGN KEY (product_id) REFERENCES custom_products(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_charges_method FOREIGN KEY (printing_method_id) REFERENCES custom_printing_methods(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_art_categories (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_art_assets (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  name VARCHAR(180) NOT NULL,
  image_url VARCHAR(1000) NOT NULL,
  public_id VARCHAR(500) NULL,
  tags JSON NULL,
  display_order INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_art_category FOREIGN KEY (category_id) REFERENCES custom_art_categories(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS custom_designs (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  custom_product_id CHAR(36) NOT NULL,
  custom_colour_id CHAR(36) NOT NULL,
  selected_size VARCHAR(64) NOT NULL,
  printing_method_id CHAR(36) NULL,
  title VARCHAR(180) NULL,
  status ENUM('draft', 'saved', 'ordered') NOT NULL DEFAULT 'draft',
  share_token_hash CHAR(64) NULL UNIQUE,
  share_expires_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_design_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_custom_design_product FOREIGN KEY (custom_product_id) REFERENCES custom_products(id),
  CONSTRAINT fk_custom_design_colour FOREIGN KEY (custom_colour_id) REFERENCES custom_product_colours(id),
  CONSTRAINT fk_custom_design_method FOREIGN KEY (printing_method_id) REFERENCES custom_printing_methods(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS custom_design_sides (
  id CHAR(36) PRIMARY KEY,
  design_id CHAR(36) NOT NULL,
  side ENUM('front', 'back', 'right', 'left') NOT NULL,
  canvas_json JSON NULL,
  preview_url MEDIUMTEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_design_sides_design FOREIGN KEY (design_id) REFERENCES custom_designs(id) ON DELETE CASCADE,
  UNIQUE KEY uq_custom_design_side (design_id, side)
);

CREATE TABLE IF NOT EXISTS custom_design_uploads (
  id CHAR(36) PRIMARY KEY,
  design_id CHAR(36) NULL,
  user_id CHAR(36) NULL,
  original_url VARCHAR(1000) NOT NULL,
  public_id VARCHAR(500) NOT NULL,
  original_name VARCHAR(255) NOT NULL,
  mime_type VARCHAR(80) NOT NULL,
  byte_size INT NOT NULL,
  width INT NULL,
  height INT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_upload_design FOREIGN KEY (design_id) REFERENCES custom_designs(id) ON DELETE SET NULL,
  CONSTRAINT fk_custom_upload_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS customisation_orders (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  order_item_id CHAR(36) NOT NULL,
  design_id CHAR(36) NULL,
  custom_product_id CHAR(36) NOT NULL,
  custom_colour_id CHAR(36) NOT NULL,
  printing_method_id CHAR(36) NULL,
  pricing_breakdown JSON NOT NULL,
  canvas_json JSON NOT NULL,
  preview_urls JSON NULL,
  original_artwork_urls JSON NULL,
  customer_note TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_custom_order_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
  CONSTRAINT fk_custom_order_design FOREIGN KEY (design_id) REFERENCES custom_designs(id) ON DELETE SET NULL,
  CONSTRAINT fk_custom_order_product FOREIGN KEY (custom_product_id) REFERENCES custom_products(id),
  CONSTRAINT fk_custom_order_colour FOREIGN KEY (custom_colour_id) REFERENCES custom_product_colours(id),
  CONSTRAINT fk_custom_order_method FOREIGN KEY (printing_method_id) REFERENCES custom_printing_methods(id) ON DELETE SET NULL
);

ALTER TABLE order_items ADD COLUMN item_type ENUM('STANDARD_PRODUCT', 'CUSTOMISED_PRODUCT') NOT NULL DEFAULT 'STANDARD_PRODUCT' AFTER order_id;
ALTER TABLE order_items ADD COLUMN custom_product_id CHAR(36) NULL AFTER product_id;
ALTER TABLE order_items ADD CONSTRAINT fk_order_items_custom_product FOREIGN KEY (custom_product_id) REFERENCES custom_products(id) ON DELETE SET NULL;
ALTER TABLE order_items ADD INDEX idx_order_items_custom_product (custom_product_id);
