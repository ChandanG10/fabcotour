ALTER TABLE users
  ADD COLUMN session_version INT NOT NULL DEFAULT 0 AFTER avatar_url,
  ADD COLUMN last_login_at DATETIME NULL AFTER session_version,
  ADD INDEX idx_users_email_active (email, deleted_at);

ALTER TABLE addresses
  ADD COLUMN landmark VARCHAR(255) NULL AFTER line2;

ALTER TABLE orders
  ADD INDEX idx_orders_user_created (user_id, created_at);

ALTER TABLE custom_designs
  ADD COLUMN design_data JSON NULL AFTER status,
  ADD COLUMN preview_url MEDIUMTEXT NULL AFTER design_data,
  ADD INDEX idx_custom_designs_user_status (user_id, status, updated_at);

CREATE TABLE IF NOT EXISTS customer_wishlist_items (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  product_id CHAR(36) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_wishlist_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_customer_wishlist_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  UNIQUE KEY uq_customer_wishlist_product (user_id, product_id),
  INDEX idx_customer_wishlist_user_created (user_id, created_at)
);

CREATE TABLE IF NOT EXISTS customer_password_reset_tokens (
  id CHAR(36) PRIMARY KEY,
  user_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_customer_reset_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_customer_reset_expiry (expires_at, used_at)
);
