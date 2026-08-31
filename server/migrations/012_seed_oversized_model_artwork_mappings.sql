UPDATE custom_products
SET model_artwork_mappings = JSON_OBJECT(
  'front', JSON_OBJECT('position', JSON_ARRAY(0, 1.255, 0.168), 'rotation', JSON_ARRAY(0, 0, 0), 'size', JSON_ARRAY(0.205, 0.285)),
  'back', JSON_OBJECT('position', JSON_ARRAY(0, 1.255, -0.168), 'rotation', JSON_ARRAY(0, PI(), 0), 'size', JSON_ARRAY(0.205, 0.285)),
  'right', JSON_OBJECT('position', JSON_ARRAY(0.326, 1.31, 0), 'rotation', JSON_ARRAY(0, PI() / 2, 0), 'size', JSON_ARRAY(0.105, 0.2)),
  'left', JSON_OBJECT('position', JSON_ARRAY(-0.314, 1.31, 0), 'rotation', JSON_ARRAY(0, -PI() / 2, 0), 'size', JSON_ARRAY(0.105, 0.2))
)
WHERE slug = 'oversized-round-neck-t-shirt-180-gsm'
  AND model_url IS NOT NULL
  AND (model_artwork_mappings IS NULL OR JSON_LENGTH(model_artwork_mappings) = 0);
