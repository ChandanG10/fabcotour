import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowUp,
  Building2,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Facebook,
  Gift,
  Heart,
  House,
  Instagram,
  LayoutGrid,
  LogOut,
  MapPin,
  Menu,
  Package,
  Palette,
  PencilLine,
  Phone,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  ShoppingBag,
  Truck,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { siteConfig } from "../../constants/site";
import { accountService, storefrontService } from "../../services/api";
import type { StoreCategory } from "../../lib/storefront";
import type { Product } from "../../types/models";
import { useAppStore } from "../../store/useAppStore";
import { cn } from "../../utils/format";
import { AssetImage, defaultProductAssetPath } from "../common/AssetImage";
import { BrandLogo } from "../common/BrandLogo";
import { CustomerAvatar } from "../common/CustomerAvatar";

const footerGroups = [
  {
    title: "Shop",
    links: [
      { label: "New In", to: "/shop" },
      { label: "Men", to: "/shop/men" },
      { label: "Women", to: "/shop/women" },
      { label: "Kids", to: "/shop/kids" },
      { label: "Lifestyle", to: "/lifestyle" }
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
      { label: "Shipping Policy", to: "/shipping-policy" },
      { label: "Returns & Refunds", to: "/return-and-refund-policy" },
      { label: "Cancellation Policy", to: "/cancellation-policy" },
      { label: "Customised Products", to: "/customised-product-policy" },
      { label: "Privacy Policy", to: "/privacy-policy" },
      { label: "Terms & Conditions", to: "/terms-and-conditions" }
    ]
  }
];

