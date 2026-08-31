-- Correct known legacy defaults and install product/view-specific garment safety.
-- Customer adjustment remains opt-in: this migration does not change mode/allow flags.

UPDATE custom_print_areas area
INNER JOIN custom_products product ON product.id = area.product_id
SET area.x = area.reference_width * 0.330000,
    area.y = area.reference_height * 0.240000,
    area.width = area.reference_width * 0.340000,
    area.height = area.reference_height * 0.220000,
    area.default_area = JSON_OBJECT('x', 0.33, 'y', 0.24, 'width', 0.34, 'height', 0.22),
    area.safe_boundary_type = 'polygon',
    area.garment_safe_area = JSON_OBJECT('x', 0.20, 'y', 0.14, 'width', 0.60, 'height', 0.41),
    area.garment_safe_polygon = JSON_ARRAY(JSON_OBJECT('x',0.34,'y',0.14),JSON_OBJECT('x',0.66,'y',0.14),JSON_OBJECT('x',0.78,'y',0.28),JSON_OBJECT('x',0.76,'y',0.53),JSON_OBJECT('x',0.24,'y',0.53),JSON_OBJECT('x',0.22,'y',0.28)),
    area.safe_area_version = 'cap-front-2'
WHERE product.slug = 'baseball-cap' AND area.side = 'front';

UPDATE custom_print_areas area
INNER JOIN custom_products product ON product.id = area.product_id
SET area.x = area.reference_width * 0.320000,
    area.y = area.reference_height * 0.270000,
    area.width = area.reference_width * 0.360000,
    area.height = area.reference_height * 0.180000,
    area.default_area = JSON_OBJECT('x', 0.32, 'y', 0.27, 'width', 0.36, 'height', 0.18),
    area.safe_boundary_type = 'polygon',
    area.garment_safe_area = JSON_OBJECT('x', 0.18, 'y', 0.19, 'width', 0.64, 'height', 0.30),
    area.garment_safe_polygon = JSON_ARRAY(JSON_OBJECT('x',0.34,'y',0.19),JSON_OBJECT('x',0.66,'y',0.19),JSON_OBJECT('x',0.80,'y',0.31),JSON_OBJECT('x',0.70,'y',0.48),JSON_OBJECT('x',0.30,'y',0.48),JSON_OBJECT('x',0.20,'y',0.31)),
    area.safe_area_version = 'cap-back-2'
WHERE product.slug = 'baseball-cap' AND area.side = 'back';

UPDATE custom_print_areas area
INNER JOIN custom_products product ON product.id = area.product_id
SET area.x = area.reference_width * IF(area.side='right',0.320000,0.460000),
    area.y = area.reference_height * 0.300000,
    area.width = area.reference_width * 0.200000,
    area.height = area.reference_height * 0.190000,
    area.default_area = JSON_OBJECT('x',IF(area.side='right',0.32,0.46),'y',0.30,'width',0.20,'height',0.19),
    area.safe_boundary_type = 'polygon',
    area.garment_safe_area = JSON_OBJECT('x',IF(area.side='right',0.12,0.32),'y',0.23,'width',0.56,'height',0.34),
    area.garment_safe_polygon = IF(area.side='right',
      JSON_ARRAY(JSON_OBJECT('x',0.28,'y',0.23),JSON_OBJECT('x',0.55,'y',0.25),JSON_OBJECT('x',0.68,'y',0.43),JSON_OBJECT('x',0.54,'y',0.56),JSON_OBJECT('x',0.18,'y',0.55),JSON_OBJECT('x',0.12,'y',0.36)),
      JSON_ARRAY(JSON_OBJECT('x',0.45,'y',0.25),JSON_OBJECT('x',0.72,'y',0.23),JSON_OBJECT('x',0.88,'y',0.36),JSON_OBJECT('x',0.82,'y',0.55),JSON_OBJECT('x',0.46,'y',0.56),JSON_OBJECT('x',0.32,'y',0.43))),
    area.safe_area_version = CONCAT('cap-',area.side,'-2')
WHERE product.slug = 'baseball-cap' AND area.side IN ('right','left');

UPDATE custom_print_areas area
INNER JOIN custom_products product ON product.id = area.product_id
SET area.x = area.reference_width * 0.400000,
    area.y = area.reference_height * 0.330000,
    area.width = area.reference_width * 0.150000,
    area.height = area.reference_height * 0.340000,
    area.default_area = JSON_OBJECT('x',0.40,'y',0.33,'width',0.15,'height',0.34),
    area.safe_boundary_type = 'polygon',
    area.garment_safe_area = JSON_OBJECT('x',0.34,'y',0.23,'width',0.27,'height',0.59),
    area.garment_safe_polygon = JSON_ARRAY(JSON_OBJECT('x',0.40,'y',0.23),JSON_OBJECT('x',0.55,'y',0.25),JSON_OBJECT('x',0.59,'y',0.73),JSON_OBJECT('x',0.52,'y',0.82),JSON_OBJECT('x',0.40,'y',0.79),JSON_OBJECT('x',0.34,'y',0.36)),
    area.safe_area_version = CONCAT('zipper-',area.side,'-2')
WHERE product.slug = 'zipper-hoodie' AND area.side IN ('right','left');
