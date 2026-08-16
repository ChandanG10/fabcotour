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
    description: "Placeholder privacy policy content that must be reviewed with actual business and legal details before launch.",
    body: [
      "Placeholder only: business-specific data handling practices, retention windows, consent language and third-party processor details must be reviewed before launch."
    ]
  },
  "/terms-and-conditions": {
    title: "Terms and Conditions",
    description: "Placeholder terms and conditions to be reviewed before public launch.",
    body: [
      "Placeholder only: commercial terms, order acceptance rules, IP ownership, liability limits and jurisdiction clauses must be reviewed before launch."
    ]
  },
  "/shipping-policy": {
    title: "Shipping Policy",
    description: "Placeholder shipping policy with business-specific clauses marked for review.",
    body: ["Placeholder only: dispatch windows, carrier details, split shipment rules and exceptions must be updated before launch."]
  },
  "/return-and-refund-policy": {
    title: "Return and Refund Policy",
    description: "Placeholder refund policy clarifying that custom product logic must be legally reviewed before launch.",
    body: ["Placeholder only: customised-product exceptions, inspection workflow and refund windows must be reviewed before launch."]
  },
  "/cancellation-policy": {
    title: "Cancellation Policy",
    description: "Placeholder cancellation rules awaiting final business review.",
    body: ["Placeholder only: cut-off timings, production-stage cancellation logic and refund handling must be reviewed before launch."]
  },
  "/customised-product-policy": {
    title: "Customised Product Policy",
    description: "Placeholder policy for personalised and custom-built products.",
    body: ["Placeholder only: approval responsibilities, design ownership and remake conditions must be reviewed before launch."]
  },
  "/payment-policy": {
    title: "Payment Policy",
    description: "Placeholder payment policy awaiting actual gateway, settlement and COD business rules.",
    body: ["Placeholder only: accepted methods, failure handling, invoice rules and settlement terms must be reviewed before launch."]
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
                <ContactCard icon={<MapPin className="h-5 w-5" />} title="Address" value="Placeholder studio address, Bengaluru, India" />
              </div>
              <div className="mt-6 rounded-[28px] border border-dashed border-black/10 bg-brand-grey p-6">
                Embedded map placeholder
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
          {location.pathname !== "/about" ? (
            <div className="mt-6 flex items-start gap-3 rounded-[24px] border border-brand-yellow/40 bg-brand-yellow/10 p-5 text-sm leading-7 text-brand-black/74">
              <ShieldAlert className="mt-1 h-5 w-5 shrink-0 text-brand-black" />
              <p>Legal and commercial details on this page are placeholders and must be reviewed before launch.</p>
            </div>
          ) : null}
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
