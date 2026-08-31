ALTER TABLE custom_products
  ADD COLUMN viewer_mode ENUM('auto', 'real3d', 'image360') NOT NULL DEFAULT 'auto' AFTER model_url,
  ADD COLUMN model_format ENUM('glb', 'gltf', 'obj') NULL AFTER viewer_mode,
  ADD COLUMN model_scale DECIMAL(10,4) NOT NULL DEFAULT 1 AFTER model_format,
  ADD COLUMN model_position JSON NULL AFTER model_scale,
  ADD COLUMN model_rotation JSON NULL AFTER model_position,
  ADD COLUMN material_names JSON NULL AFTER model_rotation,
  ADD COLUMN model_artwork_mappings JSON NULL AFTER material_names;
