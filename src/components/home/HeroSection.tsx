import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import mobileHeroReference from "../../assets/home/hero/fab-couture-mobile-reference.jpg";
import { AssetImage } from "../common/AssetImage";

const reducedEasing = [0.22, 1, 0.36, 1] as const;
const heroAssetPath = "src/assets/home/hero/fab-couture-family-hero.webp";
const mobileHeroAssetPath = "src/assets/home/hero/fab-couture-mobile-reference.jpg";

export function HeroSection({
  heading,
  description,
  primaryButtonLabel,
  primaryButtonLink,
  secondaryButtonLabel,
  secondaryButtonLink,
  badge,
  images
}: {
  heading: string;
  description: string;
  primaryButtonLabel: string;
  primaryButtonLink: string;
  secondaryButtonLabel: string;
  secondaryButtonLink: string;
  badge: string;
  images: Array<{
    id: string;
    imageUrl: string | null;
    imagePublicId: string | null;
    sortOrder: number;
  }>;
}) {
  const slides = useMemo(
    () =>
      images
        .filter((image) => image.imageUrl)
        .slice()
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [images]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const hasHeroImage = slides.length > 0;
  const activeImage = slides[activeIndex]?.imageUrl ?? null;

  useEffect(() => {
    if (slides.length <= 1) {
      setActiveIndex(0);
      return;
    }

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % slides.length);
    }, 4500);

    return () => window.clearInterval(intervalId);
  }, [slides.length]);

  return (
    <section className="hero relative overflow-hidden rounded-[22px] bg-[#FBF6ED] md:rounded-[28px]">
      {hasHeroImage ? (
        <div className="absolute inset-0 hidden lg:block">
          <AssetImage
            src={activeImage}
            alt="Fabpodd custom clothing for men, women and kids with corporate gifts"
            expectedPath={heroAssetPath}
            missingLabel="Hero image is missing"
            imageClassName="hero-stage-image"
            fallbackClassName="hero-stage-image"
            loading="eager"
            fetchPriority="high"
          />
        </div>
      ) : null}

      {hasHeroImage ? (
        <>
          <div className="mt-[14px] overflow-visible md:hidden">
            <section className="overflow-hidden rounded-[22px] border border-black/6 bg-[#FBF6ED] shadow-[0_18px_40px_rgba(17,24,39,0.08)]">
              <div className="relative">
                <picture>
                  <img
                    src={activeImage ?? mobileHeroReference}
                    alt="Custom printed fashion for men, women and kids"
                    className="block aspect-[1.45/1] w-full object-cover object-[70%_center] min-[390px]:aspect-[4/3]"
                    loading="eager"
                  />
                </picture>
              </div>

              <div className="bg-[#FBF6ED] px-[18px] pb-5 pt-[22px] text-left">
                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.04, ease: reducedEasing }}
                  className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.1em] text-brand-charcoal shadow-sm"
                >
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-brand-orange/20 text-brand-navy">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span>{badge.split("•")[0]?.trim() ?? badge}</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, ease: reducedEasing }}
                  className="mt-5 w-full font-heading text-[clamp(36px,10.5vw,46px)] font-extrabold leading-[0.98] tracking-[-0.04em] text-brand-black [overflow-wrap:normal] [word-break:normal]"
                >
                  Wear Your Imagination.
                </motion.h1>

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.08, ease: reducedEasing }}
                  className="mt-[14px] max-w-[340px] text-[16px] leading-[1.5] text-[#667085]"
                >
                  {description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.14, ease: reducedEasing }}
                  className="mt-5 grid grid-cols-1 gap-[10px] w-full"
                >
                  <Link
                    to={primaryButtonLink}
                    className="inline-flex h-[52px] w-full items-center justify-between rounded-full bg-brand-cyan px-[18px] text-[16px] font-bold text-brand-navy"
                  >
                    <span className="whitespace-nowrap">{primaryButtonLabel}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                  <Link
                    to={secondaryButtonLink}
                    className="inline-flex h-[52px] w-full items-center justify-between rounded-full border border-[#111827] bg-white px-[18px] text-[16px] font-bold text-brand-charcoal"
                  >
                    <span className="whitespace-nowrap">{secondaryButtonLabel}</span>
                    <ArrowRight className="h-4 w-4 shrink-0" />
                  </Link>
                </motion.div>
              </div>
            </section>
          </div>

          <div className="relative z-10 hidden overflow-hidden bg-[#FBF6ED] md:block lg:hidden">
            <div className="relative h-[472px] overflow-hidden bg-[#FBF6ED] min-[390px]:h-[492px] min-[430px]:h-[510px]">
              <div className="absolute inset-0">
                <AssetImage
                  src={mobileHeroReference}
                  alt="Fabpodd custom clothing for men, women and kids with corporate gifts"
                  expectedPath={mobileHeroAssetPath}
                  missingLabel="Hero image is missing"
                  imageClassName="h-full w-full object-cover object-[66%_center] min-[390px]:object-[68%_center] min-[430px]:object-[70%_center]"
                  fallbackClassName="h-full w-full object-cover object-[66%_center] min-[390px]:object-[68%_center] min-[430px]:object-[70%_center]"
                  loading="eager"
                  fetchPriority="high"
                />
              </div>
              <div className="absolute inset-y-0 left-0 z-10 w-[57%] bg-[linear-gradient(90deg,rgba(251,246,237,0.98)_0%,rgba(251,246,237,0.97)_60%,rgba(251,246,237,0.78)_78%,rgba(251,246,237,0.18)_92%,rgba(251,246,237,0)_100%)]" />
              <div className="relative z-20 flex h-full w-[51%] max-w-[198px] flex-col px-4 pb-4 pt-4 min-[390px]:max-w-[208px] min-[430px]:max-w-[216px] min-[430px]:px-5">
                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.04, ease: reducedEasing }}
                  className="inline-flex max-w-max items-center gap-2 rounded-full border border-[#E8E5DF] bg-white px-3.5 py-2.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-brand-charcoal shadow-sm min-[390px]:px-4 min-[390px]:text-[11px]"
                >
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-black">
                    <Sparkles className="h-3.5 w-3.5" />
                  </span>
                  <span>{badge.split("•")[0]?.trim() ?? badge}</span>
                </motion.div>

                <motion.h1
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, ease: reducedEasing }}
                  className="mt-5 max-w-[6.6ch] font-heading text-[clamp(38px,11vw,52px)] font-extrabold leading-[0.94] tracking-[-0.06em] text-brand-black"
                >
                  {heading.includes("Wear Your Imagination") ? (
                    <>
                      Wear
                      <br />
                      Your
                      <br />
                      Imagination.
                    </>
                  ) : (
                    heading.split("\n").map((line, index, array) => (
                      <span key={`${line}-${index}`}>
                        {line}
                        {index < array.length - 1 ? <br /> : null}
                      </span>
                    ))
                  )}
                  {!heading.includes("Wear Your Imagination") ? (
                    <span className="ml-2 inline-block h-3.5 w-3.5 rounded-full bg-brand-yellow align-middle" />
                  ) : null}
                </motion.h1>

                <span className="mt-4 h-3.5 w-3.5 rounded-full bg-brand-pink" />

                <motion.p
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.08, ease: reducedEasing }}
                  className="mt-4 max-w-[11ch] text-[15px] leading-[1.5] text-brand-muted min-[390px]:max-w-[12.2ch] min-[390px]:text-[16px]"
                >
                  {description}
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.65, delay: 0.14, ease: reducedEasing }}
                  className="mt-auto flex max-w-[236px] flex-col gap-2.5 pt-4"
                >
                  <Link to={primaryButtonLink} className="button-primary min-h-[48px] rounded-full px-4 text-[15px] min-[390px]:min-h-[50px] min-[390px]:text-[16px]">
                    {primaryButtonLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                  <Link to={secondaryButtonLink} className="button-secondary min-h-[48px] rounded-full px-4 text-[15px] min-[390px]:min-h-[50px] min-[390px]:text-[16px]">
                    {secondaryButtonLabel}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </motion.div>
              </div>
            </div>

            {slides.length > 1 ? (
              <div className="absolute right-4 top-4 z-30 flex flex-col items-center gap-2">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id}
                    type="button"
                    aria-label={`Go to hero slide ${index + 1}`}
                    aria-pressed={index === activeIndex}
                    onClick={() => setActiveIndex(index)}
                    className={`rounded-full transition-all ${index === activeIndex ? "h-3 w-3 bg-brand-yellow" : "h-2.5 w-2.5 bg-brand-black/28 hover:bg-brand-black/4"}`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        </>
      ) : null}

      <div
        className={
          hasHeroImage
            ? "relative z-10 hidden lg:flex lg:min-h-[560px] lg:items-center"
            : "grid grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] items-stretch gap-0 lg:grid-cols-[minmax(0,0.42fr)_minmax(0,0.58fr)]"
        }
      >
        <div className="relative z-10 col-span-1 flex flex-col justify-center px-5 py-7 sm:px-7 sm:py-8 lg:w-[42%] lg:py-10 lg:pl-12 lg:pr-10 xl:py-12 xl:pl-14 xl:pr-12">
          {hasHeroImage ? (
            <>
              <div className="pointer-events-none absolute -left-12 bottom-12 hidden lg:block">
                <div className="grid h-[92px] w-[92px] grid-cols-4 gap-3 opacity-45">
                  {Array.from({ length: 16 }).map((_, index) => (
                    <span key={index} className="h-1.5 w-1.5 rounded-full bg-brand-black" />
                  ))}
                </div>
              </div>
              <div className="pointer-events-none absolute -left-16 bottom-0 hidden h-32 w-32 rounded-full bg-brand-cyan lg:block" />
            </>
          ) : null}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.04, ease: reducedEasing }}
            className="mb-5 hidden max-w-max items-center gap-3 rounded-full border border-[#E8E5DF] bg-white px-4 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-brand-charcoal shadow-sm sm:mb-6 sm:px-5 sm:py-4 sm:text-sm lg:hidden"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-black">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>{badge.split("•")[0]?.trim() ?? badge}</span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, ease: reducedEasing }}
            className="max-w-xl font-heading text-[3.35rem] font-extrabold leading-[0.96] tracking-tight text-brand-black sm:text-[4.2rem] lg:text-[5.5rem]"
          >
            {heading.split("\n").map((line, index, array) => (
              <span key={`${line}-${index}`}>
                {line}
                {index < array.length - 1 ? <br /> : null}
              </span>
            ))}
            <span className="ml-2 inline-block h-4 w-4 rounded-full bg-brand-pink align-middle sm:h-5 sm:w-5" />
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.08, ease: reducedEasing }}
            className="mt-4 max-w-xl text-[1.05rem] leading-8 text-brand-muted sm:mt-6 sm:text-lg sm:leading-9"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.14, ease: reducedEasing }}
            className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row"
          >
            <Link to={primaryButtonLink} className="button-primary min-h-14 rounded-full px-6 text-base sm:px-8">
              {primaryButtonLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link to={secondaryButtonLink} className="button-secondary min-h-14 rounded-full px-6 text-base sm:px-8">
              {secondaryButtonLabel}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.2, ease: reducedEasing }}
            className="mt-6 hidden max-w-max items-center gap-3 rounded-full border border-[#E8E5DF] bg-white px-4 py-3 text-[0.78rem] font-semibold uppercase tracking-[0.08em] text-brand-charcoal shadow-sm sm:mt-8 sm:px-5 sm:py-4 sm:text-sm lg:inline-flex"
          >
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-brand-yellow/20 text-brand-black">
              <Sparkles className="h-4 w-4" />
            </span>
            <span>{badge}</span>
          </motion.div>

          {slides.length > 1 ? (
            <div className="mt-5 flex items-center gap-2 lg:mt-8">
              {slides.map((slide, index) => (
                <button
                  key={slide.id}
                  type="button"
                  aria-label={`Go to hero slide ${index + 1}`}
                  aria-pressed={index === activeIndex}
                  onClick={() => setActiveIndex(index)}
                  className={`h-2.5 rounded-full transition-all ${index === activeIndex ? "w-8 bg-brand-pink" : "w-2.5 bg-brand-black/20 hover:bg-brand-black/35"}`}
                />
              ))}
            </div>
          ) : null}
        </div>

        {hasHeroImage ? null : (
          <motion.div
            initial={{ opacity: 0, y: 26 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.75, delay: 0.08, ease: reducedEasing }}
            className="relative -ml-6 min-h-[520px] overflow-hidden bg-[#F8F1E3] sm:-ml-10 lg:ml-0 lg:min-h-[560px]"
          >
            <div className="pointer-events-none absolute right-[6%] top-[10%] h-[54%] w-[62%] rounded-full bg-brand-orange/95 sm:right-[10%] sm:top-[12%] sm:h-[58%] sm:w-[58%]" />
            <div className="pointer-events-none absolute left-[2%] top-[56%] hidden h-[120px] w-[120px] grid-cols-5 gap-[1px] opacity-35 sm:grid lg:left-[4%] lg:top-[44%] lg:h-[180px] lg:w-[180px]">
              {Array.from({ length: 25 }).map((_, index) => (
                <span key={index} className="border border-black/25" />
              ))}
            </div>
            <div className="relative z-10 h-full">
              <AssetImage
                src={null}
                alt="Fabpodd custom clothing for men, women and kids with corporate gifts"
                expectedPath={heroAssetPath}
                missingLabel="Hero image is missing"
                imageClassName="hero-image"
                fallbackClassName="hero-image"
                loading="eager"
                fetchPriority="high"
              />
            </div>
          </motion.div>
        )}
      </div>
    </section>
  );
}
