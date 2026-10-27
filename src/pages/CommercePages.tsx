import { zodResolver } from "@hookform/resolvers/zod";
import { GoogleLogin, type CredentialResponse } from "@react-oauth/google";
import { Camera, Heart, LockKeyhole, MapPin, Package, PackageCheck, Palette, Plus, Save, ShieldCheck, Trash2, UserRound, XCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AssetImage, defaultProductAssetPath } from "../components/common/AssetImage";
import { BrandLogo } from "../components/common/BrandLogo";
import { CustomerAvatar } from "../components/common/CustomerAvatar";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, EmptyState, InputField, LoadingState, SectionIntro, SelectField, SuccessInline } from "../components/common/Ui";
import { coupons } from "../constants/site";
import { useCustomerAuth } from "../customer/CustomerAuth";
import { useAsyncData } from "../hooks/useAsyncData";
import { calculateCustomizationCharge } from "../lib/pricing";
import { accountService, storefrontService } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import type { Address, SavedCustomDesign } from "../types/models";
import { currencyFormatter } from "../utils/format";

const securePassword = z.string().min(8, "Use at least 8 characters.").max(128)
  .regex(/[A-Za-z]/, "Include at least one letter.").regex(/\d/, "Include at least one number.");
const loginSchema = z.object({ email: z.string().trim().email(), password: z.string().min(1, "Enter your password.") });
const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(160),
  email: z.string().trim().email(), phone: z.string().trim().min(10, "Enter a valid mobile number.").max(32),
  password: securePassword, confirmPassword: z.string(),
  acceptedTerms: z.boolean().refine((value) => value, "Please accept the Terms & Conditions and acknowledge the Privacy Policy.")
}).refine((values) => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

const forgotSchema = z.object({
  email: z.string().email()
});
const resetPasswordSchema = z.object({ password: securePassword, confirmPassword: z.string() })
  .refine((values) => values.password === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });
const profileSchema = z.object({ name: z.string().trim().min(2).max(160), phone: z.string().trim().min(10).max(32) });
const managedAddressSchema = z.object({
  label: z.enum(["Home", "Office"]), recipient: z.string().trim().min(2), phone: z.string().trim().min(10),
  line1: z.string().trim().min(5), line2: z.string().trim().optional(), landmark: z.string().trim().optional(),
  city: z.string().trim().min(2), state: z.string().trim().min(2), pinCode: z.string().trim().regex(/^\d{6}$/, "Enter a valid 6-digit PIN code."),
  country: z.string().trim().min(2), isDefault: z.boolean()
});
const changePasswordSchema = z.object({ currentPassword: z.string().min(1), newPassword: securePassword, confirmPassword: z.string() })
  .refine((values) => values.newPassword === values.confirmPassword, { path: ["confirmPassword"], message: "Passwords do not match." });

const trackingSchema = z.object({
  orderNumber: z.string().trim().min(6),
  email: z.string().email()
});

const addressSchema = z.object({
  recipient: z.string().min(2),
  phone: z.string().min(10),
  line1: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pinCode: z.string().min(6),
  country: z.string().min(2)
});

function useStoreProducts() {
  return useAsyncData(() => storefrontService.getNormalizedProducts(), []);
}

function submitHostedPayment(action: string, params: Record<string, string>) {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = action;
  form.style.display = "none";
  Object.entries(params).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });
  document.body.appendChild(form);
  form.submit();
}

function paymentMethodLabel(method: string) {
  return method === "payu" ? "PayU Hosted Checkout" : method === "cod" ? "Cash on delivery" : method;
}

function escapeInvoiceText(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character] ?? character);
}

