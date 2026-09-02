import { ArrowRight, PackageCheck, Sparkles, SwatchBook, Wand2 } from "lucide-react";
import { Link } from "react-router-dom";
import { Seo } from "../components/common/Seo";
import { EmptyState, LoadingState, SectionIntro } from "../components/common/Ui";
import { BenefitStrip } from "../components/home/BenefitStrip";
import { CategoryShowcase } from "../components/home/CategoryShowcase";
import { HeroSection } from "../components/home/HeroSection";
import { ProductSection } from "../components/home/ProductSection";
import { siteConfig } from "../constants/site";
import { useAsyncData } from "../hooks/useAsyncData";
import { storefrontService } from "../services/api";
import menCategoryImage from "../assets/home/categories/men-category.png";
import womenCategoryImage from "../assets/home/categories/women-category.png";
import kidsCategoryImage from "../assets/home/categories/kids-category.png";
import corporateGiftsCategoryImage from "../assets/home/categories/corporate-gifts-category.png";
import lifestyleCategoryImage from "../assets/home/categories/lifestyle-category.png";

const customisationSteps = [
  {
    title: "Choose the base product",
    copy: "Start with premium tees, hoodies, caps, drinkware or curated gifting kits.",
    icon: SwatchBook
  },
  {
    title: "Add artwork or text",
    copy: "Upload a logo, type a message, or build a design directly in the customiser.",
    icon: Wand2
  },
  {
    title: "Approve and receive",
    copy: "Preview the placement, confirm the order, and let production handle the rest.",
    icon: PackageCheck
  }
];

