import fabLogo from "../../assets/FabCoutur.png";
import { cn } from "../../utils/format";

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({ className, alt = "FabPODD — Print on Demand" }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 overflow-hidden", className)}>
      <img
        src={fabLogo}
        alt={alt}
        className="h-full w-full object-contain"
      />
    </span>
  );
}
