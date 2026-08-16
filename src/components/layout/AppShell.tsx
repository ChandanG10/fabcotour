import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Facebook,
  Gift,
  Heart,
  House,
  Instagram,
  LayoutGrid,
  Menu,
  PencilLine,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  X
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { navLinks, siteConfig } from "../../constants/site";
import { storefrontService } from "../../services/api";
import type { Product } from "../../types/models";
import { useAppStore } from "../../store/useAppStore";
import { cn } from "../../utils/format";
import { AssetImage, defaultProductAssetPath } from "../common/AssetImage";
import { BrandLogo } from "../common/BrandLogo";

const footerGroups = [
  {
    title: "Shop",
    links: [
      { label: "New In", to: "/shop" },
      { label: "Men", to: "/shop/men" },
      { label: "Women", to: "/shop/women" },
      { label: "Kids", to: "/shop/kids" }
    ]
  },
  {
    title: "Services",
    links: [
      { label: "Customise", to: "/customise" },
      { label: "Corporate Gifting", to: "/corporate-gifting" },
      { label: "Bulk Orders", to: "/bulk-orders" },
      { label: "Start Selling", to: "/start-selling" }
    ]
  },
  {
    title: "Support",
    links: [
      { label: "Contact", to: "/contact" },
      { label: "Track Order", to: "/track-order" },
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms-and-conditions" }
    ]
  }
];

