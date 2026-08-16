import fabLogo from "../../assets/FabCoutur.png";
import { cn } from "../../utils/format";

interface BrandLogoProps {
  className?: string;
  alt?: string;
}

export function BrandLogo({ className, alt = "FAB COUTURE" }: BrandLogoProps) {
  return (
    <span className={cn("inline-flex shrink-0 overflow-hidden", className)}>
      <img
        src={fabLogo}
        alt={alt}
        className="h-full w-full max-w-full origin-center object-contain [transform:translateY(-2%)_scale(1.3)] sm:w-auto sm:max-w-none sm:origin-left sm:[transform:translateX(1%)_translateY(1%)_scale(1.08)] lg:[transform:translateX(2%)_translateY(1%)_scale(1.78)]"
      />
    </span>
  );
}
