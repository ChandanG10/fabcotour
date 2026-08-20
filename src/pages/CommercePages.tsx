import { zodResolver } from "@hookform/resolvers/zod";
import { MapPin, PackageCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { AssetImage, defaultProductAssetPath } from "../components/common/AssetImage";
import { BrandLogo } from "../components/common/BrandLogo";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, EmptyState, InputField, LoadingState, SectionIntro, SelectField, SuccessInline, TextAreaField } from "../components/common/Ui";
import { coupons } from "../constants/site";
import { mockUser } from "../data/catalog";
import { useAsyncData } from "../hooks/useAsyncData";
import { calculateCustomizationCharge } from "../lib/pricing";
import { storefrontService } from "../services/api";
import { useAppStore } from "../store/useAppStore";
import { currencyFormatter } from "../utils/format";

const authSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  phone: z.string().min(10).optional(),
  password: z.string().min(6)
});

const forgotSchema = z.object({
  email: z.string().email()
});

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

const reviewSchema = z.object({
  title: z.string().min(3),
  rating: z.string().min(1),
  comment: z.string().min(15)
});

function useStoreProducts() {
  return useAsyncData(() => storefrontService.getNormalizedProducts(), []);
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
    <style>body{font-family:Arial,sans-serif;max-width:760px;margin:40px auto;color:#111}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:24px 0}th,td{padding:10px;border-bottom:1px solid #ddd;text-align:left}.total{font-size:20px;font-weight:700}</style></head>
    <body><h1>FAB COUTURE</h1><p>Invoice ${order.invoiceNumber ?? order.orderNumber}</p><p>Order ${order.orderNumber} · ${new Date(order.createdAt).toLocaleDateString("en-IN")}</p>
    <p>Deliver to: ${escapeInvoiceText(order.address.recipient)}, ${escapeInvoiceText(order.address.line1)}, ${escapeInvoiceText(order.address.city)}, ${escapeInvoiceText(order.address.state)} ${escapeInvoiceText(order.address.pinCode)}</p>
    <table><thead><tr><th>Product reference</th><th>Quantity</th><th>Amount</th></tr></thead><tbody>${lines}</tbody></table>
    <p>Subtotal: ${currencyFormatter.format(order.subtotal)}</p><p>Shipping: ${currencyFormatter.format(order.shipping)}</p><p>Discount: ${currencyFormatter.format(order.discount)}</p>
    <p class="total">Total: ${currencyFormatter.format(order.total)}</p><p>Payment: ${order.paymentMethod} (${order.paymentStatus ?? "Pending"})</p></body></html>`;
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

  const subtotal = checkoutRows.reduce((sum, row) =>
    sum + (row.product?.price ?? 0) * row.item.quantity + calculateCustomizationCharge(row.item.customization), 0);
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
                row.product ? (
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
                      if (applyCoupon(couponCode)) {
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
  const user = useAppStore((state) => state.user) ?? mockUser;
  const cart = useAppStore((state) => state.cart);
  const completeOrder = useAppStore((state) => state.completeOrder);
  const addAddress = useAppStore((state) => state.addAddress);
  const checkoutItems = cart.filter((item) => !item.savedForLater);
  const [step, setStep] = useState(1);
  const [selectedPayment] = useState<"Cash on delivery">("Cash on delivery");
  const [selectedAddress, setSelectedAddress] = useState(user.addresses[0]?.id ?? "");
  const [orderNumber, setOrderNumber] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);

  const form = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: user.addresses[0]
  });

  const subtotal = checkoutItems.reduce((sum, item) => {
    const product = productList.find((entry) => entry.id === item.productId);
    return sum + (product?.price ?? 0) * item.quantity + calculateCustomizationCharge(item.customization);
  }, 0);

  if (loading) {
    return <div className="container-shell py-20"><LoadingState label="Loading checkout" /></div>;
  }

  if (error || !products) {
    return <div className="container-shell py-20"><EmptyState title="Checkout unavailable" description={error ?? "Products could not be loaded for checkout."} /></div>;
  }

  const submitAddress = form.handleSubmit((values) => {
    const id = `address-${Date.now()}`;
    addAddress({ ...values, id, label: "New address" });
    setSelectedAddress(id);
    setStep(3);
  });

  const activeAddress = user.addresses.find((address) => address.id === selectedAddress) ?? user.addresses[0];

  const submitOrder = async () => {
    if (!activeAddress || checkoutItems.length === 0) {
      toast.error("Add an item and delivery address before placing the order.");
      return;
    }
    setPlacingOrder(true);
    try {
      const order = await storefrontService.createOrder({
        customer: { name: user.name, email: user.email, phone: activeAddress.phone },
        address: activeAddress,
        paymentMethod: selectedPayment,
        couponCode: useAppStore.getState().activeCoupon,
        items: checkoutItems.map((item) => ({
          productId: item.productId,
          variantId: item.variantId === item.productId ? undefined : item.variantId,
          selectedColor: item.selectedColor ?? item.customization?.productColor,
          selectedSize: item.selectedSize ?? item.customization?.size,
          quantity: item.quantity,
          customization: item.customization
        }))
      });
      completeOrder(order);
      setOrderNumber(order.orderNumber);
      setStep(6);
    } catch (orderError) {
      toast.error(orderError instanceof Error ? orderError.message : "The order could not be placed.");
    } finally {
      setPlacingOrder(false);
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
                  return product ? (
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
                  <div className="rounded-[24px] border border-brand-black bg-brand-grey px-4 py-4 text-left">
                    Cash on delivery
                  </div>
                </div>
                <p className="text-sm leading-7 text-brand-black/60">Online payment methods will appear only after the production payment gateway and webhook verification are configured.</p>
                <button
                  type="button"
                  className="button-primary"
                  disabled={placingOrder}
                  onClick={() => void submitOrder()}
                >
                  {placingOrder ? "Placing order..." : "Place order"}
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
              <div className="flex justify-between"><span>Payment method</span><span>{selectedPayment}</span></div>
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

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const login = useAppStore((state) => state.login);
  const form = useForm<z.infer<typeof authSchema>>({
    resolver: zodResolver(authSchema),
    defaultValues: { email: mockUser.email, password: "password123", name: mockUser.name, phone: mockUser.phone }
  });
  const forgotForm = useForm<z.infer<typeof forgotSchema>>({
    resolver: zodResolver(forgotSchema)
  });

  const submitAuth = form.handleSubmit((values) => {
    login({ email: values.email, name: values.name ?? "Guest User", phone: values.phone ?? mockUser.phone });
    toast.success(mode === "signup" ? "Account created" : "Signed in");
  });

  const submitForgot = forgotForm.handleSubmit(() => {
    toast.success("Password reset link sent");
    forgotForm.reset();
  });

  return (
    <>
      <Seo title="Login" description="Customer login, signup and forgot-password flows with validation." path="/login" />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Login" }]} />
        <div className="grid gap-8 rounded-[36px] bg-white p-8 shadow-card lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[32px] bg-brand-black p-8 text-white">
            <div className="inline-flex rounded-[22px] bg-white px-4 py-3">
              <BrandLogo className="h-12 w-[198px]" />
            </div>
            <h1 className="mt-6 font-heading text-4xl font-extrabold">Sign in to manage orders, wishlist and custom designs.</h1>
            <p className="mt-4 text-base leading-8 text-white/72">
              The auth layer is mocked for frontend behaviour and can be swapped for a real backend later.
            </p>
          </div>
          <div>
            <div className="flex gap-3">
              {["login", "signup", "forgot"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setMode(value as typeof mode)}
                  className={`rounded-full px-4 py-3 text-sm font-semibold ${mode === value ? "bg-brand-black text-white" : "bg-brand-grey text-brand-black"}`}
                >
                  {value}
                </button>
              ))}
            </div>
            {mode !== "forgot" ? (
              <form onSubmit={submitAuth} className="mt-6 grid gap-5">
                {mode === "signup" ? <InputField label="Name" register={form.register("name")} error={form.formState.errors.name} /> : null}
                <InputField label="Email" type="email" register={form.register("email")} error={form.formState.errors.email} />
                {mode === "signup" ? <InputField label="Phone" register={form.register("phone")} error={form.formState.errors.phone} /> : null}
                <InputField label="Password" type="password" register={form.register("password")} error={form.formState.errors.password} />
                <button type="submit" className="button-primary">{mode === "signup" ? "Create account" : "Login"}</button>
              </form>
            ) : (
              <form onSubmit={submitForgot} className="mt-6 grid gap-5">
                <InputField label="Email" type="email" register={forgotForm.register("email")} error={forgotForm.formState.errors.email} />
                <button type="submit" className="button-primary">Send reset link</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function AccountPage() {
  const location = useLocation();
  const { data: products, loading } = useStoreProducts();
  const productList = products ?? [];
  const user = useAppStore((state) => state.user) ?? mockUser;
  const wishlist = useAppStore((state) => state.wishlist);
  const orders = useAppStore((state) => state.orders);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);
  const reviewForm = useForm<z.infer<typeof reviewSchema>>({
    resolver: zodResolver(reviewSchema)
  });
  const activeTab = location.hash.replace("#", "") || "profile";
  const wishedProducts = productList.length
    ? wishlist.map((item) => productList.find((product) => product.id === item.productId)).filter(Boolean)
    : [];

  const submitReview = reviewForm.handleSubmit(() => {
    setReviewSubmitted(true);
    reviewForm.reset();
  });

  return (
    <>
      <Seo title="My Account" description="Profile, addresses, wishlist, order history, returns and review submission in one account area." path="/account" />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Account" }]} />
        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-[28px] bg-white p-5 shadow-card">
            <nav className="space-y-2 text-sm font-semibold">
              {["profile", "addresses", "wishlist", "orders", "reviews"].map((tab) => (
                <Link key={tab} to={`/account#${tab}`} className={`block rounded-2xl px-4 py-3 ${activeTab === tab ? "bg-brand-black text-white" : "bg-brand-grey"}`}>
                  {tab}
                </Link>
              ))}
            </nav>
          </aside>

          <section className="space-y-6">
            {activeTab === "profile" ? (
              <div className="rounded-[32px] bg-white p-6 shadow-card">
                <SectionIntro title="Profile" description="Customer signup, profile management and account details are stored in the app state." />
                <div className="flex flex-col gap-4 md:flex-row md:items-center">
                  <img src={user.avatar} alt={user.name} className="h-20 w-20 rounded-full object-cover" />
                  <div>
                    <h2 className="font-heading text-3xl font-bold">{user.name}</h2>
                    <p className="text-sm text-brand-black/60">{user.email}</p>
                    <p className="text-sm text-brand-black/60">{user.phone}</p>
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "addresses" ? (
              <div className="rounded-[32px] bg-white p-6 shadow-card">
                <SectionIntro title="Address management" description="Multiple delivery addresses can be stored and used during checkout." />
                <div className="grid gap-4 md:grid-cols-2">
                  {user.addresses.map((address) => (
                    <div key={address.id} className="rounded-[24px] bg-brand-grey p-5">
                      <div className="flex items-center gap-2 font-semibold"><MapPin className="h-4 w-4" /> {address.label}</div>
                      <p className="mt-3 text-sm text-brand-black/68">{address.recipient}, {address.line1}</p>
                      <p className="text-sm text-brand-black/68">{address.city}, {address.state} {address.pinCode}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "wishlist" ? (
              <div className="rounded-[32px] bg-white p-6 shadow-card">
                <SectionIntro title="Wishlist" description="Saved products can be reopened from here or moved into the bag." />
                {loading ? <LoadingState label="Loading wishlist" /> : <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {wishedProducts.map((product) =>
                    product ? (
                      <div key={product.id} className="rounded-[24px] bg-brand-grey p-4">
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
                      </div>
                    ) : null
                  )}
                </div>}
              </div>
            ) : null}

            {activeTab === "orders" ? (
              <div className="rounded-[32px] bg-white p-6 shadow-card">
                <SectionIntro title="Order history" description="Order detail, tracking, cancellation and returns are represented through mock order state." />
                <div className="space-y-4">
                  {orders.map((order) => (
                    <div key={order.id} className="rounded-[24px] bg-brand-grey p-5">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-semibold">{order.orderNumber}</p>
                          <p className="text-sm text-brand-black/60">{order.createdAt} • {order.status}</p>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Link to="/track-order" className="button-secondary">Track order</Link>
                          <button type="button" className="button-secondary" onClick={() => downloadInvoice(order)}>Download invoice</button>
                          <button type="button" className="button-secondary">Cancel request</button>
                          <button type="button" className="button-secondary">Return request</button>
                        </div>
                      </div>
                      <div className="mt-4 text-sm text-brand-black/65">Total {currencyFormatter.format(order.total)} • {order.items.length} items</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {activeTab === "reviews" ? (
              <div className="rounded-[32px] bg-white p-6 shadow-card">
                <SectionIntro title="Review submission" description="A validated front-end review form prepared for future API submission and media upload support." />
                <form onSubmit={submitReview} className="grid gap-5">
                  <InputField label="Review title" register={reviewForm.register("title")} error={reviewForm.formState.errors.title} />
                  <SelectField label="Rating" register={reviewForm.register("rating")} error={reviewForm.formState.errors.rating} options={["5", "4", "3", "2", "1"]} />
                  <TextAreaField label="Review comment" register={reviewForm.register("comment")} error={reviewForm.formState.errors.comment} rows={5} />
                  {reviewSubmitted ? <SuccessInline label="Review submitted. Media upload wiring can be added when the backend contract is ready." /> : null}
                  <button type="submit" className="button-primary">
                    <PackageCheck className="mr-2 h-4 w-4" />
                    Submit review
                  </button>
                </form>
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
      <Seo title="Track Order" description="Track a FAB COUTURE order using its order number and checkout email." path="/track-order" />
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
                <p className="mt-2 text-sm text-white/72">Payment: {order.paymentMethod}</p>
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
