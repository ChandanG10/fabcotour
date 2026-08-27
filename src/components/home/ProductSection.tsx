import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { Product } from "../../types/models";
import { ProductCard, SectionIntro } from "../common/Ui";

export function ProductSection({
  eyebrow,
  title,
  description,
  products
}: {
  eyebrow: string;
  title: string;
  description: string;
  products: Product[];
}) {
  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-4 md:hidden">
        <div>
          <h2 className="font-heading text-[26px] font-extrabold tracking-tight text-brand-black">{title}</h2>
          <p className="mt-2 text-[16px] leading-6 text-brand-muted">{description}</p>
        </div>
        <Link to="/shop" className="inline-flex shrink-0 items-center gap-1 text-[15px] font-semibold text-brand-black">
          View All
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="hidden md:block">
        <SectionIntro
          eyebrow={eyebrow}
          title={title}
          description={description}
          action={
            <Link to="/shop" className="inline-flex items-center gap-2 text-sm font-semibold text-brand-black">
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>

      <div className="grid grid-cols-2 gap-3 pb-2 md:gap-4 md:pb-0 lg:grid-cols-3 xl:grid-cols-4">
        {products.map((product) => (
          <div key={product.id} className="h-full min-w-0">
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
