ALTER TABLE orders
  ADD COLUMN payment_gateway VARCHAR(40) NULL AFTER payment_method,
  ADD COLUMN payment_transaction_id VARCHAR(64) NULL AFTER payment_gateway,
  ADD COLUMN payu_payment_id VARCHAR(120) NULL AFTER payment_transaction_id,
  ADD UNIQUE INDEX idx_orders_payment_transaction_id (payment_transaction_id);

CREATE TABLE IF NOT EXISTS payu_transactions (
  id CHAR(36) PRIMARY KEY,
  order_id CHAR(36) NOT NULL,
  txnid VARCHAR(64) NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
  payu_payment_id VARCHAR(120) NULL,
  failure_reason VARCHAR(255) NULL,
  completed_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_payu_transactions_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  INDEX idx_payu_transactions_order (order_id, created_at),
  INDEX idx_payu_transactions_status (status)
);
