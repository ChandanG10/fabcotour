import type { ReactNode } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, BriefcaseBusiness, FileCheck2, Gift, Handshake, PackageOpen, PhoneCall, Truck } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { Seo } from "../components/common/Seo";
import { Breadcrumbs, InputField, SectionIntro, SelectField, SuccessInline, TextAreaField } from "../components/common/Ui";
import { siteConfig } from "../constants/site";

const corporateSchema = z.object({
  companyName: z.string().min(2),
  contactPerson: z.string().min(2),
  workEmail: z.string().email(),
  phoneNumber: z.string().min(10),
  requiredProducts: z.string().min(2),
  estimatedQuantity: z.string().min(1),
  budgetRange: z.string().min(1),
  eventDate: z.string().min(1),
  deliveryCity: z.string().min(2),
  customisationRequirements: z.string().min(10),
  message: z.string().min(10),
  consent: z.literal(true, { errorMap: () => ({ message: "Consent is required." }) })
});

const bulkSchema = z.object({
  name: z.string().min(2),
  company: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(10),
  quantity: z.string().min(1),
  products: z.string().min(2),
  designSupport: z.string().min(1),
  timeline: z.string().min(1),
  message: z.string().min(10)
});

const sellerSchema = z.object({
  brandName: z.string().min(2),
  applicantName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(8),
  city: z.string().min(2),
  state: z.string().min(2),
  pinCode: z.string().min(6),
  website: z.string().url().or(z.literal("")),
  productsOfInterest: z.string().min(2),
  businessDescription: z.string().min(20)
});

