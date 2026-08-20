ALTER TABLE orders
  ADD COLUMN shipping_address JSON NULL AFTER address_id,
  ADD COLUMN invoice_number VARCHAR(120) NULL AFTER order_number,
  ADD COLUMN payment_provider VARCHAR(80) NULL AFTER payment_method,
  ADD COLUMN payment_order_id VARCHAR(160) NULL AFTER payment_provider,
  ADD COLUMN payment_id VARCHAR(160) NULL AFTER payment_order_id,
  ADD COLUMN paid_at DATETIME NULL AFTER payment_id,
  ADD COLUMN stock_committed_at DATETIME NULL AFTER paid_at,
  ADD UNIQUE INDEX idx_orders_invoice_number (invoice_number),
  ADD INDEX idx_orders_customer_lookup (order_number, customer_email);
