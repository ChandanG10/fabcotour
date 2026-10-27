import { UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "../../utils/format";

interface CustomerAvatarProps {
  src?: string;
  name: string;
  className?: string;
  iconClassName?: string;
  decorative?: boolean;
}

export function CustomerAvatar({
  src,
  name,
  className,
  iconClassName,
  decorative = false
}: CustomerAvatarProps) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
  }, [src]);

  const showImage = Boolean(src) && !imageFailed;

  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-full bg-brand-black text-white",
        className
      )}
      role={!decorative && !showImage ? "img" : undefined}
      aria-label={!decorative && !showImage ? `${name} profile picture` : undefined}
      aria-hidden={decorative ? true : undefined}
    >
      {showImage ? (
        <img
          src={src}
          alt={decorative ? "" : `${name} profile picture`}
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
          decoding="async"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <UserRound className={cn("h-4 w-4", iconClassName)} aria-hidden="true" />
      )}
    </span>
  );
}
