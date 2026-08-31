-- Upgrade only the original seeded/default print rectangles. Manually positioned
-- admin rectangles are intentionally left untouched.
UPDATE custom_print_areas
SET
  x = CASE side
    WHEN 'front' THEN reference_width * 0.31
    WHEN 'back' THEN reference_width * 0.30
    WHEN 'right' THEN reference_width * 0.45
    WHEN 'left' THEN reference_width * 0.40
  END,
  y = CASE side
    WHEN 'front' THEN reference_height * 0.22
    WHEN 'back' THEN reference_height * 0.18
    WHEN 'right' THEN reference_height * 0.25
    ELSE reference_height * 0.29
  END,
  width = CASE side
    WHEN 'front' THEN reference_width * 0.38
    WHEN 'back' THEN reference_width * 0.40
    ELSE reference_width * 0.18
  END,
  height = CASE side
    WHEN 'front' THEN reference_height * 0.62
    WHEN 'back' THEN reference_height * 0.65
    ELSE reference_height * 0.24
  END
WHERE
  ABS(y / reference_height - 0.282609) < 0.001
  AND ABS(height / reference_height - 0.358696) < 0.001
  AND (
    (side IN ('front', 'back') AND ABS(x / reference_width - 0.35) < 0.001 AND ABS(width / reference_width - 0.30) < 0.001)
    OR
    (side IN ('right', 'left') AND ABS(x / reference_width - 0.375) < 0.001 AND ABS(width / reference_width - 0.2375) < 0.001)
  );
