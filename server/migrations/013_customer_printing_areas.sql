-- Additive per-view printing-area controls. Existing rows remain fixed and keep
-- their current natural-image print rectangle until an administrator opts in.
ALTER TABLE custom_print_areas
  ADD COLUMN printing_area_mode ENUM('fixed', 'customer_adjustable') NOT NULL DEFAULT 'fixed' AFTER height,
  ADD COLUMN default_area JSON NULL AFTER printing_area_mode,
  ADD COLUMN safe_boundary_type ENUM('rectangle', 'polygon', 'mask') NOT NULL DEFAULT 'rectangle' AFTER default_area,
  ADD COLUMN garment_safe_area JSON NULL AFTER safe_boundary_type,
  ADD COLUMN garment_safe_polygon JSON NULL AFTER garment_safe_area,
  ADD COLUMN garment_mask_url VARCHAR(1000) NULL AFTER garment_safe_polygon,
  ADD COLUMN safe_area_version VARCHAR(80) NOT NULL DEFAULT 'legacy-1' AFTER garment_mask_url,
  ADD COLUMN min_width_normalized DECIMAL(7,6) NOT NULL DEFAULT 0.050000 AFTER safe_area_version,
  ADD COLUMN min_height_normalized DECIMAL(7,6) NOT NULL DEFAULT 0.050000 AFTER min_width_normalized,
  ADD COLUMN max_width_normalized DECIMAL(7,6) NOT NULL DEFAULT 1.000000 AFTER min_height_normalized,
  ADD COLUMN max_height_normalized DECIMAL(7,6) NOT NULL DEFAULT 1.000000 AFTER max_width_normalized,
  ADD COLUMN allow_move TINYINT(1) NOT NULL DEFAULT 0 AFTER max_height_normalized,
  ADD COLUMN allow_resize TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_move,
  ADD COLUMN allow_custom_area_selection TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_resize;

UPDATE custom_print_areas
SET default_area = JSON_OBJECT(
      'x', x / reference_width,
      'y', y / reference_height,
      'width', width / reference_width,
      'height', height / reference_height
    ),
    garment_safe_area = JSON_OBJECT('x', 0, 'y', 0, 'width', 1, 'height', 1)
WHERE default_area IS NULL OR garment_safe_area IS NULL;

ALTER TABLE customisation_orders
  ADD COLUMN printing_areas JSON NULL AFTER canvas_json,
  ADD COLUMN safe_area_versions JSON NULL AFTER printing_areas,
  ADD COLUMN high_resolution_files JSON NULL AFTER original_artwork_urls,
  ADD COLUMN dpi_warning_status JSON NULL AFTER high_resolution_files,
  ADD COLUMN physical_output_dimensions JSON NULL AFTER dpi_warning_status;
