import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { AssetImage } from "../common/AssetImage";
import { cn } from "../../utils/format";

interface CategoryCard {
  label: string;
  to: string;
  image: string | null;
  alt: string;
  expectedPath: string;
}

export function CategoryShowcase({ categoryCards }: { categoryCards: CategoryCard[] }) {
  return (
    <section className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-5 xl:grid-cols-5">
      {categoryCards.map((card) => (
        <Link
          key={card.label}
          to={card.to}
          className={cn("group relative overflow-hidden rounded-[16px] bg-white shadow-card md:rounded-[28px]", card.to === "/lifestyle" && "col-span-2 md:col-span-1")}
        >
          <AssetImage
            src={card.image}
            alt={card.alt}
            expectedPath={card.expectedPath}
            missingLabel="Category image is missing"
            imageClassName={cn("aspect-[1/1.08] w-full object-cover transition duration-500 ease-luxe group-hover:scale-[1.04] md:aspect-[16/10] xl:aspect-[1/1.08]", card.to === "/lifestyle" && "aspect-[2.08/1] md:aspect-[16/10] xl:aspect-[1/1.08]")}
            fallbackClassName={cn("aspect-[1/1.08] w-full md:aspect-[16/10] xl:aspect-[1/1.08]", card.to === "/lifestyle" && "aspect-[2.08/1] md:aspect-[16/10] xl:aspect-[1/1.08]")}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-3.5 md:gap-4 md:p-5">
            <span className="font-heading text-lg font-extrabold tracking-tight text-white md:text-3xl">
              {card.label}
            </span>
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow text-brand-black transition duration-300 ease-luxe group-hover:translate-x-1 md:h-11 md:w-11">
              <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
            </span>
          </div>
        </Link>
      ))}
    </section>
  );
}
