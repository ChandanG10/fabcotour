import type { Product, ProductImageAsset } from "../types/models";

export type ProductView = "front" | "back" | "left" | "right";

export interface ProductPreviewAsset {
  src: string;
  asset?: ProductImageAsset;
}

const normalize = (value?: string | null) =>
  (value ?? "").toLowerCase().replace(/grey/g, "gray").replace(/[^a-z0-9]+/g, " ").trim();

function sortedAssets(product: Product): ProductImageAsset[] {
  if (product.imageAssets?.length) {
    return [...product.imageAssets].sort((left, right) => left.sortOrder - right.sortOrder);
  }

  return product.images.map((imageUrl, index) => ({
    id: `${product.id}-image-${index}`,
    imageUrl,
    altText: null,
    sortOrder: index,
    isPrimary: index === 0,
    variantColor: null,
    variantSize: null,
    variantView: null,
    isVariantPrimary: false
  }));
}

function sortMappedAssets(assets: ProductImageAsset[]) {
  return [...assets].sort((left, right) => {
    const primaryDifference = Number(Boolean(right.isVariantPrimary)) - Number(Boolean(left.isVariantPrimary));
    return primaryDifference || left.sortOrder - right.sortOrder;
  });
}

function appendSharedAssets(
  mappedAssets: ProductImageAsset[],
  sharedAssets: ProductImageAsset[]
): ProductImageAsset[] {
  const mapped = sortMappedAssets(mappedAssets);
  const mappedIds = new Set(mapped.map((asset) => asset.id));
  return [...mapped, ...sharedAssets.filter((asset) => !mappedIds.has(asset.id))];
}

export function resolveProductGallery(product: Product, color: string, size: string): ProductImageAsset[] {
  const assets = sortedAssets(product);
  // Images without a colour assignment are shared gallery content (for example,
  // fabric details and size charts) and should remain visible for every variant.
  const sharedAssets = assets.filter((asset) => !asset.variantColor);
  const colorAssets = assets.filter(
    (asset) => asset.variantColor && normalize(asset.variantColor) === normalize(color)
  );

  if (!colorAssets.length) {
    if (sharedAssets.length) {
      return sharedAssets;
    }
    const primaryAsset = assets.find((asset) => asset.isPrimary) ?? assets[0];
    return primaryAsset ? [primaryAsset] : [];
  }

  const sizeAssets = colorAssets.filter(
    (asset) => asset.variantSize && normalize(asset.variantSize) === normalize(size)
  );
  if (sizeAssets.length) {
    return appendSharedAssets(sizeAssets, sharedAssets);
  }

  const allSizeAssets = colorAssets.filter(
    (asset) => !asset.variantSize || normalize(asset.variantSize) === "all sizes"
  );
  if (allSizeAssets.length) {
    return appendSharedAssets(allSizeAssets, sharedAssets);
  }

  return appendSharedAssets(colorAssets, sharedAssets);
}

export function resolveProductPreview(
  product: Product,
  color: string,
  size: string,
  view: ProductView
): ProductPreviewAsset {
  const colorAssets = sortedAssets(product).filter(
    (asset) => asset.variantColor && normalize(asset.variantColor) === normalize(color)
  );
  const exactViewAsset = sortMappedAssets(colorAssets.filter(
    (asset) =>
      asset.variantView === view &&
      asset.variantSize &&
      normalize(asset.variantSize) === normalize(size)
  ))[0];
  const allSizesViewAsset = sortMappedAssets(colorAssets.filter(
    (asset) =>
      asset.variantView === view &&
      (!asset.variantSize || normalize(asset.variantSize) === "all sizes")
  ))[0];
  const gallery = resolveProductGallery(product, color, size);
  const viewAssets = gallery.filter((asset) => asset.variantView === view);
  const asset = exactViewAsset ?? allSizesViewAsset ?? sortMappedAssets(viewAssets)[0] ?? gallery[0];
  return { src: asset?.imageUrl ?? product.images[0] ?? "", asset };
}

export function findProductVariant(product: Product, color: string, size: string) {
  const normalizedColor = normalize(color);
  const normalizedSize = normalize(size);
  return (
    product.variants.find(
      (variant) => normalize(variant.color) === normalizedColor && normalize(variant.size) === normalizedSize
    ) ??
    product.variants.find((variant) => normalize(variant.color) === normalizedColor) ??
    product.variants[0]
  );
}
