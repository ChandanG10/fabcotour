CREATE TABLE IF NOT EXISTS admins (
  id CHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NOT NULL,
  role ENUM('super_admin', 'editor') NOT NULL DEFAULT 'super_admin',
  phone VARCHAR(32) NULL,
  avatar_url TEXT NULL,
  must_change_password TINYINT(1) NOT NULL DEFAULT 1,
  last_login_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS categories (
  id CHAR(36) PRIMARY KEY,
  parent_id CHAR(36) NULL,
  name VARCHAR(160) NOT NULL,
  slug VARCHAR(180) NOT NULL UNIQUE,
  description TEXT NULL,
  audience ENUM('men', 'women', 'kids', 'unisex', 'business') NOT NULL DEFAULT 'unisex',
  image_url TEXT NULL,
  image_public_id VARCHAR(255) NULL,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  display_order INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL,
  INDEX idx_categories_parent (parent_id),
  INDEX idx_categories_visible (is_visible, display_order)
);

CREATE TABLE IF NOT EXISTS products (
  id CHAR(36) PRIMARY KEY,
  category_id CHAR(36) NOT NULL,
  subcategory_id CHAR(36) NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL UNIQUE,
  sku VARCHAR(120) NOT NULL UNIQUE,
  short_description TEXT NULL,
  description LONGTEXT NULL,
  specifications JSON NULL,
  audience ENUM('men', 'women', 'kids', 'unisex', 'business') NOT NULL DEFAULT 'unisex',
  price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NULL,
  gst_percent DECIMAL(5,2) NOT NULL DEFAULT 0,
  stock INT NOT NULL DEFAULT 0,
  fabric VARCHAR(120) NULL,
  fit VARCHAR(120) NULL,
  gsm VARCHAR(64) NULL,
  printing_method VARCHAR(160) NULL,
  colors JSON NULL,
  sizes JSON NULL,
  seo_title VARCHAR(255) NULL,
  seo_meta_description VARCHAR(300) NULL,
  is_bestseller TINYINT(1) NOT NULL DEFAULT 0,
  is_featured TINYINT(1) NOT NULL DEFAULT 0,
  is_new_arrival TINYINT(1) NOT NULL DEFAULT 0,
  is_customisable TINYINT(1) NOT NULL DEFAULT 1,
  is_archived TINYINT(1) NOT NULL DEFAULT 0,
  is_visible TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_products_subcategory FOREIGN KEY (subcategory_id) REFERENCES categories(id),
  INDEX idx_products_category (category_id, is_visible),
  INDEX idx_products_slug (slug),
  INDEX idx_products_featured (is_featured, is_new_arrival, is_visible)
);

CREATE TABLE IF NOT EXISTS product_images (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  image_url TEXT NOT NULL,
  public_id VARCHAR(255) NOT NULL,
  alt_text VARCHAR(255) NULL,
  sort_order INT NOT NULL DEFAULT 0,
  is_primary TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_images_product (product_id, sort_order)
);

CREATE TABLE IF NOT EXISTS product_variants (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  sku VARCHAR(120) NOT NULL UNIQUE,
  color VARCHAR(120) NULL,
  color_hex VARCHAR(24) NULL,
  size VARCHAR(64) NULL,
  stock INT NOT NULL DEFAULT 0,
  price_adjustment DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  INDEX idx_product_variants_product (product_id)
);

CREATE TABLE IF NOT EXISTS inventory (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  variant_id CHAR(36) NULL,
  quantity INT NOT NULL DEFAULT 0,
  low_stock_threshold INT NOT NULL DEFAULT 5,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_inventory_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_inventory_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE,
  INDEX idx_inventory_low_stock (quantity, low_stock_threshold)
);

CREATE TABLE IF NOT EXISTS users (
  id CHAR(36) PRIMARY KEY,
  first_name VARCHAR(120) NOT NULL,
  last_name VARCHAR(120) NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(32) NULL,
  password_hash VARCHAR(255) NULL,
  role ENUM('customer', 'business') NOT NULL DEFAULT 'customer',
  avatar_url TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL
);

CREATE TABLE IF NOT EXISTS addresses (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  label VARCHAR(80) NOT NULL DEFAULT 'Home',
  recipient VARCHAR(160) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  line1 VARCHAR(255) NOT NULL,
  line2 VARCHAR(255) NULL,
  city VARCHAR(120) NOT NULL,
  state VARCHAR(120) NOT NULL,
  pin_code VARCHAR(20) NOT NULL,
  country VARCHAR(120) NOT NULL DEFAULT 'India',
  is_default TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_addresses_user (user_id, is_default)
);

CREATE TABLE IF NOT EXISTS orders (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NULL,
  address_id CHAR(36) NULL,
  order_number VARCHAR(120) NOT NULL UNIQUE,
  status ENUM('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled', 'Returned') NOT NULL DEFAULT 'Pending',
  payment_status ENUM('Pending', 'Paid', 'Failed', 'Refunded') NOT NULL DEFAULT 'Pending',
  payment_method VARCHAR(80) NULL,
  tracking_number VARCHAR(120) NULL,
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  shipping_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  customer_name VARCHAR(160) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(32) NULL,
  notes TEXT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_address FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL,
  INDEX idx_orders_status (status, payment_status),
  INDEX idx_orders_created (created_at)
);

CREATE TABLE IF NOT EXISTS order_items (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  product_id CHAR(36) NULL,
  variant_id CHAR(36) NULL,
  product_name VARCHAR(255) NOT NULL,
  sku VARCHAR(120) NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  total_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  customization JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL,
  CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL,
  INDEX idx_order_items_order (order_id)
);

CREATE TABLE IF NOT EXISTS coupons (
  id CHAR(36) PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  description VARCHAR(255) NULL,
  discount_type ENUM('flat', 'percentage') NOT NULL DEFAULT 'percentage',
  value DECIMAL(10,2) NOT NULL,
  minimum_order_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  maximum_discount DECIMAL(10,2) NULL,
  starts_at DATETIME NULL,
  ends_at DATETIME NULL,
  usage_limit INT NULL,
  usage_count INT NOT NULL DEFAULT 0,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  INDEX idx_coupons_active (is_active, starts_at, ends_at)
);

CREATE TABLE IF NOT EXISTS reviews (
  id CHAR(36) PRIMARY KEY,
  product_id CHAR(36) NOT NULL,
  user_id CHAR(36) NULL,
  customer_name VARCHAR(160) NOT NULL,
  rating INT NOT NULL,
  title VARCHAR(255) NULL,
  comment TEXT NULL,
  image_url TEXT NULL,
  is_approved TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at DATETIME NULL,
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  INDEX idx_reviews_product (product_id, is_approved)
);

CREATE TABLE IF NOT EXISTS corporate_enquiries (
  id CHAR(36) PRIMARY KEY,
  company_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(160) NOT NULL,
  work_email VARCHAR(255) NOT NULL,
  phone_number VARCHAR(32) NOT NULL,
  required_products TEXT NOT NULL,
  estimated_quantity VARCHAR(80) NULL,
  budget_range VARCHAR(80) NULL,
  event_date DATE NULL,
  delivery_city VARCHAR(120) NULL,
  customisation_requirements LONGTEXT NULL,
  attachment_url TEXT NULL,
  attachment_public_id VARCHAR(255) NULL,
  message LONGTEXT NULL,
  status ENUM('New', 'Contacted', 'Quoted', 'Closed') NOT NULL DEFAULT 'New',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bulk_enquiries (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  company VARCHAR(255) NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NOT NULL,
  quantity VARCHAR(80) NULL,
  products TEXT NOT NULL,
  design_support VARCHAR(80) NULL,
  timeline VARCHAR(80) NULL,
  upload_url TEXT NULL,
  upload_public_id VARCHAR(255) NULL,
  message LONGTEXT NULL,
  status ENUM('New', 'Contacted', 'Quoted', 'Closed') NOT NULL DEFAULT 'New',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS contact_enquiries (
  id CHAR(36) PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(32) NULL,
  subject VARCHAR(255) NULL,
  message LONGTEXT NOT NULL,
  status ENUM('New', 'Contacted', 'Closed') NOT NULL DEFAULT 'New',
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS homepage_content (
  id INT PRIMARY KEY DEFAULT 1,
  hero JSON NOT NULL,
  category_cards JSON NOT NULL,
  benefits JSON NOT NULL,
  featured_section JSON NOT NULL,
  new_arrivals_section JSON NOT NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_homepage_content_singleton CHECK (id = 1)
);

CREATE TABLE IF NOT EXISTS site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name VARCHAR(160) NOT NULL DEFAULT 'Fabpodd',
  announcement_bar JSON NOT NULL,
  support_email VARCHAR(255) NULL,
  support_phone VARCHAR(32) NULL,
  business_hours VARCHAR(255) NULL,
  social_links JSON NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT chk_site_settings_singleton CHECK (id = 1)
);

INSERT INTO homepage_content (id, hero, category_cards, benefits, featured_section, new_arrivals_section)
VALUES (
  1,
  JSON_OBJECT(
    'heading', 'Wear Your Imagination.',
    'description', 'Custom apparel, standout prints and thoughtful corporate gifts—made uniquely yours.',
    'primaryButtonLabel', 'Start Customising',
    'primaryButtonLink', '/customise',
    'secondaryButtonLabel', 'Shop New Arrivals',
    'secondaryButtonLink', '/shop',
    'badge', 'DESIGNED BY YOU • MADE BY Fabpodd',
    'images', JSON_ARRAY(),
    'imageUrl', NULL,
    'imagePublicId', NULL
  ),
  JSON_ARRAY(),
  JSON_ARRAY(),
  JSON_OBJECT('title', 'Featured Products', 'description', 'Editor-curated picks', 'productIds', JSON_ARRAY()),
  JSON_OBJECT('title', 'New Arrivals', 'description', 'Fresh drops', 'productIds', JSON_ARRAY())
)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;

INSERT INTO site_settings (id, site_name, announcement_bar, support_email, support_phone, business_hours, social_links)
VALUES (
  1,
  'Fabpodd',
  JSON_OBJECT(
    'enabled', true,
    'items', JSON_ARRAY(
      'Free shipping on orders above ₹999',
      'Easy 30-day returns',
      'Secure payments'
    )
  ),
  'admin@fabcouture.in',
  '+91 90000 00000',
  'Monday to Saturday, 10:00 AM to 7:00 PM',
  JSON_OBJECT()
)
ON DUPLICATE KEY UPDATE updated_at = CURRENT_TIMESTAMP;