export function AppShell() {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const cartCount = useAppStore((state) => state.cart.length);
  const wishlistCount = useAppStore((state) => state.wishlist.length);
  const mobileTabs = [
    { label: "Home", to: "/", icon: House, exact: true },
    { label: "Shop", to: "/shop", icon: LayoutGrid },
    { label: "Customise", to: "/customise", icon: PencilLine },
    { label: "Wishlist", to: "/account#wishlist", icon: Heart },
    { label: "Bag", to: "/cart", icon: ShoppingBag, badge: cartCount }
  ];

  useEffect(() => {
    const onScroll = () => {
      setCompactHeader(window.scrollY > 24);
      setShowTop(window.scrollY > 420);
    };

    onScroll();
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const next = search.trim()
          ? await storefrontService.searchProducts(search.trim())
          : await storefrontService.getNormalizedProducts();
        if (!cancelled) {
          setSuggestions(next.slice(0, 6));
        }
      } catch {
        if (!cancelled) {
          setSuggestions([]);
        }
      }
    };

    void run();

    return () => {
      cancelled = true;
    };
  }, [search]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-cream md:bg-brand-cream">
      <div className="announcement-bar sticky top-0 z-[60] bg-brand-black text-white">
        <div className="container-shell hidden h-full items-center justify-center gap-4 text-[11px] font-medium tracking-[0.12em] md:flex">
          <TopBarItem icon={<Gift className="h-3.5 w-3.5 text-brand-yellow" />}>
            Free shipping on orders above ₹999
          </TopBarItem>
          <span className="text-brand-yellow">•</span>
          <TopBarItem icon={<RotateCcw className="h-3.5 w-3.5 text-brand-yellow" />}>
            Easy 30-day returns
          </TopBarItem>
          <span className="text-brand-yellow">•</span>
          <TopBarItem icon={<ShieldCheck className="h-3.5 w-3.5 text-brand-yellow" />}>
            Secure payments
          </TopBarItem>
        </div>
        <div className="container-shell flex h-full items-center justify-center gap-2 text-[13px] font-medium md:hidden">
          <Gift className="h-3.5 w-3.5 text-brand-yellow" />
          <span>Free shipping above ₹999</span>
        </div>
      </div>

      <header
        className={cn(
          "main-header sticky top-[var(--announcement-height)] z-50 border-b border-black/6 bg-white/96 backdrop-blur-xl transition-all duration-300 ease-luxe",
          compactHeader && "shadow-soft"
        )}
      >
        <div className="container-shell relative max-w-[480px] h-full md:max-w-[1440px]">
          <div className="grid h-full grid-cols-[44px_1fr_44px_44px] items-center gap-0 lg:grid-cols-[auto_1fr_auto] lg:gap-10">
            <div className="flex items-center justify-start lg:hidden">
              <button
                type="button"
                aria-label="Open menu"
                className="nav-icon-button mobile-nav-icon relative z-10"
                onClick={() => setMobileOpen((value) => !value)}
              >
                {mobileOpen ? <X className="h-[22px] w-[22px]" /> : <Menu className="h-[22px] w-[22px]" />}
              </button>
            </div>

            <Link
              to="/"
              className="col-start-2 row-start-1 z-10 justify-self-center lg:relative lg:left-auto lg:top-auto lg:col-start-auto lg:translate-x-0 lg:translate-y-0 lg:justify-self-start"
              aria-label="FAB COUTURE home"
            >
              <BrandLogo
                className={cn(
                  "transition-all duration-300 ease-luxe",
                  compactHeader
                    ? "h-[44px] w-[188px] sm:h-[42px] sm:w-[172px] lg:h-[50px] lg:w-[238px]"
                    : "h-[44px] w-[188px] sm:h-[46px] sm:w-[186px] lg:h-[56px] lg:w-[264px]"
                )}
              />
            </Link>

            <nav className="hidden items-center justify-center gap-11 lg:flex">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to + link.label}
                  to={link.to}
                  className={({ isActive }) =>
                    cn(
                      "relative py-2 text-[1rem] font-semibold text-brand-charcoal/78 transition duration-300 ease-luxe hover:text-brand-black",
                      "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-brand-yellow after:transition-transform after:duration-300 after:ease-luxe hover:after:scale-x-100",
                      isActive && "text-brand-black after:scale-x-100"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>

            <button
              type="button"
              aria-label="Open search"
              className="nav-icon-button mobile-nav-icon col-start-3 row-start-1 z-10 justify-self-center lg:hidden"
              onClick={() => setSearchOpen((value) => !value)}
            >
              <Search className="h-[22px] w-[22px]" />
            </button>

            <NavLink to="/cart" aria-label="Cart" className="nav-icon-button mobile-nav-icon col-start-4 row-start-1 z-10 justify-self-center lg:hidden">
              <ShoppingBag className="h-[22px] w-[22px]" />
              {cartCount > 0 ? <span className="badge-dot">{cartCount}</span> : null}
            </NavLink>

            <div className="hidden items-center gap-3 lg:flex lg:justify-self-end">
              <button
                type="button"
                aria-label="Open search"
                className="nav-icon-button"
                onClick={() => setSearchOpen((value) => !value)}
              >
                <Search className="h-4 w-4" />
              </button>
              <NavLink to="/account#wishlist" aria-label="Wishlist" className="nav-icon-button">
                <Heart className="h-4 w-4" />
                {wishlistCount > 0 ? <span className="badge-dot">{wishlistCount}</span> : null}
              </NavLink>
              <NavLink to="/cart" aria-label="Cart" className="nav-icon-button">
                <ShoppingBag className="h-4 w-4" />
                {cartCount > 0 ? <span className="badge-dot">{cartCount}</span> : null}
              </NavLink>
            </div>
          </div>

          <AnimatePresence>
            {searchOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute left-0 right-0 top-full mt-2 rounded-[22px] border border-black/6 bg-white p-4 shadow-soft sm:rounded-[28px]"
              >
                <div className="flex items-center gap-3 rounded-full border border-black/10 bg-brand-cream px-4 py-3">
                  <Search className="h-4 w-4 text-brand-muted" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search for tees, hoodies, caps, gifts and more"
                    className="w-full border-0 bg-transparent text-sm outline-none"
                  />
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {suggestions.map((product) => (
                    <Link
                      key={product.id}
                      to={`/product/${product.slug}`}
                      onClick={() => setSearchOpen(false)}
                      className="flex items-center gap-3 rounded-2xl px-3 py-2 transition duration-300 ease-luxe hover:bg-brand-soft"
                    >
                      <AssetImage
                        src={product.images[0]}
                        alt={product.name}
                        expectedPath={defaultProductAssetPath(product.slug)}
                        missingLabel="Product image is missing"
                        imageClassName="h-12 w-12 rounded-xl object-cover"
                        fallbackClassName="h-12 w-12 rounded-xl"
                      />
                      <div>
                        <p className="text-sm font-semibold text-brand-black">{product.name}</p>
                        <p className="text-xs text-brand-muted">{product.subcategory}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {mobileOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="absolute left-0 right-0 top-full mt-2 border border-black/6 bg-white shadow-soft lg:hidden"
              >
                <div className="container-shell py-4">
                  <nav className="grid gap-2">
                    {[{ label: "Home", to: "/" }, ...navLinks, { label: "Track Order", to: "/track-order" }, { label: "Account", to: "/login" }].map((link) => (
                      <Link
                        key={link.to + link.label}
                        to={link.to}
                        onClick={() => setMobileOpen(false)}
                        className="rounded-2xl bg-brand-soft px-4 py-3 text-sm font-semibold text-brand-black transition duration-300 ease-luxe hover:bg-brand-yellow/18"
                      >
                        {link.label}
                      </Link>
                    ))}
                  </nav>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </header>

      <main className="pb-[90px] md:pb-0">
        <Outlet />
      </main>

      <footer className="mt-24 bg-brand-black text-white">
        <div className="container-shell grid gap-10 py-16 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
          <div>
            <div className="inline-flex rounded-[30px] bg-white px-5 py-4 shadow-soft">
              <BrandLogo className="h-14 w-[232px]" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/72">
              Print. Custom. You. FAB COUTURE builds modern apparel, standout gifting and
              customisation flows that feel premium from first click to delivery.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <SocialPill icon={<Instagram className="h-4 w-4" />} />
              <SocialPill icon={<Facebook className="h-4 w-4" />} />
              <SocialPill icon={<X className="h-4 w-4" />} />
            </div>
            <div className="mt-6 space-y-2 text-sm text-white/60">
              <p>{siteConfig.supportEmail}</p>
              <p>{siteConfig.supportPhone}</p>
              <p>{siteConfig.businessHours}</p>
            </div>
          </div>

          {footerGroups.map((group) => (
            <FooterColumn key={group.title} title={group.title} links={group.links} />
          ))}
        </div>

        <div className="border-t border-white/10">
          <div className="container-shell flex flex-col gap-4 py-6 text-sm text-white/55 md:flex-row md:items-center md:justify-between">
            <p>© 2026 FAB COUTURE. All rights reserved.</p>
            <div className="flex flex-wrap gap-4">
              <span>Secure checkout</span>
              <span>UPI</span>
              <span>Visa</span>
              <span>RuPay</span>
              <span>Made with care in India</span>
            </div>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-6 right-4 z-40 flex flex-col gap-3">
        {showTop ? (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="ml-auto rounded-full border border-black/10 bg-white p-3 shadow-soft"
            aria-label="Back to top"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="mobile-bottom-nav fixed inset-x-0 bottom-0 z-[100] min-h-[68px] border-t border-[#E5E7EB] bg-white/97 px-2 pt-2 shadow-[0_-12px_26px_rgba(11,11,11,0.08)] md:hidden">
        <div className="mx-auto grid max-w-[480px] grid-cols-5 items-start gap-1 pb-[max(8px,env(safe-area-inset-bottom))]">
          {mobileTabs.map((tab) => {
            const Icon = tab.icon;
            const active = tab.to.startsWith("/account")
              ? location.pathname === "/account" && location.hash === "#wishlist"
              : tab.exact
                ? location.pathname === tab.to
                : location.pathname.startsWith(tab.to);

            return (
              <NavLink
                key={tab.label}
                to={tab.to}
                className={cn(
                  "relative flex min-h-[44px] flex-col items-center justify-start gap-1 rounded-2xl px-1 py-0.5 text-center text-[11px] font-medium leading-none transition duration-300 ease-luxe",
                  active ? "text-brand-yellowdark" : "text-brand-charcoal"
                )}
              >
                <span
                  className={cn(
                    "relative inline-flex h-9 w-9 items-center justify-center rounded-full transition duration-300 ease-luxe",
                    active ? "bg-brand-yellow/18 text-brand-yellowdark" : "bg-transparent"
                  )}
                >
                  <Icon className="h-[22px] w-[22px]" />
                  {tab.badge ? <span className="badge-dot">{tab.badge}</span> : null}
                </span>
                <span className="block whitespace-nowrap leading-[1.05]">{tab.label}</span>
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function TopBarItem({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 text-white/92">
      {icon}
      {children}
    </span>
  );
}

function FooterColumn({
  title,
  links
}: {
  title: string;
  links: Array<{ label: string; to: string }>;
}) {
  return (
    <div>
      <h3 className="font-heading text-lg font-bold">{title}</h3>
      <ul className="mt-5 space-y-3 text-sm text-white/70">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link to={link.to} className="transition duration-300 ease-luxe hover:text-brand-yellow">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialPill({ icon }: { icon: ReactNode }) {
  return (
    <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/80">
      {icon}
    </span>
  );
}
