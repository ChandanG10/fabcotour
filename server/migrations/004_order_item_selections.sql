ALTER TABLE order_items
  ADD COLUMN selected_color VARCHAR(120) NULL AFTER sku,
  ADD COLUMN selected_size VARCHAR(64) NULL AFTER selected_color;
