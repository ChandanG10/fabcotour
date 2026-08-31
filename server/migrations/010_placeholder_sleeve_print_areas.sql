-- Placeholder side SVGs use mirrored front-like silhouettes, so their visible
-- sleeves sit farther outward than uploaded side-profile mockups. Adjust only
-- untouched placeholder-side defaults; uploaded/admin-positioned views remain.
UPDATE custom_print_areas AS area
INNER JOIN custom_product_views AS view
  ON view.colour_id = area.colour_id AND view.side = area.side
SET
  area.x = CASE area.side WHEN 'right' THEN area.reference_width * 0.695 ELSE area.reference_width * 0.125 END,
  area.y = area.reference_height * 0.21,
  area.width = area.reference_width * 0.18,
  area.height = area.reference_height * 0.22
WHERE
  view.is_placeholder = 1
  AND area.side IN ('right', 'left')
  AND area.width / area.reference_width BETWEEN 0.179 AND 0.181
  AND (
    (area.side = 'right' AND ABS(area.x / area.reference_width - 0.45) < 0.001 AND ABS(area.y / area.reference_height - 0.25) < 0.001)
    OR
    (area.side = 'left' AND ABS(area.x / area.reference_width - 0.40) < 0.001 AND ABS(area.y / area.reference_height - 0.29) < 0.001)
  );