export function AppShell() {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showTop, setShowTop] = useState(false);
  const [compactHeader, setCompactHeader] = useState(false);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [desktopMenu, setDesktopMenu] = useState<string | null>(null);
  const [allCategoriesOpen, setAllCategoriesOpen] = useState(false);
  const [mobileCategory, setMobileCategory] = useState<string | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const [cookieChoice, setCookieChoice] = useState<"essential" | "all" | undefined>(() => {
    const saved = window.localStorage.getItem("fab-cookie-preference");
    return saved === "essential" || saved === "all" ? saved : undefined;
  });
  const cartCount = useAppStore((state) => state.cart.length);
  const wishlistCount = useAppStore((state) => state.wishlist.length);
  const user = useAppStore((state) => state.user);
  const logout = useAppStore((state) => state.logout);
  const mobileTabs = [
    { label: "Home", to: "/", icon: House, exact: true },
    { label: "Shop", to: "/shop", icon: LayoutGrid },
    { label: "Customise", to: "/customise", icon: PencilLine },
    { label: "Wishlist", to: "/account/wishlist", icon: Heart },
    { label: "Account", to: user ? "/account" : "/login", icon: UserRound }
  ];
  const saveCookieChoice = (choice: "essential" | "all") => {
    window.localStorage.setItem("fab-cookie-preference", choice);
    setCookieChoice(choice);
  };

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
    storefrontService.getCategories()
      .then((items) => { if (!cancelled) setCategories(items); })
      .catch(() => { if (!cancelled) setCategories([]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    setDesktopMenu(null);
    setAllCategoriesOpen(false);
    setProfileOpen(false);
    setSearchOpen(false);
    setMobileOpen(false);
    setMobileCategory(null);
  }, [location.pathname]);

  useEffect(() => {
    const closeMenus = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setDesktopMenu(null);
        setAllCategoriesOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
      }
    };
    const closeWithEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setDesktopMenu(null);
        setAllCategoriesOpen(false);
        setProfileOpen(false);
        setSearchOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", closeMenus);
    document.addEventListener("keydown", closeWithEscape);
    return () => {
      document.removeEventListener("mousedown", closeMenus);
      document.removeEventListener("keydown", closeWithEscape);
    };
  }, []);

  const rootCategories = categories
    .filter((category) => !category.parentId && category.isVisible)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const primaryCategorySlugs = ["men", "women", "kids", "lifestyle"];
  const menuCategories = primaryCategorySlugs
    .map((slug) => rootCategories.find((category) => category.slug === slug))
    .filter((category): category is StoreCategory => Boolean(category?.showInNavbar));
  const childrenFor = (parentId: string) => categories
    .filter((category) => category.parentId === parentId && category.isVisible)
    .sort((left, right) => left.displayOrder - right.displayOrder);
  const categoryPath = (category: StoreCategory, childSlug?: string) => category.slug === "lifestyle"
    ? `/lifestyle${childSlug ? `/${childSlug}` : ""}`
    : `/shop/${category.slug}${childSlug ? `/${childSlug}` : ""}`;
  const headerNavLinks = [
    { label: "New In", to: "/shop" },
    ...menuCategories.map((category) => ({ label: category.name, to: categoryPath(category) })),
    { label: "Customise", to: "/customise" },
    { label: "Gifts", to: "/lifestyle/personalised-gifts" },
    { label: "Corporate Gifting", to: "/corporate-gifting" }
  ];

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      const query = search.trim();
      if (!query) {
        setSuggestions([]);
        return;
      }
      try {
        const next = await storefrontService.searchProducts(query);
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

  const handleLogout = async () => {
    try { await accountService.logout(); } finally {
      logout(); setProfileOpen(false); setMobileOpen(false); navigate("/");
    }
  };

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const firstResult = suggestions[0];
    if (firstResult) {
      setSearchOpen(false);
      navigate(`/product/${firstResult.slug}`);
    }
  };

  const accountLinks = [
    { label: "My Account", to: "/account", icon: UserRound },
    { label: "My Orders", to: "/account/orders", icon: Package },
    { label: "My Wishlist", to: "/account/wishlist", icon: Heart },
    { label: "My Custom Designs", to: "/account/designs", icon: Palette },
    { label: "Saved Addresses", to: "/account/addresses", icon: MapPin },
    { label: "Settings", to: "/account/security", icon: Settings }
  ];

  return (
    <div className="min-h-screen overflow-x-hidden bg-brand-cream md:bg-brand-cream">
      <div className="announcement-bar sticky top-0 z-[60] bg-brand-black text-white">
        <div className="container-shell hidden h-full items-center justify-between gap-6 md:flex">
          <div className="flex min-w-0 items-center gap-4 text-[11px] font-semibold tracking-[0.08em]">
            <TopBarItem icon={<Truck className="h-3.5 w-3.5 text-brand-cyan" />}>Free shipping on orders above ₹999</TopBarItem>
            <span className="text-brand-orange">•</span>
            <TopBarItem icon={<RotateCcw className="h-3.5 w-3.5 text-brand-orange" />}>Easy 30-day returns</TopBarItem>
            <span className="text-brand-pink">•</span>
            <TopBarItem icon={<ShieldCheck className="h-3.5 w-3.5 text-brand-pink" />}>Secure payments</TopBarItem>
          </div>
          <div className="hidden shrink-0 items-center gap-4 text-xs font-medium xl:flex">
            <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`} className="inline-flex items-center gap-2 text-white/80 transition hover:text-brand-cyan"><Phone className="h-3.5 w-3.5" />{siteConfig.supportPhone}</a>
            <span className="h-4 w-px bg-white/20" />
            <Link to="/track-order" className="text-white/80 transition hover:text-white">Track Order</Link>
            <span className="h-4 w-px bg-white/20" />
            <Link to="/contact" className="inline-flex items-center gap-2 text-white/80 transition hover:text-white"><CircleHelp className="h-3.5 w-3.5" />Help & Support</Link>
          </div>
        </div>
        <div className="container-shell flex h-full items-center justify-center gap-2 text-sm font-medium md:hidden">
          <Truck className="h-3.5 w-3.5 text-brand-cyan" />
          <span>Free shipping above ₹999</span>
        </div>
      </div>

      <header
        ref={headerRef}
        className={cn(
          "main-header sticky top-[var(--announcement-height)] z-50 border-b border-black/6 bg-white/98 transition-shadow duration-300 ease-luxe",
          compactHeader && "shadow-soft"
        )}
      >
        <div className="relative h-full">
          <div className="hidden h-[82px] border-b border-black/6 lg:block">
            <div className="container-shell grid h-full grid-cols-[190px_minmax(320px,1fr)_auto] items-center gap-7 xl:gap-10">
              <Link to="/" aria-label="FabPODD home" className="inline-flex w-max">
                <BrandLogo className={cn("w-[178px] transition-all duration-300 ease-luxe", compactHeader ? "h-[54px]" : "h-[60px]")} />
              </Link>

              <div className="relative min-w-0">
                <form onSubmit={submitSearch} className="flex h-12 items-center rounded-full border border-brand-charcoal/15 bg-white p-1 shadow-[0_4px_18px_rgba(7,22,61,0.04)] transition focus-within:border-brand-cyan focus-within:ring-4 focus-within:ring-brand-cyan/10">
                  <Search className="ml-4 h-5 w-5 shrink-0 text-brand-black" aria-hidden="true" />
                  <input
                    type="search"
                    value={search}
                    onFocus={() => setSearchOpen(true)}
                    onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }}
                    placeholder="Search for t-shirts, hoodies, mugs, phone cases…"
                    aria-label="Search products"
                    className="min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-brand-black outline-none placeholder:text-brand-muted"
                  />
                  <button type="submit" className="h-10 shrink-0 rounded-full bg-brand-cyan px-7 text-sm font-bold text-brand-black transition hover:bg-brand-cyan-dark hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan">Search</button>
                </form>
                <AnimatePresence>
                  {searchOpen && search.trim() ? (
                    <SearchResults products={suggestions} query={search} onSelect={() => setSearchOpen(false)} className="absolute left-0 right-0 top-full z-[80] mt-3" />
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-end gap-1 xl:gap-3">
                <HeaderAction to={user ? "/account/wishlist" : "/login"} label="Wishlist" count={wishlistCount} icon={<Heart className="h-5 w-5" />} />
                <HeaderAction to="/cart" label="Cart" count={cartCount} icon={<ShoppingBag className="h-5 w-5" />} />
                <span className="mx-1 h-10 w-px bg-black/10" aria-hidden="true" />
                {user ? (
                  <div className="relative">
                    <button
                      type="button"
                      aria-expanded={profileOpen}
                      aria-label={`Open account menu for ${user.name}`}
                      onClick={() => {
                        setProfileOpen((value) => !value);
                        setDesktopMenu(null);
                        setAllCategoriesOpen(false);
                        setSearchOpen(false);
                      }}
                      className="flex min-h-12 max-w-[220px] items-center gap-3 rounded-full px-2.5 py-1.5 text-left transition hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                    >
                      <CustomerAvatar src={user.avatar} name={user.name} className="h-10 w-10 bg-brand-pink" decorative />
                      <span className="hidden min-w-0 xl:block"><strong className="block truncate text-sm">{user.name}</strong><span className="block text-xs text-brand-muted">My Account</span></span>
                      <ChevronDown className={cn("hidden h-4 w-4 shrink-0 transition-transform xl:block", profileOpen && "rotate-180")} />
                    </button>
                    <AnimatePresence>
                      {profileOpen ? (
                        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute right-0 top-full z-[90] mt-3 w-80 overflow-hidden rounded-2xl border border-black/8 bg-white p-3 shadow-[0_24px_70px_rgba(7,22,61,0.16)]">
                          <div className="flex min-w-0 items-center gap-3 border-b border-black/6 px-2 pb-4 pt-1"><CustomerAvatar src={user.avatar} name={user.name} className="h-11 w-11 bg-brand-pink" /><div className="min-w-0"><p className="truncate font-heading font-bold">{user.name}</p><p className="truncate text-xs text-brand-muted">{user.email}</p></div></div>
                          <nav className="py-2">{accountLinks.map(({ label, to, icon: Icon }) => <Link key={to} to={to} className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-brand-charcoal transition hover:bg-brand-cyan/10 hover:text-brand-black"><Icon className="h-4 w-4" />{label}</Link>)}</nav>
                          <button type="button" onClick={() => void handleLogout()} className="flex min-h-11 w-full items-center gap-3 border-t border-black/6 px-3 pt-3 text-left text-sm font-semibold text-red-700 transition hover:text-red-800"><LogOut className="h-4 w-4" />Logout</button>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <NavLink to="/login" className="inline-flex min-h-11 items-center px-3 text-sm font-semibold hover:text-brand-cyan-dark">Sign in</NavLink>
                    <NavLink to="/login?mode=signup" className="inline-flex min-h-11 items-center rounded-full bg-brand-black px-4 text-sm font-semibold text-white transition hover:bg-brand-cyan hover:text-brand-black">Register</NavLink>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="relative hidden h-[54px] lg:block">
            <div className="container-shell flex h-full items-stretch gap-5 xl:gap-8">
              <div className="relative flex shrink-0 items-center">
                <button
                  type="button"
                  aria-expanded={allCategoriesOpen}
                  onClick={() => {
                    setAllCategoriesOpen((value) => !value);
                    setDesktopMenu(null);
                    setProfileOpen(false);
                  }}
                  className="inline-flex h-11 min-w-[190px] items-center gap-3 rounded-xl bg-brand-black px-5 text-sm font-bold text-white transition hover:bg-brand-cyan hover:text-brand-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cyan"
                >
                  <Menu className="h-5 w-5" /><span>All Categories</span><ChevronDown className={cn("ml-auto h-4 w-4 transition-transform", allCategoriesOpen && "rotate-180")} />
                </button>
              </div>

              <nav className="flex min-w-0 flex-1 items-stretch justify-between" aria-label="Primary navigation">
                {headerNavLinks.map((link) => {
                  const category = menuCategories.find((item) => categoryPath(item) === link.to);
                  const children = category ? childrenFor(category.id).filter((child) => child.showInNavbar) : [];
                  const open = Boolean(category && desktopMenu === category.slug);
                  const LeadingIcon = link.label === "Customise" ? Palette : link.label === "Gifts" ? Gift : link.label === "Corporate Gifting" ? Building2 : null;
                  return (
                    <div
                      key={link.to + link.label}
                      className="relative flex items-center"
                      onMouseEnter={() => { if (category && children.length) { setDesktopMenu(category.slug); setAllCategoriesOpen(false); } }}
                      onMouseLeave={() => { if (category) setDesktopMenu(null); }}
                      onFocusCapture={() => { if (category && children.length) setDesktopMenu(category.slug); }}
                      onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDesktopMenu(null); }}
                    >
                      <NavLink
                        to={link.to}
                        className={({ isActive }) => cn(
                          "relative inline-flex h-full items-center gap-2 whitespace-nowrap px-1 text-sm font-bold text-brand-charcoal transition hover:text-brand-cyan-dark",
                          "after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:origin-left after:scale-x-0 after:bg-brand-pink after:transition-transform hover:after:scale-x-100",
                          isActive && "text-brand-black after:scale-x-100"
                        )}
                      >
                        {LeadingIcon ? <LeadingIcon className="h-4 w-4" /> : null}{link.label}
                        {category && children.length ? <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-180")} /> : null}
                      </NavLink>
                      <AnimatePresence>
                        {open && category ? (
                          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-1/2 top-full z-[80] w-[min(620px,calc(100vw-48px))] -translate-x-1/2 rounded-b-2xl border border-black/8 bg-white p-5 shadow-[0_24px_70px_rgba(7,22,61,0.16)]">
                            <div className="flex items-center justify-between border-b border-black/6 pb-4"><div><p className="font-heading text-lg font-bold">Shop {category.name}</p><p className="mt-1 text-xs text-brand-muted">Browse every {category.name.toLowerCase()} collection</p></div><Link to={categoryPath(category)} className="text-sm font-bold text-brand-cyan-dark">View all</Link></div>
                            <div className="mt-3 grid grid-cols-2 gap-1">{children.map((child) => <Link key={child.id} to={categoryPath(category, child.slug)} className="flex min-h-11 items-center justify-between rounded-xl px-3 text-sm font-semibold text-brand-charcoal transition hover:bg-brand-soft hover:text-brand-black"><span>{child.name}</span><ChevronRight className="h-4 w-4 text-brand-muted" /></Link>)}</div>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </nav>

              <AnimatePresence>
                {allCategoriesOpen ? (
                  <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="absolute left-8 right-8 top-full z-[85] mx-auto max-w-[1376px] overflow-hidden rounded-b-2xl border border-black/8 bg-white shadow-[0_28px_80px_rgba(7,22,61,0.18)]">
                    <div className="grid grid-cols-[230px_1fr]">
                      <div className="bg-brand-black p-5 text-white"><p className="font-heading text-xl font-bold">Shop all</p><p className="mt-2 text-sm leading-6 text-white/65">Explore FabPodd collections and their product categories.</p><Link to="/shop" className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-brand-cyan px-4 text-sm font-bold text-brand-black">View all products<ChevronRight className="h-4 w-4" /></Link></div>
                      <div className="grid max-h-[430px] grid-cols-2 gap-x-7 gap-y-6 overflow-y-auto p-6 xl:grid-cols-4">
                        {rootCategories.map((category) => {
                          const children = childrenFor(category.id);
                          return <section key={category.id} className="min-w-0"><Link to={categoryPath(category)} className="flex items-center justify-between border-b border-black/8 pb-3 font-heading font-bold text-brand-black"><span className="truncate">{category.name}</span><ChevronRight className="h-4 w-4 shrink-0 text-brand-cyan-dark" /></Link><div className="mt-2 grid gap-1">{children.slice(0, 8).map((child) => <Link key={child.id} to={categoryPath(category, child.slug)} className="rounded-lg py-1.5 text-sm font-medium text-brand-muted transition hover:text-brand-black">{child.name}</Link>)}{children.length > 8 ? <Link to={categoryPath(category)} className="pt-1 text-sm font-bold text-brand-pink">+ {children.length - 8} more</Link> : null}</div></section>;
                        })}
                      </div>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="container-shell relative flex h-full max-w-[480px] items-center justify-between lg:hidden">
            <button type="button" aria-label={mobileOpen ? "Close menu" : "Open menu"} className="nav-icon-button mobile-nav-icon relative z-10" onClick={() => { setMobileOpen((value) => !value); setSearchOpen(false); }}>
              {mobileOpen ? <X className="h-[22px] w-[22px]" /> : <Menu className="h-[22px] w-[22px]" />}
            </button>
            <Link to="/" className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2" aria-label="FabPODD home"><BrandLogo className="h-[46px] w-[116px] min-[380px]:w-[126px] sm:h-[50px] sm:w-[138px]" /></Link>
            <div className="relative z-10 flex items-center gap-1">
              <button type="button" aria-label="Open search" className="nav-icon-button mobile-nav-icon" onClick={() => { setSearchOpen((value) => !value); setMobileOpen(false); }}><Search className="h-[22px] w-[22px]" /></button>
              <NavLink to="/cart" aria-label={`Cart${cartCount ? `, ${cartCount} items` : ""}`} className="nav-icon-button mobile-nav-icon"><ShoppingBag className="h-[22px] w-[22px]" />{cartCount > 0 ? <span className="badge-dot">{cartCount}</span> : null}</NavLink>
            </div>
          </div>

          <AnimatePresence>
            {searchOpen ? (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute left-0 right-0 top-full z-[90] border-t border-black/6 bg-white p-4 shadow-soft lg:hidden">
                <form onSubmit={submitSearch} className="mx-auto flex max-w-[480px] items-center gap-2 rounded-full border border-black/10 bg-brand-soft px-4 py-2.5 focus-within:border-brand-cyan"><Search className="h-4 w-4 text-brand-muted" /><input type="search" value={search} autoFocus onChange={(event) => setSearch(event.target.value)} placeholder="Search products" aria-label="Search products" className="min-w-0 flex-1 border-0 bg-transparent text-base outline-none" /><button type="submit" className="text-sm font-bold text-brand-cyan-dark">Search</button></form>
                {search.trim() ? <SearchResults products={suggestions} query={search} onSelect={() => setSearchOpen(false)} className="mx-auto mt-3 max-w-[480px]" /> : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <AnimatePresence>
            {mobileOpen ? (
              <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className="absolute left-0 right-0 top-full z-[90] max-h-[calc(100dvh-var(--total-header-height))] overflow-y-auto border-t border-black/6 bg-white shadow-soft lg:hidden">
                <div className="container-shell max-w-[480px] py-4">
                  <nav className="grid gap-2">
                    {[{ label: "Home", to: "/" }, ...headerNavLinks, { label: "Track Order", to: "/track-order" }, ...(user ? accountLinks.map(({ label, to }) => ({ label, to })) : [{ label: "Sign in", to: "/login" }, { label: "Register", to: "/login?mode=signup" }])].map((link) => {
                      const category = menuCategories.find((item) => categoryPath(item) === link.to);
                      const children = category ? childrenFor(category.id) : [];
                      if (category && children.length) {
                        const open = mobileCategory === category.slug;
                        return <div key={link.to + link.label} className="overflow-hidden rounded-xl bg-brand-soft"><div className="flex min-h-12 items-center"><Link to={link.to} onClick={() => setMobileOpen(false)} className="flex-1 px-4 py-3 text-sm font-bold text-brand-black">{link.label}</Link><button type="button" aria-expanded={open} aria-label={`Toggle ${link.label} subcategories`} onClick={() => setMobileCategory(open ? null : category.slug)} className="mr-2 grid h-11 w-11 place-items-center rounded-full"><ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} /></button></div>{open ? <div className="grid gap-1 border-t border-black/6 bg-white p-2"><Link to={categoryPath(category)} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm font-bold text-brand-cyan-dark">View all {category.name}</Link>{children.map((child) => <Link key={child.id} to={categoryPath(category, child.slug)} onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 text-sm text-brand-charcoal hover:bg-brand-soft">{child.name}</Link>)}</div> : null}</div>;
                      }
                      return <Link key={link.to + link.label} to={link.to} onClick={() => setMobileOpen(false)} className={cn("flex min-h-12 items-center rounded-xl px-4 text-sm font-bold transition", link.label === "Register" ? "bg-brand-black text-white" : "bg-brand-soft text-brand-black hover:bg-brand-cyan/10")}>{link.label}</Link>;
                    })}
                    {user ? <button type="button" onClick={() => void handleLogout()} className="min-h-12 rounded-xl bg-red-50 px-4 text-left text-sm font-bold text-red-700"><LogOut className="mr-2 inline h-4 w-4" />Logout</button> : null}
                  </nav>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </header>

      <main>
        <Outlet />
      </main>

      <footer className="mt-12 bg-brand-black pb-[calc(88px+env(safe-area-inset-bottom))] text-white md:mt-24 md:pb-0">
        <div className="container-shell grid grid-cols-2 gap-x-6 gap-y-8 py-10 md:py-16 lg:grid-cols-[1.3fr_0.8fr_0.8fr_0.8fr]">
          <div className="col-span-2 min-w-0 lg:col-span-1">
            <div className="inline-flex rounded-[30px] bg-white px-5 py-4 shadow-soft">
              <BrandLogo className="h-[72px] w-[196px]" />
            </div>
            <p className="mt-5 max-w-sm text-sm leading-7 text-white/72">
              Print. Custom. You. Fabpodd builds modern apparel, standout gifting and
              customisation flows that feel premium from first click to delivery.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <SocialPill href="https://www.instagram.com/fab_podd/" label="FabPodd on Instagram" icon={<Instagram aria-hidden="true" className="h-4 w-4" />} />
              <SocialPill href="https://www.facebook.com/profile.php?id=61594100076491" label="FabPodd on Facebook" icon={<Facebook aria-hidden="true" className="h-4 w-4" />} />
            </div>
            <div className="mt-6 space-y-2 text-sm text-white/60">
              <a href={`mailto:${siteConfig.supportEmail}`} className="block break-words py-2 hover:text-white">{siteConfig.supportEmail}</a>
              <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`} className="block py-2 hover:text-white">{siteConfig.supportPhone}</a>
              <p>{siteConfig.businessAddress}</p>
              <div className="mt-4 border-t border-white/10 pt-4 text-xs leading-6 text-white/58">
                <p className="font-semibold text-white/75">Grievance contact</p>
                <p>{siteConfig.grievanceOfficer}</p>
                <p>{siteConfig.grievanceEmail}</p>
              </div>
              <p>{siteConfig.businessHours}</p>
            </div>
          </div>

          {footerGroups.map((group) => (
            <FooterColumn key={group.title} title={group.title} links={group.links} />
          ))}
        </div>

        <div className="border-t border-white/10">
          <div className="container-shell flex flex-col gap-4 py-6 text-sm text-white/70 lg:flex-row lg:items-start lg:justify-between">
            <div className="shrink-0 space-y-2">
              <p>© 2026 Fabpodd. All rights reserved.</p>
              <p>Developed by : <a href="https://vertexsoftware.in" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center underline underline-offset-4 hover:text-white">vertexsoftware.in</a></p>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 lg:justify-end">
              <button type="button" onClick={() => setCookieChoice(undefined)} className="min-h-11 hover:text-white">Cookie preferences</button>
              <span>Secure checkout</span>
              <span>UPI</span>
              <span>Visa</span>
              <span>RuPay</span>
              <span>Made with care in India</span>
            </div>
          </div>
        </div>
      </footer>

      {!cookieChoice ? (
        <div className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-4 right-4 z-[70] mx-auto max-w-3xl rounded-[24px] border border-white/10 bg-brand-black p-5 text-white shadow-soft md:bottom-6">
          <p className="font-semibold">Cookie preferences</p>
          <p className="mt-2 text-sm leading-6 text-white/70">Essential storage keeps your bag, custom design and security settings working. Optional analytics should run only with your permission.</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button type="button" className="button-primary bg-brand-yellow text-brand-black" onClick={() => saveCookieChoice("all")}>Accept all</button>
            <button type="button" className="button-secondary border-white/20 bg-white/5 text-white" onClick={() => saveCookieChoice("essential")}>Essential only</button>
          </div>
        </div>
      ) : null}

      <div className="fixed bottom-[calc(88px+env(safe-area-inset-bottom))] right-4 z-40 flex flex-col gap-3 md:bottom-6">
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
            const active = tab.label === "Wishlist"
              ? location.pathname.startsWith("/account/wishlist")
              : tab.label === "Account"
                ? user
                  ? location.pathname.startsWith("/account") && !location.pathname.startsWith("/account/wishlist")
                  : location.pathname === "/login" || location.pathname === "/register"
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

