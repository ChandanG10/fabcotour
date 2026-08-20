ALTER TABLE product_images
  ADD COLUMN variant_color VARCHAR(120) NULL AFTER is_primary,
  ADD COLUMN variant_size VARCHAR(64) NULL AFTER variant_color,
  ADD COLUMN variant_view ENUM('front', 'back', 'left', 'right') NULL AFTER variant_size,
  ADD COLUMN is_variant_primary TINYINT(1) NOT NULL DEFAULT 0 AFTER variant_view,
  ADD INDEX idx_product_images_variant (product_id, variant_color, variant_size, variant_view);
