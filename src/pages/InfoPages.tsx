import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Clock3, Mail, MapPin, Phone, ShieldAlert } from "lucide-react";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { z } from "zod";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, InputField, SectionIntro, SelectField, TextAreaField } from "../components/common/Ui";
import { faqs } from "../data/catalog";
import { siteConfig } from "../constants/site";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  department: z.string().min(1),
  message: z.string().min(10)
});

const pageContent: Record<
  string,
  {
    title: string;
    description: string;
    body?: string[];
  }
> = {
  "/about": {
    title: "About FAB COUTURE",
    description:
      "FAB COUTURE transforms ideas into wearable and giftable products. The brand serves individuals, creators, teams, events and businesses through quality apparel, thoughtful personalisation and dependable fulfilment.",
    body: [
      "Brand story: FAB COUTURE was conceived as a premium bridge between custom expression and dependable production, with equal care for a single-piece gift and a multi-city corporate drop.",
      "Mission: Turn ideas into products people actually want to wear, use and gift.",
      "Vision: Become the preferred premium custom-merchandise partner for modern Indian creators and businesses.",
      "Quality commitment: Materials, fit, print alignment and packaging are checked before dispatch.",
      "Printing capabilities: Screen printing, DTG, embroidery, heat transfer, sublimation and vinyl workflows are supported.",
      "Sustainability approach: Consolidated production runs, better-quality blanks and fewer disposable gifts are prioritised.",
      "Customer types served: Individuals, creators, college teams, startups, HR teams, agencies and enterprise gifting programs.",
      "Production-process timeline: Discovery, proofing, approval, production, quality check and dispatch."
    ]
  },
  "/privacy-policy": {
    title: "Privacy Policy",
    description: "How FAB COUTURE collects, uses, shares and protects personal information.",
    body: [
      "Effective date: 20 August 2026. We collect information you provide when creating an account, placing an order, requesting support or submitting artwork, including your name, contact details, delivery address, order information and customisation files.",
      "We use this information to fulfil orders, process payments, provide customer support, prevent fraud, comply with legal obligations and, where you have agreed, send relevant service or marketing communications.",
      "We share only the information needed with service providers such as payment gateways, Cloudinary, hosting, analytics and delivery partners. We do not sell personal information. Payment credentials are handled by the payment provider and are not stored by FAB COUTURE.",
      "Order and accounting records are retained for the period required by applicable law. Support records and uploaded artwork are retained only as long as reasonably necessary for the stated purpose, dispute handling and legitimate business records.",
      `You may request access, correction or deletion of eligible personal information, withdraw consent where applicable, or raise a grievance by writing to ${siteConfig.grievanceEmail}. We may verify your identity before processing a request.`,
      "We use reasonable technical and organisational safeguards, but no internet transmission is completely risk-free. Material policy changes will be posted here with an updated effective date."
    ]
  },
  "/terms-and-conditions": {
    title: "Terms and Conditions",
    description: "Terms governing use of the FAB COUTURE website and purchases.",
    body: [
      "By using this website or placing an order, you confirm that you are legally capable of entering a contract and that the information you provide is accurate. Product availability, pricing and offers may change before an order is accepted.",
      "An order acknowledgement is not final acceptance. Acceptance occurs when payment is confirmed or, for cash on delivery, when the order is confirmed for fulfilment. We may cancel and refund an order affected by stock, pricing, fraud-screening or delivery restrictions.",
      "Product colours may vary slightly by screen and production batch. Measurements and delivery estimates are approximate. Custom artwork proofs, spelling, placement, colour and size selections approved by the customer are treated as final subject to our customised-product policy.",
      "You retain rights in artwork you own. By uploading content, you confirm that you have permission to reproduce it and grant FAB COUTURE the limited right to use it to produce and support your order. Unlawful, infringing or abusive content may be rejected.",
      "Nothing in these terms limits rights that cannot lawfully be excluded. These terms are governed by the laws of India; courts with jurisdiction over our disclosed business location will have jurisdiction, subject to applicable consumer law."
    ]
  },
  "/shipping-policy": {
    title: "Shipping Policy",
    description: "Dispatch, delivery, tracking and damaged-shipment information.",
    body: [
      "Ready-stock orders are normally dispatched within 1–3 business days. Customised or bulk orders require artwork approval and production time; the estimated dispatch window is shown or confirmed before production.",
      "Delivery estimates begin after dispatch and depend on destination and carrier serviceability. Remote locations, holidays, weather or carrier disruption may cause delays. Multiple items may be shipped separately without additional shipping charges unless disclosed at checkout.",
      "Tracking details are added after dispatch and can be viewed from Track Order. Please provide a complete address and reachable phone number. Re-delivery or return-to-origin costs caused by an incorrect address or repeated failed delivery may be charged where permitted.",
      `Report a package that arrives visibly damaged, incomplete or incorrectly delivered to ${siteConfig.supportEmail} within 48 hours, with the order number and clear photographs.`
    ]
  },
  "/return-and-refund-policy": {
    title: "Return and Refund Policy",
    description: "Eligibility and process for returns, refunds and exchanges.",
    body: [
      "Unused, unwashed and non-customised products may be requested for return or size exchange within 7 days of delivery, with original tags and packaging. Approval is subject to inspection and availability.",
      "Customised, personalised, made-to-order and bulk products are not returnable for preference, fit, spelling or artwork choices approved by the customer. They remain eligible for review when damaged, defective, materially different from the approved design or incorrectly supplied.",
      `Contact ${siteConfig.supportEmail} with the order number, reason and photographs before sending anything back. Returns sent without authorisation may be delayed or rejected.`,
      "Approved refunds are issued to the original payment method. Bank or payment-provider processing typically takes 7–10 business days after approval. Original shipping and reverse-pickup charges may be deducted unless the item was defective or incorrectly supplied."
    ]
  },
  "/cancellation-policy": {
    title: "Cancellation Policy",
    description: "When an order can be cancelled and how refunds are handled.",
    body: [
      "A ready-stock order may be cancelled before dispatch. A customised or made-to-order product may be cancelled only before artwork approval or production begins.",
      `Submit a cancellation request promptly through ${siteConfig.supportEmail} with the order number. A request is not complete until confirmed by FAB COUTURE.`,
      "If cancellation is approved, prepaid amounts are returned to the original payment method. Once a customised order enters production, material, artwork or production costs already incurred may be non-refundable where permitted and disclosed."
    ]
  },
  "/customised-product-policy": {
    title: "Customised Product Policy",
    description: "Approval, production and remedy terms for customised products.",
    body: [
      "Review all text, spelling, colours, size, print side, placement and artwork before adding a customised product to the cart. The saved order design is the production reference unless a separate proof is issued and approved.",
      "Artwork should be clear and suitable for printing. Low-resolution images, screen-to-print colour differences, fabric texture and normal placement tolerances are not manufacturing defects. We may contact you when artwork cannot be produced reliably.",
      "You confirm that uploaded artwork does not violate copyright, trademark, privacy or other rights. FAB COUTURE may refuse content reasonably believed to be unlawful, infringing or unsafe.",
      `If the delivered product is damaged, defective or materially different from the saved design, notify ${siteConfig.supportEmail} within 48 hours with photographs. After verification, we may repair, remake, replace or refund the affected item as appropriate.`
    ]
  },
  "/payment-policy": {
    title: "Payment Policy",
    description: "Payment authorisation, failures, refunds and invoice information.",
    body: [
      "Available payment methods are displayed at checkout. Online payments are processed by the named payment provider; FAB COUTURE does not store complete card, UPI PIN or banking credentials.",
      "An order is treated as paid only after successful provider verification. If your account is debited but the order remains unpaid, wait for provider reconciliation and contact support with the order reference and transaction reference.",
      "Duplicate or failed-payment credits are returned through the original payment method after verification. Refund timing depends on the bank or provider.",
      "An invoice is made available with the order after confirmation. Tax particulars depend on the seller's applicable registration and the information supplied at checkout."
    ]
  }
};