function downloadInvoice(order: import("../types/models").Order) {
  const lines = order.items.map((item) =>
    `<tr><td>${escapeInvoiceText(item.productId)}</td><td>${item.quantity}</td><td>${currencyFormatter.format(item.price)}</td></tr>`
  ).join("");
  const documentHtml = `<!doctype html><html><head><meta charset="utf-8"><title>${order.invoiceNumber ?? order.orderNumber}</title>
    <style>body{font-family:Manrope,sans-serif;max-width:760px;margin:40px auto;color:#07163d}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #d5dce3;text-align:left}.total{font-size:20px;font-weight:700}</style></head>
    <body><h1>Fabpodd</h1><p>Invoice ${order.invoiceNumber ?? order.orderNumber}</p><p>Order ${order.orderNumber} · ${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
    <p>Deliver to: ${escapeInvoiceText(order.address.recipient)}, ${escapeInvoiceText(order.address.line1)}, ${escapeInvoiceText(order.address.city)}, ${escapeInvoiceText(order.address.state)} ${escapeInvoiceText(order.address.pinCode)}</p>
    <table><thead><tr><th>Product reference</th><th>Quantity</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table>
    <p>Subtotal: ${currencyFormatter.format(order.subtotal)}</p><p>Shipping: ${currencyFormatter.format(order.shipping)}</p><p>Discount: ${currencyFormatter.format(order.discount)}</p>
    <p class="total">Total: ${currencyFormatter.format(order.total)}</p><p>Payment: ${paymentMethodLabel(order.paymentMethod)} (${order.paymentStatus ?? "Pending"})</p></body></html>`;
  const url = URL.createObjectURL(new Blob([documentHtml], { type: "text/html;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `${order.invoiceNumber ?? order.orderNumber}.html`;
  link.click();
  URL.revokeObjectURL(url);
}

export function CartPage() {
  const navigate = useNavigate();
  const { data: products, loading, error } = useStoreProducts();
  const productList = products ?? [];
  const cart = useAppStore((state) => state.cart);
  const activeCoupon = useAppStore((state) => state.activeCoupon);
  const updateCartQuantity = useAppStore((state) => state.updateCartQuantity);
  const removeFromCart = useAppStore((state) => state.removeFromCart);
  const saveForLater = useAppStore((state) => state.saveForLater);
  const applyCoupon = useAppStore((state) => state.applyCoupon);
  const clearCoupon = useAppStore((state) => state.clearCoupon);
  const [couponCode, setCouponCode] = useState("");

  const cartRows = cart.map((item) => {
    const product = productList.find((entry) => entry.id === item.productId);
    const variant = product?.variants.find((entry) => entry.id === item.variantId);
    return { item, product, variant };
  });
  const checkoutRows = cartRows.filter((row) => !row.item.savedForLater);

  const subtotal = checkoutRows.reduce((sum, row) => row.item.customisation
    ? sum + row.item.customisation.pricingBreakdown.total - row.item.customisation.pricingBreakdown.delivery
    : sum + (row.product?.price ?? 0) * row.item.quantity + calculateCustomizationCharge(row.item.customization), 0);
  const shipping = subtotal === 0 || subtotal >= 999 ? 0 : 99;
  const coupon = coupons.find((entry) => entry.code === activeCoupon);
  const discount =
    coupon && subtotal >= coupon.minimumOrderValue
      ? coupon.discountType === "percentage"
        ? Math.round((subtotal * coupon.value) / 100)
        : coupon.value
      : 0;
  const total = subtotal + shipping - discount;

  if (loading) {
    return <div className="container-shell py-20"><LoadingState label="Loading bag" /></div>;
  }

  if (error || !products) {
    return <div className="container-shell py-20"><EmptyState title="Bag unavailable" description={error ?? "Products could not be loaded for the cart."} /></div>;
  }

  return (
    <>
      <Seo title="Shopping Bag" description="Review cart items, apply coupons, save for later and move into the multi-step checkout flow." path="/cart" />
      <div className="container-shell py-8 pb-[calc(8.5rem+env(safe-area-inset-bottom))] md:pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Cart" }]} />
        <SectionIntro eyebrow="Shopping features" title="Your bag" description="Update quantities, switch variants and stage purchases before checkout." />
        {cartRows.length === 0 ? (
          <EmptyState
            title="Your bag is empty"
            description="Start with a product or custom design, then return here for shipping estimates and checkout."
            action={<Link to="/shop" className="button-primary">Browse products</Link>}
          />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
            <div className="space-y-5">
              {cartRows.map((row) =>
                row.item.customisation ? (
                  <article key={row.item.id} className="overflow-hidden rounded-[28px] border border-brand-cyan/25 bg-white p-5 shadow-card">
                    <div className="flex flex-col gap-5 md:flex-row">
                      <div className="relative h-40 w-36 shrink-0 overflow-hidden rounded-[24px] bg-brand-grey" aria-label={`${row.item.customisation.productName} customised preview`} role="img">
                        <img src={row.item.customisation.productImage} alt="" className="absolute inset-0 h-full w-full object-contain" />
                        {row.item.customisation.previewUrls.front ? <img src={row.item.customisation.previewUrls.front} alt="" className="pointer-events-none absolute object-contain" style={{ left: `${row.item.customisation.previewPlacement?.left ?? 34}%`, top: `${row.item.customisation.previewPlacement?.top ?? 28}%`, width: `${row.item.customisation.previewPlacement?.width ?? 32}%`, height: `${row.item.customisation.previewPlacement?.height ?? 44}%` }} /> : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4"><div><span className="inline-flex rounded-full bg-brand-cyan/15 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.1em] text-brand-cyan-dark">Customised Product</span><h2 className="mt-3 font-heading text-[2rem] font-bold leading-[1.05] sm:text-2xl">{row.item.customisation.productName}</h2><p className="mt-1 text-sm text-brand-black/55">{row.item.customisation.colourName} • {row.item.customisation.size} • {row.item.customisation.usedSides.join(", ")}</p></div><button type="button" aria-label={`Remove ${row.item.customisation.productName}`} onClick={() => removeFromCart(row.item.id)} className="shrink-0 rounded-full border border-black/10 p-2"><Trash2 className="h-4 w-4" /></button></div>
                        <div className="mt-4 flex flex-wrap items-center gap-4"><span className="inline-flex min-h-11 items-center rounded-full border border-black/10 px-4 text-sm font-semibold">Qty {row.item.quantity}</span><button type="button" onClick={() => saveForLater(row.item.id)} className="text-sm font-semibold">{row.item.savedForLater ? "Move to bag" : "Save for later"}</button><Link to={`/customise/${row.item.customisation.productSlug}/design?colour=${encodeURIComponent(row.item.customisation.colourSlug || row.item.customisation.colourName.toLowerCase())}&cartItem=${encodeURIComponent(row.item.id)}`} className="text-sm font-semibold text-brand-cyan-dark">Edit quantity or design</Link></div>
                        <p className="mt-4 text-xl font-bold">{currencyFormatter.format(row.item.customisation.pricingBreakdown.total - row.item.customisation.pricingBreakdown.delivery)}</p>
                      </div>
                    </div>
                  </article>
                ) : row.product ? (
                  <article key={row.item.id} className="overflow-hidden rounded-[28px] bg-white p-5 shadow-card">
                    <div className="flex flex-col gap-5 md:flex-row">
                      <AssetImage
                        src={row.item.customization?.previewImage ?? row.product.images[0]}
                        alt={row.product.name}
                        expectedPath={defaultProductAssetPath(row.product.slug)}
                        missingLabel="Product image is missing"
                        imageClassName="h-40 w-36 rounded-[24px] object-cover"
                        fallbackClassName="h-40 w-36 rounded-[24px]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h2 className="font-heading text-[2rem] font-bold leading-[1.05] sm:text-2xl">
                              {row.product.name}
                            </h2>
                            <p className="mt-1 text-sm text-brand-black/55">{row.variant?.color ?? row.item.selectedColor} • {row.variant?.size ?? row.item.selectedSize}</p>
                            {row.item.customization ? (
                              <div className="mt-2 text-sm">
                                <p className="text-brand-success">Custom design attached</p>
                                <p className="mt-1 text-brand-black/55">
                                  {row.item.customization.productColor} • {row.item.customization.size} • {row.item.customization.layers.length} layer{row.item.customization.layers.length === 1 ? "" : "s"}
                                </p>
                              </div>
                            ) : null}
                          </div>
                          <button type="button" onClick={() => removeFromCart(row.item.id)} className="shrink-0 rounded-full border border-black/10 p-2">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-4 flex flex-wrap items-center gap-4">
                          <div className="inline-flex items-center gap-4 rounded-full border border-black/10 px-4 py-3">
                            <button type="button" onClick={() => updateCartQuantity(row.item.id, row.item.quantity - 1)}>-</button>
                            <span className="font-semibold">{row.item.quantity}</span>
                            <button type="button" onClick={() => updateCartQuantity(row.item.id, row.item.quantity + 1)}>+</button>
                          </div>
                          <button type="button" onClick={() => saveForLater(row.item.id)} className="text-sm font-semibold">
                            {row.item.savedForLater ? "Move to bag" : "Save for later"}
                          </button>
                        </div>
                        <p className="mt-4 text-xl font-bold">{currencyFormatter.format(row.product.price * row.item.quantity + calculateCustomizationCharge(row.item.customization))}</p>
                      </div>
                    </div>
                  </article>
                ) : null
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-[28px] bg-white p-6 shadow-card">
                <h2 className="font-heading text-2xl font-bold">Coupon codes</h2>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter code" className="min-w-0 flex-1 rounded-full border border-black/10 px-4 py-3 outline-none" />
                  <button
                    type="button"
                    className="button-secondary w-full shrink-0 sm:w-auto"
                    onClick={() => {
                      const requestedCoupon = coupons.find((entry) => entry.code.toLowerCase() === couponCode.trim().toLowerCase());
                      if (requestedCoupon && subtotal < requestedCoupon.minimumOrderValue) {
                        toast.error(`This coupon requires a minimum order of ${currencyFormatter.format(requestedCoupon.minimumOrderValue)}.`);
                      } else if (applyCoupon(couponCode)) {
                        toast.success("Coupon applied");
                      } else {
                        toast.error("Invalid coupon code");
                      }
                    }}
                  >
                    Apply
                  </button>
                </div>
                <div className="mt-4 space-y-2 text-sm text-brand-black/65">
                  {coupons.map((entry) => (
                    <div key={entry.code} className="rounded-2xl bg-brand-grey px-4 py-3">
                      <div className="font-semibold">{entry.code}</div>
                      <div>{entry.description}</div>
                    </div>
                  ))}
                </div>
                {activeCoupon ? (
                  <button type="button" className="mt-4 text-sm font-semibold" onClick={clearCoupon}>
                    Remove {activeCoupon}
                  </button>
                ) : null}
              </div>

              <div className="rounded-[28px] bg-white p-6 shadow-card">
                <h2 className="font-heading text-2xl font-bold">Shipping estimate</h2>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input placeholder="Enter PIN code" className="min-w-0 flex-1 rounded-full border border-black/10 px-4 py-3 outline-none" />
                  <button type="button" className="button-secondary w-full shrink-0 sm:w-auto">Check</button>
                </div>
                <p className="mt-3 text-sm text-brand-black/60">Eligible orders of Rs. 999 or more ship free.</p>
              </div>

              <div className="rounded-[28px] bg-brand-black p-6 text-white shadow-card">
                <h2 className="font-heading text-2xl font-bold">Order summary</h2>
                <div className="mt-5 space-y-3 text-sm text-white/76">
                  <div className="flex items-start justify-between gap-4"><span>Subtotal</span><span className="shrink-0 text-right">{currencyFormatter.format(subtotal)}</span></div>
                  <div className="flex items-start justify-between gap-4"><span>Shipping</span><span className="shrink-0 text-right">{shipping === 0 ? "Free" : currencyFormatter.format(shipping)}</span></div>
                  <div className="flex items-start justify-between gap-4"><span>Discount</span><span className="shrink-0 text-right">-{currencyFormatter.format(discount)}</span></div>
                </div>
                <div className="mt-5 flex flex-col gap-2 border-t border-white/10 pt-4 sm:flex-row sm:items-end sm:justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-heading text-4xl font-extrabold leading-none sm:text-3xl">{currencyFormatter.format(total)}</span>
                </div>
                <button type="button" disabled={checkoutRows.length === 0} className="button-primary mt-6 w-full bg-brand-yellow text-brand-black hover:bg-brand-yellow/90 disabled:cursor-not-allowed disabled:opacity-50" onClick={() => navigate("/checkout")}>
                  Proceed to checkout
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

export function CheckoutPage() {
  const navigate = useNavigate();
  const { data: products, loading, error } = useStoreProducts();
  const productList = products ?? [];
  const user = useAppStore((state) => state.user);
  const cart = useAppStore((state) => state.cart);
  const completeOrder = useAppStore((state) => state.completeOrder);
  const setAddresses = useAppStore((state) => state.setAddresses);
  const checkoutItems = cart.filter((item) => !item.savedForLater);
  const [step, setStep] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<"cod" | "payu">("payu");
  const [selectedAddress, setSelectedAddress] = useState(user?.addresses[0]?.id ?? "");
  const [orderNumber, setOrderNumber] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const form = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: user?.addresses[0]
  });

  const subtotal = checkoutItems.reduce((sum, item) => {
    if (item.customisation) return sum + item.customisation.pricingBreakdown.total - item.customisation.pricingBreakdown.delivery;
    const product = productList.find((entry) => entry.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity + calculateCustomizationCharge(item.customization);
  }, 0);

  if (loading) {
    return <div className="container-shell py-20"><LoadingState label="Loading checkout" /></div>;
  }

  if (error || !products) {
    return <div className="container-shell py-20"><EmptyState title="Checkout unavailable" description={error ?? "Products could not be loaded for checkout."} /></div>;
  }

  if (!user) {
    return <div className="container-shell py-20"><EmptyState title="Sign in to checkout" description="Your account keeps delivery addresses and orders securely connected." action={<Link to="/login" state={{ from: "/checkout" }} className="button-primary">Sign in</Link>} /></div>;
  }

  const submitAddress = form.handleSubmit(async (values) => {
    try {
      const addresses = await accountService.createAddress({ ...values, label: "Home", isDefault: user.addresses.length === 0 });
      setAddresses(addresses);
      setSelectedAddress(addresses[0]?.id ?? "");
      setStep(3);
    } catch (addressError) {
      toast.error(addressError instanceof Error ? addressError.message : "The address could not be saved.");
    }
  });

  const activeAddress = user.addresses.find((address) => address.id === selectedAddress) ?? user.addresses[0];

  const submitOrder = async () => {
    if (!activeAddress || checkoutItems.length === 0) {
      toast.error("Add an item and delivery address before placing the order.");
      return;
    }
    setPlacingOrder(true);
    let handedOffToPayu = false;
    try {
      const activeCoupon = useAppStore.getState().activeCoupon;
      const eligibleCoupon = coupons.find((coupon) => coupon.code === activeCoupon && subtotal >= coupon.minimumOrderValue);
      const order = await storefrontService.createOrder({
        customer: { name: user.name, email: user.email, phone: activeAddress.phone },
        address: activeAddress,
        paymentMethod: selectedPayment,
        couponCode: eligibleCoupon?.code,
        items: checkoutItems.map((item) => item.customisation ? ({
          type: "CUSTOMISED_PRODUCT" as const,
          customProductId: item.customisation.customProductId,
          customColourId: item.customisation.customColourId,
          size: item.customisation.size,
          quantity: item.quantity,
          printingMethodId: item.customisation.printingMethodId,
          usedSides: item.customisation.usedSides,
          canvasJson: item.customisation.canvasJson,
          printingAreas: item.customisation.printingAreas ?? Object.fromEntries((["front", "back", "right", "left"] as const).map((side) => { const frame = item.customisation!.framePlacements?.[side] ?? { xPercent: 0, yPercent: 0, widthPercent: 100, heightPercent: 100 }; return [side, { x: frame.xPercent / 100, y: frame.yPercent / 100, width: frame.widthPercent / 100, height: frame.heightPercent / 100 }]; })),
          safeAreaVersions: item.customisation.safeAreaVersions ?? { front: "legacy-1", back: "legacy-1", right: "legacy-1", left: "legacy-1" },
          previewUrls: item.customisation.previewUrls,
          originalArtworkUrls: item.customisation.originalArtworkUrls,
          highResolutionFiles: item.customisation.highResolutionFiles ?? item.customisation.originalArtworkUrls,
          dpiWarningStatus: item.customisation.dpiWarningStatus ?? {},
          physicalOutputDimensions: item.customisation.physicalOutputDimensions ?? {},
          customerNote: item.customisation.customerNote
        }) : ({
          type: "STANDARD_PRODUCT" as const, productId: item.productId,
          // Persisted carts may still contain the old synthetic fallback id
          // (`<product UUID>-0-0`). Only send IDs the API can accept as UUIDs.
          variantId: item.variantId !== item.productId && z.string().uuid().safeParse(item.variantId).success
            ? item.variantId
            : undefined,
          selectedColor: item.selectedColor ?? item.customization?.productColor,
          selectedSize: item.selectedSize ?? item.customization?.size,
          quantity: item.quantity, customization: item.customization
        }))
      });
      completeOrder(order);
      if (selectedPayment === "payu") {
        try {
          const payment = await storefrontService.initiatePayu(order.id);
          submitHostedPayment(payment.action, payment.params);
          handedOffToPayu = true;
          return;
        } catch (paymentError) {
          const query = new URLSearchParams({ orderId: order.id, orderNumber: order.orderNumber });
          toast.error(paymentError instanceof Error ? paymentError.message : "Payment could not be started.");
          navigate(`/payment-failed?${query.toString()}`);
          return;
        }
      }
      setOrderNumber(order.orderNumber);
      setStep(6);
    } catch (orderError) {
      toast.error(orderError instanceof Error ? orderError.message : "The order could not be placed.");
    } finally {
      if (!handedOffToPayu) setPlacingOrder(false);
    }
  };

  return (
    <>
      <Seo title="Checkout" description="A polished multi-step checkout with guest flow, address collection, payment selection and confirmation." path="/checkout" />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Checkout" }]} />
        <SectionIntro eyebrow="Checkout" title="Complete your order" description="Review delivery details and place your order securely." />
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
          <section className="rounded-[32px] bg-white p-6 shadow-card">
            <div className="mb-8 grid gap-3 md:grid-cols-6">
              {["Login", "Address", "Delivery", "Summary", "Payment", "Confirmation"].map((label, index) => (
                <div key={label} className={`rounded-full px-4 py-3 text-center text-sm font-semibold ${step >= index + 1 ? "bg-brand-black text-white" : "bg-brand-grey text-brand-black/60"}`}>
                  {label}
                </div>
              ))}
            </div>

            {step === 1 ? (
              <div className="space-y-4">
                <p className="text-sm leading-7 text-brand-black/68">Continue as {user.email} or use the guest-style address flow below.</p>
                <div className="flex flex-wrap gap-4">
                  <button type="button" className="button-primary" onClick={() => setStep(2)}>Continue with account</button>
                  <button type="button" className="button-secondary" onClick={() => setStep(2)}>Guest checkout</button>
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <form onSubmit={submitAddress} className="grid gap-5 md:grid-cols-2">
                <InputField label="Recipient" register={form.register("recipient")} error={form.formState.errors.recipient} />
                <InputField label="Phone" register={form.register("phone")} error={form.formState.errors.phone} />
                <div className="md:col-span-2">
                  <InputField label="Address line" register={form.register("line1")} error={form.formState.errors.line1} />
                </div>
                <InputField label="City" register={form.register("city")} error={form.formState.errors.city} />
                <InputField label="State" register={form.register("state")} error={form.formState.errors.state} />
                <InputField label="PIN code" register={form.register("pinCode")} error={form.formState.errors.pinCode} />
                <InputField label="Country" register={form.register("country")} error={form.formState.errors.country} />
                <div className="md:col-span-2">
                  <button type="submit" className="button-primary">Save address and continue</button>
                </div>
              </form>
            ) : null}

            {step === 3 ? (
              <div className="space-y-4">
                <p className="text-sm font-semibold">Delivery method</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {["Standard delivery · 3-5 days", "Express delivery · 1-2 days"].map((option) => (
                    <button key={option} type="button" onClick={() => setStep(4)} className="rounded-[24px] border border-black/10 px-4 py-4 text-left">
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div className="space-y-4">
                <p className="text-sm leading-7 text-brand-black/68">Review your items, shipping address and discounts before choosing a payment method.</p>
                {checkoutItems.map((item) => {
                  const product = productList.find((entry) => entry.id === item.productId);
                  return item.customisation ? (
                    <div key={item.id} className="rounded-[24px] border border-brand-cyan/20 bg-brand-grey p-4"><div className="text-xs font-extrabold uppercase tracking-[0.1em] text-brand-cyan-dark">Customised Product</div><div className="mt-1 font-semibold">{item.customisation.productName}</div><div className="text-sm text-brand-black/60">{item.customisation.colourName} · {item.customisation.size} · Qty {item.quantity}</div></div>
                  ) : product ? (
                    <div key={item.id} className="rounded-[24px] bg-brand-grey p-4">
                      <div className="font-semibold">{product.name}</div>
                      <div className="text-sm text-brand-black/60">Qty {item.quantity}</div>
                    </div>
                  ) : null;
                })}
                <button type="button" className="button-primary" onClick={() => setStep(5)}>Continue to payment</button>
              </div>
            ) : null}

            {step === 5 ? (
              <div className="space-y-4">
                <p className="text-sm font-semibold">Payment</p>
                <div className="grid gap-4 md:grid-cols-2">
                  {(["payu", "cod"] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      aria-pressed={selectedPayment === method}
                      onClick={() => setSelectedPayment(method)}
                      className={`min-h-16 rounded-2xl border px-4 py-4 text-left transition-colors ${selectedPayment === method ? "border-brand-black bg-brand-black text-white" : "border-black/10 bg-brand-grey text-brand-black hover:border-brand-cyan"}`}
                    >
                      <span className="block font-semibold">{method === "payu" ? "Pay securely with PayU" : "Cash on delivery"}</span>
                      <span className={`mt-1 block text-xs ${selectedPayment === method ? "text-white/70" : "text-brand-black/60"}`}>
                        {method === "payu" ? "Cards, UPI, net banking and supported wallets" : "Pay when your order is delivered"}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="text-sm leading-7 text-brand-black/60">
                  {selectedPayment === "payu"
                    ? "PayU opens its secure hosted checkout. FabPodd never receives or stores your card or CVV details."
                    : "Your order will be confirmed now and payment will be collected when it is delivered."}
                </p>
                <button
                  type="button"
                  className="button-primary"
                  disabled={placingOrder}
                  onClick={() => void submitOrder()}
                >
                  {placingOrder
                    ? selectedPayment === "payu" ? "Preparing payment..." : "Placing order..."
                    : selectedPayment === "payu" ? "Pay now" : "Place order"}
                </button>
              </div>
            ) : null}

            {step === 6 ? (
              <div className="space-y-4">
                <SuccessInline label={`Order confirmed. Reference: ${orderNumber}`} />
                <p className="text-sm leading-7 text-brand-black/68">Your order has been saved and stock has been reserved. Keep the reference and account email for tracking.</p>
                <div className="flex flex-wrap gap-4">
                  <button type="button" className="button-primary" onClick={() => navigate("/account")}>View order history</button>
                  <Link to="/track-order" className="button-secondary">Track order</Link>
                </div>
              </div>
            ) : null}
          </section>

          <aside className="rounded-[32px] bg-brand-black p-6 text-white shadow-card">
            <h2 className="font-heading text-2xl font-bold">Order summary</h2>
            <div className="mt-5 space-y-3 text-sm text-white/74">
              <div className="flex justify-between"><span>Items subtotal</span><span>{currencyFormatter.format(subtotal)}</span></div>
              <div className="flex justify-between"><span>Estimated shipping</span><span>{subtotal >= 999 ? "Free" : currencyFormatter.format(99)}</span></div>
              <div className="flex justify-between"><span>Payment method</span><span>{paymentMethodLabel(selectedPayment)}</span></div>
            </div>
            <div className="mt-6 rounded-[24px] bg-white/8 p-4 text-sm text-white/70">
              {activeAddress ? (
                <>
                  <p className="font-semibold text-white">Delivering to</p>
                  <p className="mt-2">{activeAddress.recipient}, {activeAddress.line1}</p>
                  <p>{activeAddress.city}, {activeAddress.state} {activeAddress.pinCode}</p>
                </>
              ) : (
                <p>Select or add an address to continue.</p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

export function PaymentSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const [payment, setPayment] = useState<{ orderNumber: string; paymentStatus: string } | null>(null);
  const [verificationError, setVerificationError] = useState("");

  useEffect(() => {
    let active = true;
    if (!orderId) {
      setVerificationError("This payment link is missing its order reference.");
      return () => { active = false; };
    }
    void storefrontService.getPayuStatus(orderId)
      .then((result) => { if (active) setPayment(result); })
      .catch((error) => { if (active) setVerificationError(error instanceof Error ? error.message : "Payment status could not be verified."); });
    return () => { active = false; };
  }, [orderId]);

  const confirmed = payment?.paymentStatus === "Paid";
  const heading = confirmed ? "Payment confirmed" : payment ? "Payment confirmation pending" : verificationError ? "Payment not verified" : "Verifying payment";
  const description = confirmed
    ? "Your payment was verified and the order is now confirmed for fulfilment."
    : payment
      ? "We have your order, but PayU has not confirmed the payment yet. Check your order again shortly."
      : verificationError || "Checking the secure payment response before confirming your order.";

  return (
    <>
      <Seo title={confirmed ? "Payment successful" : "Payment status"} description={description} path="/payment-success" />
      <main className="container-shell py-12 pb-28 sm:py-20">
        <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-card">
          <div className="bg-brand-black px-6 py-10 text-white sm:px-10">
            {confirmed ? <PackageCheck className="h-12 w-12 text-brand-cyan" aria-hidden="true" /> : <XCircle className="h-12 w-12 text-brand-cyan" aria-hidden="true" />}
            <h1 className="mt-6 max-w-xl font-heading text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">{heading}</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75" role="status">{description}</p>
          </div>
          <div className="px-6 py-8 sm:px-10">
            <p className="text-sm font-semibold text-brand-black/60">Order number</p>
            <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-brand-black">{payment?.orderNumber ?? "—"}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/account" className="button-primary">View order history</Link>
              <Link to="/track-order" className="button-secondary">Track order</Link>
              {payment && !confirmed ? <Link to={`/payment-failed?${new URLSearchParams({ orderId, orderNumber: payment.orderNumber }).toString()}`} className="button-secondary">Retry payment</Link> : null}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export function PaymentFailedPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId") || "";
  const orderNumber = searchParams.get("orderNumber") || "your order";
  const [retrying, setRetrying] = useState(false);

  const retryPayment = async () => {
    if (!orderId) {
      toast.error("The order reference is missing. Open the order from your account and try again.");
      return;
    }
    setRetrying(true);
    try {
      const payment = await storefrontService.initiatePayu(orderId);
      submitHostedPayment(payment.action, payment.params);
    } catch (paymentError) {
      toast.error(paymentError instanceof Error ? paymentError.message : "Payment could not be restarted.");
      setRetrying(false);
    }
  };

  return (
    <>
      <Seo title="Payment unsuccessful" description="Retry payment for your existing FabPodd order." path="/payment-failed" />
      <main className="container-shell py-12 pb-28 sm:py-20">
        <section className="mx-auto max-w-3xl overflow-hidden rounded-3xl bg-white shadow-card">
          <div className="bg-brand-black px-6 py-10 text-white sm:px-10">
            <XCircle className="h-12 w-12 text-red-300" aria-hidden="true" />
            <h1 className="mt-6 max-w-xl font-heading text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl">Payment wasn’t completed</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">Your order is still saved. Retry payment below—no duplicate order will be created.</p>
          </div>
          <div className="px-6 py-8 sm:px-10">
            <p className="text-sm font-semibold text-brand-black/60">Order number</p>
            <p className="mt-2 font-heading text-2xl font-extrabold tabular-nums text-brand-black">{orderNumber}</p>
            {!orderId ? <p className="mt-4 text-sm leading-6 text-red-700">This payment link is missing its order reference. Open the saved order from your account to continue.</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <button type="button" className="button-primary" disabled={retrying || !orderId} onClick={() => void retryPayment()}>
                {retrying ? "Opening PayU..." : "Retry payment"}
              </button>
              <Link to="/account" className="button-secondary">View order</Link>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

export function AuthPage() {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { refresh } = useCustomerAuth();
  const requestedMode = searchParams.get("mode");
  const routeMode = location.pathname === "/register" ? "signup" : location.pathname === "/forgot-password" ? "forgot" : location.pathname === "/reset-password" ? "reset" : null;
  const initialMode = routeMode ?? (requestedMode === "signup" || requestedMode === "forgot" ? requestedMode : "login");
  const [mode, setMode] = useState<"login" | "signup" | "forgot" | "reset">(initialMode);
  const [busy, setBusy] = useState(false);
  const [developmentResetUrl, setDevelopmentResetUrl] = useState("");
  const googleEnabled = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim());
  const isSetPassword = mode === "reset" && searchParams.get("purpose") === "set";
  const loginForm = useForm<z.infer<typeof loginSchema>>({ resolver: zodResolver(loginSchema), defaultValues: { email: "", password: "" } });
  const registerForm = useForm<z.infer<typeof registerSchema>>({ resolver: zodResolver(registerSchema), defaultValues: { name: "", email: "", phone: "", password: "", confirmPassword: "", acceptedTerms: false } });
  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema)
  });
  const resetForm = useForm<z.infer<typeof resetPasswordSchema>>({ resolver: zodResolver(resetPasswordSchema), defaultValues: { password: "", confirmPassword: "" } });

  const finishAuthentication = async (message: string) => {
    await refresh();
    toast.success(message);
    const destination = (location.state as { from?: string } | null)?.from || "/account";
    navigate(destination, { replace: true });
  };

  const submitLogin = loginForm.handleSubmit(async (values) => {
    setBusy(true);
    try { await accountService.login(values); await finishAuthentication("Signed in successfully."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Sign in failed."); }
    finally { setBusy(false); }
  });

  const submitRegistration = registerForm.handleSubmit(async (values) => {
    setBusy(true);
    try { await accountService.register(values); await finishAuthentication("Your FabPodd account is ready."); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Account creation failed."); }
    finally { setBusy(false); }
  });

  const submitGoogle = async (response: CredentialResponse) => {
    if (mode === "signup" && !registerForm.getValues("acceptedTerms")) {
      registerForm.setError("acceptedTerms", { message: "Please accept the Terms & Conditions and acknowledge the Privacy Policy." });
      toast.error("Please review and accept the legal terms before creating an account.");
      return;
    }
    if (!response.credential) {
      toast.error("Google did not return a sign-in credential. Please try again.");
      return;
    }
    setBusy(true);
    try {
      await accountService.googleLogin(response.credential);
      await finishAuthentication("Signed in securely with Google.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Google sign-in failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = forgotForm.handleSubmit(async ({ email }) => {
    setBusy(true); setDevelopmentResetUrl("");
    try { const result = await accountService.forgotPassword(email); setDevelopmentResetUrl(result.developmentResetUrl ?? ""); toast.success(result.message); forgotForm.reset(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "The reset email could not be sent."); }
    finally { setBusy(false); }
  });

  const submitReset = resetForm.handleSubmit(async (values) => {
    const token = searchParams.get("token");
    if (!token) { toast.error("This reset link is missing its secure token."); return; }
    setBusy(true);
    try { const result = await accountService.resetPassword({ token, ...values }); toast.success(isSetPassword ? "Your password is set. You can now sign in with Google or email." : result.message); navigate("/login", { replace: true }); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Password reset failed."); }
    finally { setBusy(false); }
  });

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const selectMode = (nextMode: "login" | "signup" | "forgot") => {
    setMode(nextMode);
    navigate(nextMode === "login" ? "/login" : nextMode === "signup" ? "/register" : "/forgot-password", { replace: true });
  };

  const authModes: Array<{ value: "login" | "signup" | "forgot"; label: string }> = [
    { value: "login", label: "Sign in" },
    { value: "signup", label: "Create account" },
    { value: "forgot", label: "Reset password" }
  ];

  return (
    <>
      <Seo title={mode === "signup" ? "Create account" : mode === "reset" ? isSetPassword ? "Set password" : "Reset password" : "Sign in"} description="Secure access to your FabPodd orders, wishlist, saved designs and addresses." path={location.pathname} />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Sign in" }]} />
        <div className="grid gap-8 rounded-[36px] bg-white p-8 shadow-card lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] bg-brand-black p-8 text-white">
            <div className="inline-flex rounded-[22px] bg-white px-4 py-3">
              <BrandLogo className="h-16 w-[176px]" />
            </div>
            <h1 className="mt-6 font-heading text-4xl font-extrabold">Your orders, saved ideas and delivery details—together.</h1>
            <p className="mt-4 text-base leading-8 text-white/72">
              Sign in securely to continue a design, revisit favourites, manage addresses and follow every order.
            </p>
          </div>
          <div>
            <div className="flex flex-wrap gap-3" aria-label="Account access options">
              {mode !== "reset" ? authModes.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => selectMode(value)}
                  className={`rounded-full px-4 py-3 text-sm font-semibold ${mode === value ? "bg-brand-black text-white" : "bg-brand-grey text-brand-black"}`}
                >
                  {label}
                </button>
              )) : <Link to="/login" className="button-secondary">Back to sign in</Link>}
            </div>
            {(mode === "login" || mode === "signup") && googleEnabled ? (
              <div className={`mt-6 ${busy ? "pointer-events-none opacity-60" : ""}`} aria-busy={busy}>
                {mode === "signup" ? <LegalAcceptance registerForm={registerForm} /> : null}
                <div className="flex min-h-11 justify-center overflow-hidden rounded-full">
                  <GoogleLogin
                    onSuccess={(response) => void submitGoogle(response)}
                    onError={() => toast.error("Google sign-in was cancelled or could not be completed.")}
                    text="continue_with"
                    shape="pill"
                    size="large"
                    theme="outline"
                    useOneTap={false}
                  />
                </div>
                <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.12em] text-brand-muted" aria-hidden="true">
                  <span className="h-px flex-1 bg-black/10" /><span>or use email</span><span className="h-px flex-1 bg-black/10" />
                </div>
              </div>
            ) : null}
            {mode === "login" ? (
              <form onSubmit={submitLogin} className="mt-6 grid gap-5">
                <InputField label="Email" type="email" register={loginForm.register("email")} error={loginForm.formState.errors.email} />
                <InputField label="Password" type="password" register={loginForm.register("password")} error={loginForm.formState.errors.password} />
                <button type="submit" disabled={busy} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
              </form>
            ) : mode === "signup" ? (
              <form onSubmit={submitRegistration} className="mt-6 grid gap-5">
                <InputField label="Full name" register={registerForm.register("name")} error={registerForm.formState.errors.name} />
                <InputField label="Email" type="email" register={registerForm.register("email")} error={registerForm.formState.errors.email} />
                <InputField label="Mobile number" type="tel" register={registerForm.register("phone")} error={registerForm.formState.errors.phone} />
                <InputField label="Password" type="password" register={registerForm.register("password")} error={registerForm.formState.errors.password} />
                <InputField label="Confirm password" type="password" register={registerForm.register("confirmPassword")} error={registerForm.formState.errors.confirmPassword} />
                {!googleEnabled ? <LegalAcceptance registerForm={registerForm} /> : null}
                <button type="submit" disabled={busy} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Creating account…" : "Create account"}</button>
              </form>
            ) : mode === "forgot" ? (
              <form onSubmit={submitForgot} className="mt-6 grid gap-5">
                <InputField label="Email" type="email" register={forgotForm.register("email")} error={forgotForm.formState.errors.email} />
                <button type="submit" disabled={busy} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">{busy ? "Sending…" : "Send secure reset link"}</button>
                {developmentResetUrl ? <a className="text-sm font-semibold text-brand-cyan-dark underline" href={developmentResetUrl}>Open development reset link</a> : null}
              </form>
            ) : (
              <form onSubmit={submitReset} className="mt-6 grid gap-5">
                <InputField label={isSetPassword ? "Password" : "New password"} type="password" register={resetForm.register("password")} error={resetForm.formState.errors.password} />
                <InputField label={isSetPassword ? "Confirm password" : "Confirm new password"} type="password" register={resetForm.register("confirmPassword")} error={resetForm.formState.errors.confirmPassword} />
                <button type="submit" disabled={busy} className="button-primary disabled:cursor-not-allowed disabled:opacity-60">{busy ? isSetPassword ? "Setting password…" : "Resetting…" : isSetPassword ? "Set password" : "Reset password"}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function LegalAcceptance({ registerForm }: { registerForm: ReturnType<typeof useForm<z.infer<typeof registerSchema>>> }) {
  const error = registerForm.formState.errors.acceptedTerms;
  return (
    <div className="mb-5">
      <label className="flex cursor-pointer items-start gap-3 rounded-2xl bg-brand-soft p-4 text-sm leading-6 text-brand-charcoal">
        <input type="checkbox" {...registerForm.register("acceptedTerms")} className="mt-1 h-4 w-4 shrink-0 accent-brand-cyan" />
        <span>I agree to the <Link to="/terms-and-conditions" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-cyan-dark underline underline-offset-4">Terms & Conditions</Link> and acknowledge the <Link to="/privacy-policy" target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-cyan-dark underline underline-offset-4">Privacy Policy</Link>.</span>
      </label>
      {error ? <p className="mt-2 text-sm font-medium text-red-700" role="alert">{error.message}</p> : null}
    </div>
  );
}

export function AccountPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const { data: products, loading: productsLoading } = useStoreProducts();
  const productList = products ?? [];
  const user = useAppStore((state) => state.user)!;
  const wishlist = useAppStore((state) => state.wishlist);
  const orders = useAppStore((state) => state.orders);
  const setUser = useAppStore((state) => state.setUser);
  const setAddresses = useAppStore((state) => state.setAddresses);
  const setWishlist = useAppStore((state) => state.setWishlist);
  const logout = useAppStore((state) => state.logout);
  const addToCart = useAppStore((state) => state.addToCart);
  const [summary, setSummary] = useState({ orders: orders.length, wishlist: wishlist.length, designs: 0, addresses: user.addresses.length });
  const [designs, setDesigns] = useState<SavedCustomDesign[]>([]);
  const [loadingAccount, setLoadingAccount] = useState(true);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [settingPassword, setSettingPassword] = useState(false);
  const [developmentSetPasswordUrl, setDevelopmentSetPasswordUrl] = useState("");
  const activeTab = section ?? "overview";

  const profileForm = useForm<z.infer<typeof profileSchema>>({ resolver: zodResolver(profileSchema), defaultValues: { name: user.name, phone: user.phone } });
  const addressForm = useForm<z.infer<typeof managedAddressSchema>>({ resolver: zodResolver(managedAddressSchema), defaultValues: { label: "Home", recipient: user.name, phone: user.phone, line1: "", line2: "", landmark: "", city: "", state: "", pinCode: "", country: "India", isDefault: false } });
  const securityForm = useForm<z.infer<typeof changePasswordSchema>>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });

  useEffect(() => {
    let active = true;
    Promise.all([accountService.getSummary(), accountService.getDesigns()])
      .then(([nextSummary, nextDesigns]) => { if (active) { setSummary(nextSummary); setDesigns(nextDesigns); } })
      .catch((loadError) => { if (active) toast.error(loadError instanceof Error ? loadError.message : "Account information could not be loaded."); })
      .finally(() => { if (active) setLoadingAccount(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => { profileForm.reset({ name: user.name, phone: user.phone }); }, [profileForm, user.name, user.phone]);

  const wishedProducts = wishlist.map((item) => productList.find((product) => product.id === item.productId)).filter(Boolean);
  const submitProfile = profileForm.handleSubmit(async (values) => {
    try { const updated = await accountService.updateProfile(values); setUser(updated); toast.success("Profile updated."); }
    catch (profileError) { toast.error(profileError instanceof Error ? profileError.message : "Profile could not be updated."); }
  });
  const uploadAvatar = async (file?: File) => {
    if (!file) return;
    try { const updated = await accountService.uploadAvatar(file); setUser(updated); toast.success("Profile picture updated."); }
    catch (avatarError) { toast.error(avatarError instanceof Error ? avatarError.message : "Profile picture could not be uploaded."); }
  };
  const openAddressForm = (address?: Address) => {
    setEditingAddress(address ?? null); setShowAddressForm(true);
    addressForm.reset(address ? { label: address.label === "Office" ? "Office" : "Home", recipient: address.recipient, phone: address.phone, line1: address.line1, line2: address.line2 ?? "", landmark: address.landmark ?? "", city: address.city, state: address.state, pinCode: address.pinCode, country: address.country, isDefault: Boolean(address.isDefault) } : { label: "Home", recipient: user.name, phone: user.phone, line1: "", line2: "", landmark: "", city: "", state: "", pinCode: "", country: "India", isDefault: user.addresses.length === 0 });
  };
  const submitAddress = addressForm.handleSubmit(async (values) => {
    try {
      const addresses = editingAddress ? await accountService.updateAddress(editingAddress.id, values) : await accountService.createAddress(values);
      setAddresses(addresses); setShowAddressForm(false); setEditingAddress(null); toast.success(editingAddress ? "Address updated." : "Address added.");
    } catch (addressError) { toast.error(addressError instanceof Error ? addressError.message : "Address could not be saved."); }
  });
  const removeAddress = async (id: string) => {
    try { setAddresses(await accountService.deleteAddress(id)); toast.success("Address removed."); }
    catch (addressError) { toast.error(addressError instanceof Error ? addressError.message : "Address could not be removed."); }
  };
  const makeDefaultAddress = async (id: string) => {
    try { setAddresses(await accountService.setDefaultAddress(id)); toast.success("Default address updated."); }
    catch (addressError) { toast.error(addressError instanceof Error ? addressError.message : "Default address could not be updated."); }
  };
  const removeWishlistItem = async (productId: string) => {
    try { await accountService.removeWishlist(productId); setWishlist(wishlist.filter((item) => item.productId !== productId)); }
    catch (wishlistError) { toast.error(wishlistError instanceof Error ? wishlistError.message : "Wishlist could not be updated."); }
  };
  const deleteDesign = async (id: string) => {
    try { await accountService.deleteDesign(id); setDesigns((items) => items.filter((item) => item.id !== id)); setSummary((value) => ({ ...value, designs: Math.max(0, value.designs - 1) })); }
    catch (designError) { toast.error(designError instanceof Error ? designError.message : "Design could not be removed."); }
  };
  const submitPassword = securityForm.handleSubmit(async (values) => {
    try { const result = await accountService.changePassword(values); toast.success(result.message); logout(); navigate("/login", { replace: true }); }
    catch (passwordError) { toast.error(passwordError instanceof Error ? passwordError.message : "Password could not be changed."); }
  });
  const requestSetPassword = async () => {
    setSettingPassword(true); setDevelopmentSetPasswordUrl("");
    try {
      const result = await accountService.requestSetPassword();
      setDevelopmentSetPasswordUrl(result.developmentResetUrl ?? "");
      toast.success(result.message);
    } catch (passwordError) {
      toast.error(passwordError instanceof Error ? passwordError.message : "The verification email could not be sent.");
    } finally { setSettingPassword(false); }
  };

  const navItems = [
    ["overview", "Overview", UserRound], ["profile", "My Profile", UserRound], ["orders", "My Orders", Package],
    ["wishlist", "My Wishlist", Heart], ["designs", "My Custom Designs", Palette], ["addresses", "Saved Addresses", MapPin], ["security", user.hasPassword ? "Change Password" : "Set Password", LockKeyhole]
  ] as const;
  const overviewCards = [
    { label: "Orders", value: summary.orders, to: "/account/orders", icon: Package },
    { label: "Wishlist", value: summary.wishlist, to: "/account/wishlist", icon: Heart },
    { label: "Saved designs", value: summary.designs, to: "/account/designs", icon: Palette },
    { label: "Addresses", value: summary.addresses, to: "/account/addresses", icon: MapPin }
  ];

  return (
    <>
      <Seo title="My Account" description="Profile, addresses, wishlist, order history, returns and review submission in one account area." path="/account" />
      <div className="container-shell py-8 pb-28">
        <div className="hidden md:block">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Account" }]} />
        </div>
        <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <aside className={`self-start rounded-2xl bg-brand-black p-3 text-white lg:sticky lg:top-[calc(var(--total-header-height)+24px)] ${activeTab === "wishlist" ? "hidden lg:block" : ""}`}>
            <div className="px-3 py-4"><p className="truncate font-heading text-xl font-bold">{user.name}</p><p className="truncate text-xs text-white/65">{user.email}</p></div>
            <nav className="space-y-1 text-sm font-semibold">
              {navItems.map(([tab, label, Icon]) => (
                <Link key={tab} to={tab === "overview" ? "/account" : `/account/${tab}`} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 ${activeTab === tab ? "bg-brand-cyan text-brand-black" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                  <Icon className="h-4 w-4" />{label}
                </Link>
              ))}
            </nav>
          </aside>

          <section className="space-y-6">
            {loadingAccount ? <LoadingState label="Loading your account" /> : null}
            {activeTab === "overview" && !loadingAccount ? (
              <div className="overflow-hidden rounded-2xl bg-white shadow-card">
                <div className="bg-brand-black px-6 py-8 text-white sm:px-8"><h1 className="font-heading text-3xl font-extrabold sm:text-4xl">Welcome back, {user.firstName ?? user.name.split(" ")[0]}</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-white/70">Review orders, return to saved designs, and keep delivery details ready for checkout.</p></div>
                <div className="grid gap-px bg-black/8 sm:grid-cols-2 xl:grid-cols-4">{overviewCards.map(({ label, value, to, icon: Icon }) => <Link key={label} to={to} className="bg-white p-6 transition hover:bg-brand-soft"><Icon className="h-5 w-5 text-brand-cyan-dark" /><strong className="mt-5 block font-heading text-3xl tabular-nums">{value}</strong><span className="mt-1 block text-sm text-brand-muted">{label}</span></Link>)}</div>
              </div>
            ) : null}
            {activeTab === "profile" ? (
              <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
                <SectionIntro title="My Profile" description="Keep your contact details current for order updates and delivery coordination." />
                <div className="mb-8 flex flex-wrap items-center gap-5"><CustomerAvatar src={user.avatar} name={user.name} className="h-24 w-24" iconClassName="h-9 w-9" /><div><p className="font-semibold">Profile picture</p><label className="button-secondary mt-3 cursor-pointer"><Camera className="mr-2 h-4 w-4" />Upload image<input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => void uploadAvatar(event.target.files?.[0])} /></label></div></div>
                <form onSubmit={submitProfile} className="grid gap-5 md:grid-cols-2"><InputField label="Full name" register={profileForm.register("name")} error={profileForm.formState.errors.name} /><InputField label="Mobile number" type="tel" register={profileForm.register("phone")} error={profileForm.formState.errors.phone} /><div className="md:col-span-2"><p className="text-sm font-semibold">Email address</p><p className="mt-2 rounded-xl bg-brand-soft px-4 py-3 text-sm text-brand-muted">{user.email}</p></div><button type="submit" className="button-primary md:col-span-2 md:justify-self-start"><Save className="mr-2 h-4 w-4" />Save profile</button></form>
              </div>
            ) : null}

            {activeTab === "addresses" ? (
              <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
                <SectionIntro title="Saved Addresses" description="Add home or office addresses and choose the default used at checkout." action={<button type="button" className="button-primary" onClick={() => openAddressForm()}><Plus className="mr-2 h-4 w-4" />Add address</button>} />
                {showAddressForm ? <form onSubmit={submitAddress} className="mb-8 grid gap-4 rounded-2xl bg-brand-soft p-5 md:grid-cols-2"><SelectField label="Address type" register={addressForm.register("label")} error={addressForm.formState.errors.label} options={["Home","Office"]} /><InputField label="Full name" register={addressForm.register("recipient")} error={addressForm.formState.errors.recipient} /><InputField label="Mobile number" type="tel" register={addressForm.register("phone")} error={addressForm.formState.errors.phone} /><InputField label="Address line 1" register={addressForm.register("line1")} error={addressForm.formState.errors.line1} /><InputField label="Address line 2" register={addressForm.register("line2")} error={addressForm.formState.errors.line2} /><InputField label="Landmark" register={addressForm.register("landmark")} error={addressForm.formState.errors.landmark} /><InputField label="City" register={addressForm.register("city")} error={addressForm.formState.errors.city} /><InputField label="State" register={addressForm.register("state")} error={addressForm.formState.errors.state} /><InputField label="PIN code" register={addressForm.register("pinCode")} error={addressForm.formState.errors.pinCode} /><InputField label="Country" register={addressForm.register("country")} error={addressForm.formState.errors.country} /><label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" {...addressForm.register("isDefault")} />Use as default address</label><div className="flex flex-wrap gap-3 md:col-span-2"><button type="submit" className="button-primary">{editingAddress ? "Update address" : "Save address"}</button><button type="button" className="button-secondary" onClick={() => setShowAddressForm(false)}>Cancel</button></div></form> : null}
                {user.addresses.length ? <div className="grid gap-4 md:grid-cols-2">
                  {user.addresses.map((address) => (
                    <div key={address.id} className="rounded-2xl border border-black/8 p-5">
                      <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" />{address.label}</div>{address.isDefault ? <span className="rounded-full bg-brand-cyan/15 px-3 py-1 text-xs font-semibold text-brand-cyan-dark">Default</span> : null}</div>
                      <p className="mt-4 text-sm font-semibold">{address.recipient} · {address.phone}</p><p className="mt-1 text-sm leading-6 text-brand-muted">{address.line1}{address.line2 ? `, ${address.line2}` : ""}{address.landmark ? `, near ${address.landmark}` : ""}<br />{address.city}, {address.state} {address.pinCode}</p>
                      <div className="mt-5 flex flex-wrap gap-2"><button type="button" className="button-secondary px-4 py-2" onClick={() => openAddressForm(address)}>Edit</button>{!address.isDefault ? <button type="button" className="button-secondary px-4 py-2" onClick={() => void makeDefaultAddress(address.id)}>Set default</button> : null}<button type="button" className="button-secondary px-4 py-2 text-red-700" onClick={() => void removeAddress(address.id)}>Delete</button></div>
                    </div>
                  ))}
                </div> : <EmptyState title="No saved addresses" description="Add an address to make checkout faster." />}
              </div>
            ) : null}

            {activeTab === "wishlist" ? (
              <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
                <SectionIntro title="My Wishlist" description="Your favourites stay saved to this account across devices and sessions." />
                {productsLoading ? <LoadingState label="Loading wishlist" /> : wishedProducts.length ? <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {wishedProducts.map((product) =>
                    product ? (
                      <div key={product.id} className="rounded-2xl bg-brand-soft p-4">
                        <AssetImage
                          src={product.images[0]}
                          alt={product.name}
                          expectedPath={defaultProductAssetPath(product.slug)}
                          missingLabel="Product image is missing"
                          imageClassName="aspect-[4/4.4] w-full rounded-[20px] object-cover"
                          fallbackClassName="aspect-[4/4.4] w-full rounded-[20px]"
                        />
                        <p className="mt-4 font-semibold">{product.name}</p>
                        <p className="mt-1 text-sm text-brand-black/60">{currencyFormatter.format(product.price)}</p>
                        <div className="mt-4 grid gap-2"><button type="button" className="button-primary" onClick={() => { addToCart({ productId:product.id,variantId:product.variants[0]?.id??product.id,quantity:1 }); toast.success("Added to bag."); }}>Add to bag</button><button type="button" className="text-sm font-semibold text-red-700" onClick={() => void removeWishlistItem(product.id)}>Remove</button></div>
                      </div>
                    ) : null
                  )}
                </div> : <EmptyState title="Your wishlist is empty" description="Save products while browsing and they will appear here." action={<Link to="/shop" className="button-primary">Browse products</Link>} />}
              </div>
            ) : null}

            {activeTab === "orders" ? (
              <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
                <SectionIntro title="My Orders" description="Review products, payment status, fulfilment progress and tracking information." />
                {orders.length ? <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-2xl border border-black/8 p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-brand-black/60">{new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(order.createdAt))} · {order.status} · Payment {order.paymentStatus}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link to="/track-order" className="button-secondary">Track order</Link>
                          <button type="button" className="button-secondary" onClick={() => downloadInvoice(order)}>Download invoice</button>
                          <button type="button" className="button-secondary">Cancel request</button>
                          <button type="button" className="button-secondary">Return request</button>
                        </div>
                      </div>
                      <div className="mt-5 divide-y divide-black/8 border-y border-black/8">{order.items.map((item)=><div key={item.id} className="flex items-center gap-4 py-4">{item.image?<img src={item.image} alt="" className="h-16 w-14 rounded-xl object-cover"/>:<div className="h-16 w-14 rounded-xl bg-brand-soft"/>}<div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.productName??"Product"}</p><p className="text-xs text-brand-muted">Qty {item.quantity}{item.selectedSize?` · ${item.selectedSize}`:""}</p></div><p className="shrink-0 font-semibold">{currencyFormatter.format(item.total??item.price*item.quantity)}</p></div>)}</div>
                      <div className="mt-4 flex justify-between text-sm font-semibold"><span>{order.trackingNumber?`Tracking: ${order.trackingNumber}`:"Tracking will appear after dispatch"}</span><span>Total {currencyFormatter.format(order.total)}</span></div>
                    </div>
                  ))}
                </div> : <EmptyState title="No orders yet" description="Your completed checkouts will appear here." action={<Link to="/shop" className="button-primary">Start shopping</Link>} />}
              </div>
            ) : null}

            {activeTab === "designs" ? <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8"><SectionIntro title="My Custom Designs" description="Reopen saved artwork, continue editing, or return it to the shopping flow." />{designs.length?<div className="grid gap-4 md:grid-cols-2">{designs.map((design)=><div key={design.id} className="rounded-2xl border border-black/8 p-4">{design.previewUrl?<img src={design.previewUrl} alt={`${design.title} preview`} className="aspect-[4/3] w-full rounded-xl bg-brand-soft object-contain"/>:<div className="grid aspect-[4/3] place-items-center rounded-xl bg-brand-soft"><Palette className="h-8 w-8 text-brand-cyan-dark"/></div>}<h3 className="mt-4 truncate font-heading text-xl font-bold">{design.title}</h3><p className="mt-1 text-sm text-brand-muted">{design.productName} · {design.colourName} · {design.selectedSize}</p><div className="mt-4 flex gap-2"><Link to={`/customise/${design.productSlug}/design?savedDesign=${design.id}&colour=${encodeURIComponent(design.colourSlug)}`} className="button-primary flex-1">Edit design</Link><button type="button" aria-label={`Delete ${design.title}`} className="grid h-11 w-11 place-items-center rounded-full border border-black/10 text-red-700" onClick={()=>void deleteDesign(design.id)}><Trash2 className="h-4 w-4"/></button></div></div>)}</div>:<EmptyState title="No saved designs" description="Save a design in the customisation studio and continue it here later." action={<Link to="/customise" className="button-primary">Start designing</Link>}/>}</div> : null}

            {activeTab === "security" ? (
              <div className="rounded-2xl bg-white p-6 shadow-card sm:p-8">
                <SectionIntro title={user.hasPassword ? "Change Password" : "Set Password"} description={user.hasPassword ? "Use your current password to securely replace it. Other customer sessions will be signed out." : "Add an email-and-password sign-in method after verifying access to your Google account email."} />
                {user.hasPassword ? <form onSubmit={submitPassword} className="grid max-w-xl gap-5"><InputField label="Current password" type="password" register={securityForm.register("currentPassword")} error={securityForm.formState.errors.currentPassword}/><InputField label="New password" type="password" register={securityForm.register("newPassword")} error={securityForm.formState.errors.newPassword}/><InputField label="Confirm new password" type="password" register={securityForm.register("confirmPassword")} error={securityForm.formState.errors.confirmPassword}/><div className="flex items-center gap-2 text-sm text-brand-muted"><ShieldCheck className="h-4 w-4 text-brand-cyan-dark"/>Use at least 8 characters with a letter and number.</div><button type="submit" className="button-primary justify-self-start">Change password</button></form> : <div className="max-w-xl"><div className="flex items-start gap-3 rounded-2xl bg-brand-soft p-5"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-cyan-dark"/><p className="text-sm leading-6 text-brand-muted">We’ll email a single-use link to <strong className="text-brand-black">{user.email}</strong>. The link expires after 30 minutes and your password is never sent by email.</p></div><button type="button" disabled={settingPassword} className="button-primary mt-5 disabled:cursor-not-allowed disabled:opacity-60" onClick={() => void requestSetPassword()}>{settingPassword ? "Sending verification…" : "Email secure setup link"}</button>{developmentSetPasswordUrl ? <a href={developmentSetPasswordUrl} className="mt-4 block text-sm font-semibold text-brand-cyan-dark underline">Open development setup link</a> : null}</div>}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </>
  );
}

export function TrackOrderPage() {
  const orders = useAppStore((state) => state.orders);
  const [order, setOrder] = useState<import("../types/models").Order | undefined>(orders[0]);
  const [tracking, setTracking] = useState(false);
  const trackingForm = useForm<z.infer<typeof trackingSchema>>({
    resolver: zodResolver(trackingSchema),
    defaultValues: { orderNumber: orders[0]?.orderNumber ?? "", email: useAppStore.getState().user?.email ?? "" }
  });
  const submitTracking = trackingForm.handleSubmit(async (values) => {
    setTracking(true);
    try {
      setOrder(await storefrontService.trackOrder(values.orderNumber, values.email));
    } catch (trackingError) {
      setOrder(undefined);
      toast.error(trackingError instanceof Error ? trackingError.message : "Order could not be found.");
    } finally {
      setTracking(false);
    }
  });

  return (
    <>
      <Seo title="Track Order" description="Track a Fabpodd order using its order number and checkout email." path="/track-order" />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Track Order" }]} />
        <div className="rounded-[36px] bg-white p-8 shadow-card">
          <SectionIntro title="Track your order" description="Enter the order reference and the email used at checkout." />
          <form onSubmit={submitTracking} className="mb-8 grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <InputField label="Order number" register={trackingForm.register("orderNumber")} error={trackingForm.formState.errors.orderNumber} />
            <InputField label="Checkout email" type="email" register={trackingForm.register("email")} error={trackingForm.formState.errors.email} />
            <button type="submit" disabled={tracking} className="button-primary disabled:opacity-50">{tracking ? "Checking..." : "Track order"}</button>
          </form>
          {order ? (
            <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-[28px] bg-brand-black p-6 text-white">
                <p className="text-sm text-white/60">Order number</p>
                <h2 className="mt-2 font-heading text-3xl font-extrabold">{order.orderNumber}</h2>
                <p className="mt-4 text-sm text-white/72">Status: {order.status}</p>
                <p className="mt-2 text-sm text-white/72">Payment: {paymentMethodLabel(order.paymentMethod)}</p>
                {order.trackingNumber ? <p className="mt-2 text-sm text-white/72">Tracking number: {order.trackingNumber}</p> : null}
                <button type="button" onClick={() => downloadInvoice(order)} className="button-primary mt-5 bg-brand-yellow text-brand-black">Download invoice</button>
              </div>
              <div className="space-y-4">
                {order.trackingSteps.map((step, index) => (
                  <div key={step} className="flex gap-4 rounded-[24px] bg-brand-grey p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-black text-white">{index + 1}</div>
                    <p className="text-sm font-medium">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title="No order to track" description="Place an order first to populate the tracking interface." />
          )}
        </div>
      </div>
    </>
  );
}