export function CorporatePage() {
  const form = useForm<z.infer<typeof corporateSchema>>({
    resolver: zodResolver(corporateSchema),
    defaultValues: { consent: true }
  });

  const onSubmit = form.handleSubmit(() => {
    toast.success("Corporate enquiry submitted");
    form.reset({ consent: true });
  });

  return (
    <>
      <Seo
        title="Corporate Gifting"
        description="Explore premium corporate gift categories, use cases and a validated enquiry workflow for branded gifting programs."
        path="/corporate-gifting"
      />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Corporate Gifting" }]} />
        <section className="grid gap-8 rounded-[36px] bg-brand-black p-8 text-white lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/55">Corporate gifting</p>
            <h1 className="mt-4 font-heading text-5xl font-extrabold">Make Every Business Gift Feel Personal.</h1>
            <p className="mt-5 max-w-xl text-base leading-8 text-white/72">
              From employee onboarding to festive celebrations, create memorable branded gifts backed by reliable production and delivery.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <button type="button" className="button-primary bg-brand-yellow text-brand-black hover:bg-brand-yellow/90">
                Get Corporate Catalogue
              </button>
              <a href="#quote-form" className="button-secondary border-white/20 bg-white/5 text-white">
                Request Custom Quote
              </a>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {["Apparel", "Drinkware", "Bags", "Office essentials", "Technology accessories", "Wellness gifts", "Eco-friendly gifts", "Premium gift boxes"].map((item) => (
              <div key={item} className="rounded-[24px] bg-white/6 px-4 py-4 text-sm">{item}</div>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-2">
          <div className="rounded-[32px] bg-white p-8 shadow-card">
            <SectionIntro
              eyebrow="Use cases"
              title="Built for recurring business moments"
              description="Gift programs, recognition initiatives, channel incentives and launches all need different product logic, packaging and delivery patterns."
            />
            <div className="grid gap-3 sm:grid-cols-2">
              {["Employee onboarding", "Employee recognition", "Client gifting", "Channel-partner gifting", "Conferences and events", "Festival campaigns", "Product launches", "Team celebrations"].map((item) => (
                <div key={item} className="rounded-[22px] bg-brand-grey px-4 py-4 text-sm font-medium">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] bg-white p-8 shadow-card">
            <SectionIntro
              eyebrow="How corporate orders work"
              title="A structured approval path"
              description="The workflow keeps large or multi-address orders organised from requirements through proofing and dispatch."
            />
            <div className="space-y-4">
              {[
                "Share your requirement",
                "Receive curated product suggestions",
                "Approve artwork and digital proof",
                "Production and quality checking",
                "Delivery to one or multiple addresses"
              ].map((item, index) => (
                <div key={item} className="flex gap-4 rounded-[22px] bg-brand-grey p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-yellow font-bold text-brand-black">
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-semibold">{item}</p>
                    <p className="mt-1 text-sm leading-7 text-brand-black/65">A premium operational flow designed for approvals, brand consistency and reliable fulfilment.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-14 grid gap-5 lg:grid-cols-5">
          <FeatureTile icon={<Gift className="h-5 w-5" />} label="Logo printing and embroidery" />
          <FeatureTile icon={<PackageOpen className="h-5 w-5" />} label="Custom packaging" />
          <FeatureTile icon={<Handshake className="h-5 w-5" />} label="Dedicated account manager" />
          <FeatureTile icon={<Truck className="h-5 w-5" />} label="Multiple-address delivery" />
          <FeatureTile icon={<FileCheck2 className="h-5 w-5" />} label="Digital artwork approval" />
        </section>

        <section id="quote-form" className="mt-14 rounded-[36px] bg-white p-8 shadow-card">
          <SectionIntro
            eyebrow="Corporate enquiry form"
            title="Tell us what needs to be produced"
            description="Every field is validated so the eventual backend contract is already mapped cleanly."
          />
          <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
            <InputField label="Company name" register={form.register("companyName")} error={form.formState.errors.companyName} />
            <InputField label="Contact person" register={form.register("contactPerson")} error={form.formState.errors.contactPerson} />
            <InputField label="Work email" type="email" register={form.register("workEmail")} error={form.formState.errors.workEmail} />
            <InputField label="Phone number" register={form.register("phoneNumber")} error={form.formState.errors.phoneNumber} />
            <InputField label="Required products" register={form.register("requiredProducts")} error={form.formState.errors.requiredProducts} />
            <InputField label="Estimated quantity" register={form.register("estimatedQuantity")} error={form.formState.errors.estimatedQuantity} />
            <SelectField label="Budget range" register={form.register("budgetRange")} error={form.formState.errors.budgetRange} options={["Rs. 10,000 - 25,000", "Rs. 25,000 - 50,000", "Rs. 50,000 - 1,00,000", "Rs. 1,00,000+"]} />
            <InputField label="Event or delivery date" type="date" register={form.register("eventDate")} error={form.formState.errors.eventDate} />
            <InputField label="Delivery city" register={form.register("deliveryCity")} error={form.formState.errors.deliveryCity} />
            <InputField label="Upload logo or brief" register={form.register("customisationRequirements")} error={form.formState.errors.customisationRequirements} placeholder="Describe branding, packaging or recipient requirements" />
            <div className="md:col-span-2">
              <TextAreaField label="Message" register={form.register("message")} error={form.formState.errors.message} rows={5} />
            </div>
            <label className="md:col-span-2 flex items-center gap-3 rounded-[22px] bg-brand-grey px-4 py-4 text-sm">
              <input type="checkbox" {...form.register("consent")} />
              <span>I consent to FAB COUTURE contacting me about this enquiry.</span>
            </label>
            {form.formState.isSubmitSuccessful ? <div className="md:col-span-2"><SuccessInline label="Professional success state: your enquiry has been recorded and can now move into mock API handling." /></div> : null}
            <div className="md:col-span-2">
              <button type="submit" className="button-primary">Submit corporate enquiry</button>
            </div>
          </form>
        </section>
      </div>
    </>
  );
}

export function BulkOrdersPage() {
  const form = useForm<z.infer<typeof bulkSchema>>({
    resolver: zodResolver(bulkSchema)
  });

  const onSubmit = form.handleSubmit(() => {
    toast.success("Bulk enquiry submitted");
    form.reset();
  });

  return (
    <>
      <Seo
        title="Bulk Orders"
        description="Large custom apparel and merchandise orders with quantity pricing, design support and pan-India delivery planning."
        path="/bulk-orders"
      />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Bulk Orders" }]} />
        <section className="grid gap-8 rounded-[36px] bg-white p-8 shadow-card lg:grid-cols-[1fr_0.95fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-brand-black/50">Bulk orders</p>
            <h1 className="mt-4 font-heading text-5xl font-extrabold">Large runs without the usual chaos.</h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-brand-black/68">
              Quantity-based pricing, sample approval, timeline visibility and quality assurance are surfaced before anything moves to production.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Quantity-based pricing explanation",
                "Design support",
                "Sample approval",
                "Production timeline",
                "Quality assurance",
                "Pan-India delivery"
              ].map((item) => (
                <div key={item} className="rounded-[22px] bg-brand-grey px-4 py-4 text-sm font-medium">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] bg-brand-black p-6 text-white">
            <SectionIntro
              eyebrow="WhatsApp enquiry"
              title="Need a faster conversation?"
              description={`Call or message ${siteConfig.supportPhone} to align on quantity, print method and delivery dates.`}
            />
            <a
              href={`https://wa.me/${siteConfig.whatsappNumber.replace(/\D/g, "")}`}
              target="_blank"
              rel="noreferrer"
              className="button-primary mt-4 bg-brand-yellow text-brand-black hover:bg-brand-yellow/90"
            >
              <PhoneCall className="mr-2 h-4 w-4" />
              WhatsApp enquiry
            </a>
          </div>
        </section>

        <section className="mt-14 rounded-[36px] bg-white p-8 shadow-card">
          <SectionIntro
            eyebrow="Bulk enquiry form"
            title="Share the order parameters"
            description="This frontend captures the quantity, product mix and design support expectations needed for a realistic quote."
          />
          <form onSubmit={onSubmit} className="grid gap-5 md:grid-cols-2">
            <InputField label="Name" register={form.register("name")} error={form.formState.errors.name} />
            <InputField label="Company" register={form.register("company")} error={form.formState.errors.company} />
            <InputField label="Email" type="email" register={form.register("email")} error={form.formState.errors.email} />
            <InputField label="Phone" register={form.register("phone")} error={form.formState.errors.phone} />
            <InputField label="Estimated quantity" register={form.register("quantity")} error={form.formState.errors.quantity} />
            <InputField label="Required products" register={form.register("products")} error={form.formState.errors.products} />
            <SelectField label="Design support" register={form.register("designSupport")} error={form.formState.errors.designSupport} options={["Need full support", "Have artwork ready", "Need sampling first"]} />
            <SelectField label="Production timeline" register={form.register("timeline")} error={form.formState.errors.timeline} options={["Within 7 days", "Within 14 days", "Within 30 days", "Flexible"]} />
            <div className="md:col-span-2">
              <TextAreaField label="Message" register={form.register("message")} error={form.formState.errors.message} rows={5} />
            </div>
            <div className="md:col-span-2">
              <button type="submit" className="button-primary">Submit bulk enquiry</button>
            </div>
          </form>
        </section>

        <section className="mt-14 grid gap-5 lg:grid-cols-3">
          {[
            ["What is the minimum quantity for bulk pricing?", `Bulk pricing normally starts at ${siteConfig.minimumOrderQuantity} units; the final tier depends on product, print method and delivery schedule.`],
            ["Can I approve samples before the full run?", "Yes. Sampling and digital proof options are confirmed with the quote, including any sample or courier charge."],
            ["Can deliveries be split across multiple cities?", "Yes. Share the destination list with the enquiry so packing, freight and timelines can be quoted accurately."]
          ].map(([question, answer]) => (
            <div key={question} className="rounded-[28px] bg-white p-6 shadow-card">
              <h3 className="font-heading text-2xl font-bold">{question}</h3>
              <p className="mt-3 text-sm leading-7 text-brand-black/68">
                {answer}
              </p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

export function SellerPage() {
  const form = useForm<z.infer<typeof sellerSchema>>({
    resolver: zodResolver(sellerSchema)
  });

  const onSubmit = form.handleSubmit(() => {
    toast.success("Seller application submitted");
    form.reset();
  });

  return (
    <>
      <Seo
        title="Start Selling"
        description="A print-on-demand landing page for creators, businesses and new brands interested in selling custom merchandise."
        path="/start-selling"
      />
      <div className="container-shell py-8 pb-28">
        <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Start Selling" }]} />
        <section className="grid gap-8 rounded-[36px] bg-brand-black p-8 text-white lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/55">Print-on-demand</p>
            <h1 className="mt-4 font-heading text-5xl font-extrabold">Launch a merchandise brand without carrying inventory.</h1>
            <p className="mt-4 max-w-xl text-base leading-8 text-white/74">
              Upload designs, choose products, route orders into fulfilment and scale with dashboard-ready analytics concepts.
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                "Create your merchandise brand",
                "Upload designs",
                "Choose products",
                "No inventory management",
                "Order fulfilment",
                "Drop shipping",
                "Seller dashboard concept",
                "Sales and order analytics"
              ].map((item) => (
                <div key={item} className="rounded-[22px] bg-white/6 px-4 py-4 text-sm">{item}</div>
              ))}
            </div>
          </div>
          <div className="rounded-[32px] bg-white p-6 text-brand-black shadow-card">
            <SectionIntro
              eyebrow="Application form"
              title="Tell us about your brand"
              description="This is positioned as an intake flow for creators, businesses and new labels."
            />
            <form onSubmit={onSubmit} className="grid gap-4">
              <InputField label="Business/brand name" register={form.register("brandName")} error={form.formState.errors.brandName} />
              <InputField label="Applicant name" register={form.register("applicantName")} error={form.formState.errors.applicantName} />
              <InputField label="Phone" register={form.register("phone")} error={form.formState.errors.phone} />
              <InputField label="Email" type="email" register={form.register("email")} error={form.formState.errors.email} />
              <InputField label="Address" register={form.register("address")} error={form.formState.errors.address} />
              <div className="grid gap-4 md:grid-cols-3">
                <InputField label="City" register={form.register("city")} error={form.formState.errors.city} />
                <InputField label="State" register={form.register("state")} error={form.formState.errors.state} />
                <InputField label="PIN code" register={form.register("pinCode")} error={form.formState.errors.pinCode} />
              </div>
              <InputField label="Existing website/social profile" register={form.register("website")} error={form.formState.errors.website} placeholder="https://..." />
              <InputField label="Products of interest" register={form.register("productsOfInterest")} error={form.formState.errors.productsOfInterest} />
              <TextAreaField label="Business description" register={form.register("businessDescription")} error={form.formState.errors.businessDescription} rows={5} />
              <button type="submit" className="button-primary">
                <BriefcaseBusiness className="mr-2 h-4 w-4" />
                Submit application
              </button>
            </form>
          </div>
        </section>

        <section className="mt-14 grid gap-5 lg:grid-cols-4">
          {[
            "Creator-first onboarding",
            "Drop shipping support",
            "Merch fulfilment",
            "Analytics-ready storefront concept"
          ].map((item) => (
            <div key={item} className="rounded-[28px] bg-white p-6 shadow-card">
              <ArrowRight className="h-5 w-5 text-brand-yellow" />
              <p className="mt-4 text-base font-semibold">{item}</p>
            </div>
          ))}
        </section>
      </div>
    </>
  );
}

function FeatureTile({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="rounded-[28px] bg-white p-5 shadow-card">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-grey">{icon}</div>
      <p className="mt-4 text-sm font-semibold">{label}</p>
    </div>
  );
}