export default function InfoPage() {
  const location = useLocation();
  const form = useForm<z.infer<typeof contactSchema>>({
    resolver: zodResolver(contactSchema)
  });
  const content = useMemo(() => pageContent[location.pathname], [location.pathname]);

  const submitContact = form.handleSubmit(() => {
    toast.success("Contact enquiry submitted");
    form.reset();
  });

  if (location.pathname === "/contact") {
    return (
      <>
        <Seo title="Contact" description="Contact FAB COUTURE for orders, customisation, corporate enquiries and support." path="/contact" />
        <div className="container-shell py-8 pb-28">
          <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Contact" }]} />
          <section className="grid gap-8 rounded-[36px] bg-white p-8 shadow-card lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <SectionIntro
                eyebrow="Contact"
                title="Reach the right team"
                description="Customer care, corporate gifting, bulk orders and custom design support all route through one polished enquiry experience."
              />
              <div className="grid gap-4">
                <ContactCard icon={<Phone className="h-5 w-5" />} title="Phone" value={siteConfig.supportPhone} />
                <ContactCard icon={<Mail className="h-5 w-5" />} title="Email" value={siteConfig.supportEmail} />
                <ContactCard icon={<Clock3 className="h-5 w-5" />} title="Business hours" value={siteConfig.businessHours} />
                <ContactCard icon={<MapPin className="h-5 w-5" />} title="Address" value={siteConfig.businessAddress} />
                <ContactCard icon={<ShieldAlert className="h-5 w-5" />} title="Grievance officer" value={`${siteConfig.grievanceOfficer} · ${siteConfig.grievanceEmail}`} />
              </div>
            </div>
            <div>
              <form onSubmit={submitContact} className="grid gap-5">
                <InputField label="Name" register={form.register("name")} error={form.formState.errors.name} />
                <InputField label="Email" type="email" register={form.register("email")} error={form.formState.errors.email} />
                <InputField label="Phone" register={form.register("phone")} error={form.formState.errors.phone} />
                <SelectField label="Department" register={form.register("department")} error={form.formState.errors.department} options={["Customer support", "Corporate gifting", "Bulk orders", "Custom design assistance"]} />
                <TextAreaField label="Message" register={form.register("message")} error={form.formState.errors.message} rows={6} />
                <button type="submit" className="button-primary">Send enquiry</button>
              </form>
              <div className="mt-8 rounded-[28px] bg-brand-black p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">FAQ shortcuts</p>
                <div className="mt-4 space-y-3">
                  {faqs.map((faq) => (
                    <div key={faq.question} className="rounded-[22px] bg-white/8 px-4 py-4 text-sm">
                      <p className="font-semibold">{faq.question}</p>
                      <p className="mt-2 text-white/72">{faq.answer}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </>
    );
  }

  if (!content) {
    return (
      <>
        <Seo title="Page Not Found" description="The requested route does not exist in the FAB COUTURE frontend." />
        <div className="container-shell py-20 pb-28">
          <div className="rounded-[36px] bg-white p-8 shadow-card">
            <SectionIntro eyebrow="404" title="Page not found" description="This route is not defined in the current frontend scaffold." />
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Seo title={content.title} description={content.description} path={location.pathname} />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: content.title }]} />
        <article className="rounded-[36px] bg-white p-8 shadow-card">
          <SectionIntro eyebrow={location.pathname === "/about" ? "About" : "Policy"} title={content.title} description={content.description} />
          <div className="grid gap-4">
            {content.body?.map((paragraph) => (
              <div key={paragraph} className="rounded-[24px] bg-brand-grey p-5 text-sm leading-8 text-brand-black/72">
                {paragraph}
              </div>
            ))}
          </div>
        </article>
      </div>
    </>
  );
}

function ContactCard({ icon, title, value }: { icon: ReactNode; title: string; value: string }) {
  return (
    <div className="rounded-[24px] bg-brand-grey p-5">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white">{icon}</div>
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-sm text-brand-black/65">{value}</p>
        </div>
      </div>
    </div>
  );
}
