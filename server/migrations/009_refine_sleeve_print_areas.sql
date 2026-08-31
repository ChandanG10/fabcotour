-- Refine only the side rectangles introduced by migration 008 after checking
-- them against the actual right/left garment mockups.
UPDATE custom_print_areas
SET
  x = CASE side WHEN 'right' THEN reference_width * 0.45 ELSE reference_width * 0.40 END,
  y = CASE side WHEN 'right' THEN reference_height * 0.25 ELSE reference_height * 0.29 END,
  width = reference_width * 0.18,
  height = reference_height * 0.24
WHERE
  side IN ('right', 'left')
  AND ABS(y / reference_height - 0.29) < 0.001
  AND ABS(width / reference_width - 0.28) < 0.001
  AND ABS(height / reference_height - 0.25) < 0.001
  AND (
    (side = 'right' AND ABS(x / reference_width - 0.32) < 0.001)
    OR
    (side = 'left' AND ABS(x / reference_width - 0.40) < 0.001)
  );
