INSERT IGNORE INTO coupons (
  id, code, description, discount_type, value, minimum_order_value,
  maximum_discount, starts_at, ends_at, usage_limit, usage_count, is_active
) VALUES
  (
    '36fb93b8-a73f-4ac5-b538-201a0fa642b8', 'FAB10',
    '10% off on fresh drops above Rs. 2,499', 'percentage', 10, 2499,
    NULL, NULL, NULL, NULL, 0, 1
  ),
  (
    '23c082db-b092-48ad-abfe-5e2553e00e09', 'TEAM500',
    'Flat Rs. 500 off on team orders above Rs. 6,000', 'flat', 500, 6000,
    NULL, NULL, NULL, NULL, 0, 1
  );