export default function HomePage() {
  const { data, loading, error } = useAsyncData(async () => {
    const [homepage, categories, allProducts, featuredProducts, newArrivalProducts] = await Promise.all([
      storefrontService.getHomepage(),
      storefrontService.getCategories(),
      storefrontService.getNormalizedProducts(),
      storefrontService.getNormalizedProducts({ featured: true }),
      storefrontService.getNormalizedProducts({ newArrival: true })
    ]);

    return { homepage, categories, allProducts, featuredProducts, newArrivalProducts };
  }, []);

  if (loading) {
    return (
      <div className="container-shell py-20">
        <LoadingState label="Loading homepage" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container-shell py-20">
        <EmptyState
          title="Homepage content is unavailable"
          description={error ?? "The homepage API did not return any data."}
        />
      </div>
    );
  }

  const { homepage, categories, allProducts, featuredProducts, newArrivalProducts } = data;
  const lifestyleCategory = categories.find((category) => !category.parentId && category.slug === "lifestyle");
  const configuredCategoryCards = homepage.categoryCards.length
    ? homepage.categoryCards
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder)
        .map((card) => ({
          label: card.title.toUpperCase(),
          to: card.link,
          image: card.imageUrl,
          alt: `${card.title} category image`,
          expectedPath: `homepage/${card.id}`
        }))
    : [
        { label: "MEN", to: "/shop/men", image: menCategoryImage, alt: "Men category image", expectedPath: "src/assets/home/categories/men-category.png" },
        { label: "WOMEN", to: "/shop/women", image: womenCategoryImage, alt: "Women category image", expectedPath: "src/assets/home/categories/women-category.png" },
        { label: "KIDS", to: "/shop/kids", image: kidsCategoryImage, alt: "Kids category image", expectedPath: "src/assets/home/categories/kids-category.png" },
        { label: "CORPORATE GIFTS", to: "/corporate-gifting", image: corporateGiftsCategoryImage, alt: "Corporate gifts category image", expectedPath: "src/assets/home/categories/corporate-gifts-category.png" }
      ];
  const hydratedCategoryCards = configuredCategoryCards.map((card) => card.to === "/lifestyle" || card.label.toLowerCase() === "lifestyle"
    ? { ...card, to: "/lifestyle", image: card.image || lifestyleCategory?.imageUrl || lifestyleCategoryImage, expectedPath: "src/assets/home/categories/lifestyle-category.png" }
    : card);
  const categoryCards = hydratedCategoryCards.some((card) => card.to === "/lifestyle" || card.label.toLowerCase() === "lifestyle")
    ? hydratedCategoryCards
    : [...hydratedCategoryCards, {
        label: "LIFESTYLE",
        to: "/lifestyle",
        image: lifestyleCategory?.imageUrl || lifestyleCategoryImage,
        alt: "Personalised Lifestyle essentials including a tote, bottle, mug and notebook",
        expectedPath: "src/assets/home/categories/lifestyle-category.png"
      }];

  const menEdit = allProducts.filter((product) => product.audience.includes("men")).slice(0, 4);
  const womenEdit = allProducts.filter((product) => product.audience.includes("women")).slice(0, 4);
  const kidsEdit = allProducts.filter((product) => product.audience.includes("kids")).slice(0, 4);
  const giftingEdit = allProducts.filter((product) => product.categoryId !== "" && product.audience.includes("unisex")).slice(0, 4);
  const featuredSelection = homepage.featuredSection.productIds.length
    ? allProducts.filter((product) => homepage.featuredSection.productIds.includes(product.id)).slice(0, 4)
    : featuredProducts.slice(0, 4);
  const newArrivalSelection = homepage.newArrivalsSection.productIds.length
    ? allProducts.filter((product) => homepage.newArrivalsSection.productIds.includes(product.id)).slice(0, 4)
    : newArrivalProducts.slice(0, 4);

  return (
    <>
      <Seo
        title="Custom Apparel, Prints and Corporate Gifting"
        description="Discover Fabpodd, a modern premium storefront for custom apparel, standout prints and thoughtful corporate gifts."
        structuredData={[
          {
            "@context": "https://schema.org",
            "@type": "Organization",
            name: siteConfig.name,
            description: siteConfig.description,
            url: siteConfig.baseUrl
          },
          {
            "@context": "https://schema.org",
            "@type": "WebSite",
            name: siteConfig.name,
            url: siteConfig.baseUrl
          }
        ]}
      />

      <div className="container-shell max-w-[480px] space-y-7 py-0 pb-32 md:max-w-[1440px] md:space-y-10 md:py-8">
        <HeroSection
          heading={homepage.hero.heading}
          description={homepage.hero.description}
          primaryButtonLabel={homepage.hero.primaryButtonLabel}
          primaryButtonLink={homepage.hero.primaryButtonLink}
          secondaryButtonLabel={homepage.hero.secondaryButtonLabel}
          secondaryButtonLink={homepage.hero.secondaryButtonLink}
          badge={homepage.hero.badge}
          images={homepage.hero.images}
        />

        <section className="pt-1 md:pt-0">
          <div className="mb-[14px] flex items-center justify-between md:mb-5">
            <h2 className="font-heading text-[26px] font-extrabold tracking-tight text-brand-black sm:text-[2.35rem]">
              Shop Your Style
            </h2>
          </div>
          <CategoryShowcase categoryCards={categoryCards} />
        </section>

        <ProductSection
          eyebrow="New In"
          title={homepage.newArrivalsSection.title || "New Arrivals"}
          description={homepage.newArrivalsSection.description || "Fresh custom-ready products with a cleaner premium presentation."}
          products={newArrivalSelection}
        />

        <BenefitStrip />

        <section className="grid gap-5 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="overflow-hidden rounded-[34px] bg-brand-charcoal p-8 text-white shadow-soft sm:p-10">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">
              Build Your Own
            </p>
            <h2 className="mt-4 max-w-lg font-heading text-4xl font-extrabold tracking-tight sm:text-5xl">
              Design apparel that looks intentional, not generic.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-white/74">
              From one-piece custom orders to team drops, the customiser gives customers a direct
              path from idea to preview to checkout.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link to="/customise" className="button-primary">
                Start Customising
              </Link>
              <Link
                to="/shop"
                className="inline-flex items-center justify-center rounded-full border border-white/20 bg-transparent px-6 py-3 text-sm font-semibold text-white transition duration-300 ease-luxe hover:-translate-y-0.5 hover:border-brand-cyan hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
              >
                Explore Products
              </Link>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {customisationSteps.map((step) => {
                const Icon = step.icon;
                return (
                  <div key={step.title} className="rounded-[24px] border border-white/10 bg-white/6 p-5">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-yellow text-brand-black">
                      <Icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 text-lg font-bold">{step.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/68">{step.copy}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[34px] border border-black/6 bg-white p-8 shadow-soft sm:p-9">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-muted">
                Corporate Gifting
              </p>
              <h2 className="mt-4 max-w-md font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">
                Branded gifts built for onboarding, events and festive drops.
              </h2>
              <p className="mt-4 max-w-lg text-sm leading-8 text-brand-muted sm:text-base">
                Gift boxes, notebooks, mugs and bottles sit in the same system as apparel, so the
                site can serve both direct customers and business buyers.
              </p>
              <Link to="/corporate-gifting" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-brand-black">
                Explore corporate gifting
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="rounded-[34px] border border-black/6 bg-[#F7F2E8] p-8 shadow-soft sm:p-9">
              <div className="flex items-center gap-3 text-brand-black">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-brand-yellow">
                  <Sparkles className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold uppercase tracking-[0.28em] text-brand-muted">
                  Why This Layout Works
                </span>
              </div>
              <div className="mt-5 space-y-4 text-sm leading-7 text-brand-charcoal/78">
                <p>Hero, categories and trust signals are visible without crowding the page.</p>
                <p>Products and images now come from the backend catalogue instead of repeated hard-coded mock cards.</p>
                <p>Homepage merchandising can be changed from the admin panel without touching frontend code.</p>
              </div>
            </div>
          </div>
        </section>

        <ProductSection
          eyebrow="Featured"
          title={homepage.featuredSection.title || "Featured Products"}
          description={homepage.featuredSection.description || "Editor-curated custom-ready products."}
          products={featuredSelection}
        />

        <ProductSection
          eyebrow="Men"
          title="Statement graphics and everyday staples for the men’s edit"
          description="The men’s collection now keeps its own imagery and product grouping instead of bleeding into other categories."
          products={menEdit}
        />

        <ProductSection
          eyebrow="Women"
          title="Women’s custom apparel with a softer, cleaner visual rhythm"
          description="Women’s product cards and detail links now align with the actual product set and stay visually distinct from men’s items."
          products={womenEdit}
        />

        <ProductSection
          eyebrow="Kids"
          title="Kidswear that now actually looks like kidswear"
          description="The earlier repeated adult imagery issue is replaced by category-aware product data from the backend."
          products={kidsEdit}
        />

        <section>
          <SectionIntro
            eyebrow="Shop By Product"
            title="Explore the catalogue by product type"
            description="Browse the current backend taxonomy without relying on embedded mock data."
          />
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {categories.slice(0, 4).map((category) => (
              <Link key={category.id} to={`/shop/${category.slug}`} className="group overflow-hidden rounded-[28px] border border-black/6 bg-white p-5 shadow-card transition duration-300 ease-luxe hover:-translate-y-1 hover:shadow-xl">
                <p className="text-xs font-semibold uppercase tracking-[0.26em] text-brand-black/45">{category.audience}</p>
                <h3 className="mt-3 font-heading text-2xl font-extrabold tracking-tight text-brand-black">{category.name}</h3>
                <p className="mt-3 text-sm leading-7 text-brand-muted">{category.description ?? "Curated premium products ready for customisation."}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-brand-black">
                  Browse category
                  <ArrowRight className="h-4 w-4 transition duration-300 ease-luxe group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </section>

        <ProductSection
          eyebrow="Corporate & Gifts"
          title="Useful branded merchandise and gift-ready products"
          description="This collection holds the gifting products together so they do not get visually lost inside the apparel-led rows."
          products={giftingEdit}
        />
      </div>
    </>
  );
}
