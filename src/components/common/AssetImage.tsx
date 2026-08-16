import { useEffect, useMemo, useState } from "react";
import { cn } from "../../utils/format";

const loggedMissingAssets = new Set<string>();

const productGalleryLabels = ["main", "alternate-1", "alternate-2", "detail"];

export const isGeneratedPlaceholderAsset = (src?: string | null) =>
  !src ||
  src.startsWith("data:image/svg+xml") ||
  /^\/products\/.+\.svg$/i.test(src) ||
  /fab-couture-hero\.webp$/i.test(src);

const logMissingAsset = (message: string, expectedPath: string, src?: string | null) => {
  const logKey = `${message}:${expectedPath}`;
  if (loggedMissingAssets.has(logKey)) {
    return;
  }

  loggedMissingAssets.add(logKey);
  console.error(message, { expectedPath, src });
};

export const defaultProductAssetPath = (slug: string, index = 0) =>
  `src/assets/products/${slug}/${productGalleryLabels[index] ?? `image-${index + 1}`}.webp`;

export const defaultCategoryAssetPath = (slug: string) => {
  if (slug === "men") {
    return "src/assets/home/categories/men-category.png";
  }

  if (slug === "women") {
    return "src/assets/home/categories/women-category.png";
  }

  if (slug === "kids") {
    return "src/assets/home/categories/kids-category.png";
  }

  if (slug === "corporate-gifting") {
    return "src/assets/home/categories/corporate-gifts-category.png";
  }

  return `src/assets/categories/${slug}.webp`;
};

interface AssetImageProps {
  src?: string | null;
  alt: string;
  expectedPath: string;
  missingLabel: string;
  imageClassName?: string;
  fallbackClassName?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "auto" | "high" | "low";
}

export function AssetImage({
  src,
  alt,
  expectedPath,
  missingLabel,
  imageClassName,
  fallbackClassName,
  loading = "lazy",
  fetchPriority = "auto"
}: AssetImageProps) {
  const [assetFailed, setAssetFailed] = useState(false);
  const missing = useMemo(
    () => assetFailed || isGeneratedPlaceholderAsset(src),
    [assetFailed, src]
  );

  useEffect(() => {
    if (!missing) {
      return;
    }

    logMissingAsset(`${missingLabel}.`, expectedPath, src);
  }, [expectedPath, missing, missingLabel, src]);

  if (missing) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-[#F6F2E8] px-5 py-8 text-center",
          fallbackClassName
        )}
      >
        <div className="max-w-sm">
          <p className="text-sm font-semibold text-brand-black">{missingLabel}</p>
          <p className="mt-2 text-xs leading-6 text-brand-muted">Expected asset: {expectedPath}</p>
        </div>
      </div>
    );
  }

  return (
    <img
      src={src ?? undefined}
      alt={alt}
      className={imageClassName}
      loading={loading}
      {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
      onError={() => {
        logMissingAsset(`${missingLabel}.`, expectedPath, src);
        setAssetFailed(true);
      }}
    />
  );
}