function HeaderAction({
  to,
  label,
  count,
  icon
}: {
  to: string;
  label: string;
  count: number;
  icon: ReactNode;
}) {
  return (
    <NavLink
      to={to}
      aria-label={`${label}${count ? `, ${count} items` : ""}`}
      className="group relative flex min-h-12 min-w-[66px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 text-xs font-semibold text-brand-charcoal transition hover:bg-brand-soft hover:text-brand-black"
    >
      <span className="relative">
        {icon}
        {count > 0 ? <span className="absolute -right-3 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-pink px-1 text-[10px] font-bold text-white">{count}</span> : null}
      </span>
      <span>{label}</span>
    </NavLink>
  );
}

function SearchResults({
  products,
  query,
  onSelect,
  className
}: {
  products: Product[];
  query: string;
  onSelect: () => void;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn("overflow-hidden rounded-2xl border border-black/8 bg-white p-3 shadow-[0_20px_60px_rgba(7,22,61,0.15)]", className)}
    >
      {products.length ? (
        <div className="grid gap-1 sm:grid-cols-2">
          {products.map((product) => (
            <Link key={product.id} to={`/product/${product.slug}`} onClick={onSelect} className="flex min-w-0 items-center gap-3 rounded-xl p-2 transition hover:bg-brand-soft">
              <AssetImage
                src={product.images[0]}
                alt={product.name}
                expectedPath={defaultProductAssetPath(product.slug)}
                missingLabel="Product image is missing"
                imageClassName="h-12 w-12 rounded-xl object-cover"
                fallbackClassName="h-12 w-12 rounded-xl"
              />
              <span className="min-w-0"><strong className="block truncate text-sm text-brand-black">{product.name}</strong><span className="block truncate text-xs text-brand-muted">{product.subcategory}</span></span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="px-3 py-4 text-sm text-brand-muted">No products found for “{query.trim()}”.</p>
      )}
    </motion.div>
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
    <div className={cn("min-w-0", title === "Support" && "col-span-2 lg:col-span-1")}>
      <h3 className="font-heading text-lg font-bold">{title}</h3>
      <ul className={cn("mt-3 grid text-sm text-white/75", title === "Support" && "grid-cols-2 gap-x-6 lg:grid-cols-1")}>
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link to={link.to} className="flex min-h-11 items-center py-2 leading-6 transition duration-300 ease-luxe hover:text-brand-yellow">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SocialPill({ icon, href, label }: { icon: ReactNode; href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={`${label} (opens in a new tab)`} className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/12 bg-white/8 text-white/80 hover:bg-white/15 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
      {icon}
    </a>
  );
}
