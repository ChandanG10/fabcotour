import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, FileText, ShieldCheck } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Seo } from "../components/common/Seo";
import { siteConfig } from "../constants/site";

interface LegalSection {
  id: string;
  title: string;
  content: ReactNode;
}

interface LegalDocument {
  title: string;
  description: string;
  introduction: ReactNode;
  sections: LegalSection[];
}

const privacyDocument: LegalDocument = {
  title: "Privacy Policy",
  description: "Learn what personal information FabPodd collects and how it is used when you shop, customise products, sign in, or contact support.",
  introduction: (
    <>
      This Privacy Policy explains how <strong>{siteConfig.legalBusinessName}</strong>, operating the FabPodd website and services, handles personal information when you browse, create an account, customise a product, place an order, or contact us.
    </>
  ),
  sections: [
    {
      id: "information-we-collect",
      title: "Personal information we collect",
      content: (
        <>
          <p>Depending on how you use FabPodd, we may collect:</p>
          <ul>
            <li>your name, email address, mobile number, profile picture, and account credentials;</li>
            <li>delivery details such as recipient name, phone number, address, landmark, city, state, PIN code, and country;</li>
            <li>order contents, selected variants, coupon use, invoice details, payment method, payment status, and transaction references;</li>
            <li>wishlist items, saved designs, cart contents, recently viewed products, and customer-support messages; and</li>
            <li>technical information sent with a web request, such as IP address, browser or device details, and security logs maintained by our hosting or infrastructure providers.</li>
          </ul>
        </>
      )
    },
    {
      id: "google-sign-in",
      title: "Google Sign-In and authentication data",
      content: (
        <>
          <p>If you choose Continue with Google, Google sends FabPodd a signed identity token. Our server verifies its signature and claims before using the verified Google account identifier, email address, name, and profile picture to find, link, or create your FabPodd customer account.</p>
          <p>FabPodd does not receive your Google password. If a FabPodd account already uses the same verified email address, the application links the Google identity to that existing customer record rather than intentionally creating a duplicate account.</p>
        </>
      )
    },
    {
      id: "how-we-use-information",
      title: "How we use customer information",
      content: (
        <>
          <p>We use personal information to provide and secure the FabPodd service, including to:</p>
          <ul>
            <li>create and authenticate customer accounts;</li>
            <li>maintain wishlists, saved designs, saved addresses, and order history for the correct customer;</li>
            <li>calculate prices, process and fulfil orders, send service communications, and provide support;</li>
            <li>verify payments, prevent duplicate or unauthorised transactions, investigate misuse, and protect the website; and</li>
            <li>meet tax, accounting, consumer-protection, dispute-resolution, and other legal obligations.</li>
          </ul>
        </>
      )
    },
    {
      id: "orders-and-payments",
      title: "Orders, payments, and transaction information",
      content: (
        <>
          <p>FabPodd stores the information required to create and service an order, including the customer record, items, customisation selections, delivery address, amounts, discounts, payment method, and payment status.</p>
          <p>Online payments are completed through PayU’s hosted payment flow. FabPodd sends the order information required to initiate and verify that transaction and receives status and reference information from PayU. Complete card numbers, CVVs, UPI PINs, and online-banking passwords are not collected by the FabPodd application.</p>
        </>
      )
    },
    {
      id: "customisation-data",
      title: "Product customisation and uploaded designs",
      content: (
        <>
          <p>When you use the customisation studio, the browser may keep a working draft locally. If you save a design or add a customised item to an order, FabPodd may store design settings, canvas data, text, uploaded artwork, preview images or references, selected product sides, colours, sizes, and print options.</p>
          <p>We use this material to restore your design, calculate pricing, produce the requested product, review a reported defect, and support the related order. Do not upload sensitive personal information or content you are not authorised to use.</p>
        </>
      )
    },
    {
      id: "cookies-and-storage",
      title: "Cookies, local storage, and analytics",
      content: (
        <>
          <p>FabPodd uses an HTTP-only authentication cookie to keep signed-in customers authenticated. The storefront also uses browser local storage for essential shopping functions such as cart contents, custom-design drafts, recently viewed products, coupon state, and your cookie preference.</p>
          <p>As of the last-updated date, FabPodd does not activate an optional analytics provider. If analytics or advertising technologies are introduced, this policy and the consent controls must be updated before those optional technologies are enabled.</p>
        </>
      )
    },
    {
      id: "service-providers",
      title: "Third-party service providers",
      content: (
        <>
          <p>Information is shared only as needed to operate the service with providers that perform functions such as:</p>
          <ul>
            <li>Google, for the Google Sign-In option you choose to use;</li>
            <li>PayU, for hosted payment processing and payment verification;</li>
            <li>Cloudinary, for hosted image storage used by parts of the application;</li>
            <li>hosting, database, email, security, and infrastructure providers; and</li>
            <li>production, fulfilment, courier, and delivery partners that need order and delivery details.</li>
          </ul>
          <p>These providers process information under their own terms and privacy practices as well as the arrangements applicable to their work for FabPodd.</p>
        </>
      )
    },
    {
      id: "security",
      title: "Data storage and security",
      content: (
        <>
          <p>Customer and commerce records are stored in the application’s MySQL database and related hosted infrastructure. The application hashes email-account passwords, verifies Google identity tokens on the server, uses restricted customer endpoints, and places the customer session token in an HTTP-only cookie.</p>
          <p>No online service can guarantee absolute security. You should use a unique password, keep access to your email and Google account secure, and notify us promptly if you believe your FabPodd account has been misused.</p>
        </>
      )
    },
    {
      id: "retention-and-deletion",
      title: "Data retention and account deletion requests",
      content: (
        <>
          <p>We retain account and order information while it is needed to provide the service and for legitimate record-keeping, tax, accounting, fraud-prevention, dispute, and legal purposes. Saved addresses and account-linked content remain associated with the account unless deleted, made unavailable, or no longer required.</p>
          <p>The current website does not provide a self-service account-deletion control. You may request account deletion by contacting the grievance email below. We may verify your identity and may retain information that must be kept for a lawful purpose or to establish, exercise, or defend legal claims.</p>
        </>
      )
    },
    {
      id: "privacy-rights",
      title: "Your privacy choices and rights",
      content: (
        <>
          <p>Subject to applicable law and its effective dates, you may ask for access to or correction of your personal information, request deletion of eligible information, withdraw consent where processing depends on consent, or raise a grievance about our handling of your information.</p>
          <p>You can update your name, phone number, profile picture, saved addresses, wishlist, and saved designs through your account where those controls are available. For other requests, contact us using the details below. We may ask for information reasonably necessary to verify the requester and locate the relevant records.</p>
        </>
      )
    },
    {
      id: "policy-updates",
      title: "Updates to this policy",
      content: <p>We may update this policy when our services, providers, or legal obligations change. The current version and its last-updated date will be posted on this page. Material changes should be reviewed by the business owner before publication.</p>
    },
    {
      id: "contact",
      title: "Contact and grievance information",
      content: (
        <>
          <p>For privacy requests or grievances, contact <strong>{siteConfig.grievanceOfficer}</strong> at <a href={`mailto:${siteConfig.grievanceEmail}`}>{siteConfig.grievanceEmail}</a>. For general customer support, email <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> or call <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`}>{siteConfig.supportPhone}</a>.</p>
          <p>Business contact address: {siteConfig.businessAddress}.</p>
        </>
      )
    }
  ]
};

const termsDocument: LegalDocument = {
  title: "Terms & Conditions",
  description: "Read the terms that govern FabPodd customer accounts, purchases, payments, customised products, uploaded designs, delivery, and support.",
  introduction: (
    <>
      These Terms & Conditions govern your access to FabPodd and purchases from <strong>{siteConfig.legalBusinessName}</strong>. By creating an account, placing an order, or otherwise using the service, you agree to these terms and the policies linked from them.
    </>
  ),
  sections: [
    {
      id: "acceptance",
      title: "Introduction and acceptance",
      content: (
        <>
          <p>Please read these terms before using the website. If you do not agree, do not create an account or place an order. Nothing in these terms excludes a consumer right or remedy that cannot lawfully be excluded.</p>
          <p>The Privacy Policy explains how personal information is handled. The Shipping, Returns & Refunds, Cancellation, Customised Product, and Payment policies form part of the terms applicable to an order where relevant.</p>
        </>
      )
    },
    {
      id: "accounts",
      title: "Customer registration and account responsibilities",
      content: (
        <>
          <p>You must provide accurate and current account, contact, and delivery information. You are responsible for activity carried out through your account and for keeping your password, email account, Google account, and devices secure.</p>
          <p>Google Sign-In may link a verified Google identity to an existing FabPodd account that has the same verified email. Notify support promptly if you suspect unauthorised access. We may restrict access where reasonably necessary to protect customers, investigate misuse, or comply with law.</p>
        </>
      )
    },
    {
      id: "pricing-and-availability",
      title: "Product pricing and availability",
      content: (
        <>
          <p>Prices, taxes, discounts, shipping charges, product options, and stock shown on the website may change before an order is submitted. The checkout summary displays the amounts applied to that order. A product remaining visible on the website does not guarantee availability.</p>
          <p>We may contact you or cancel and refund an affected item if stock, pricing, configuration, delivery serviceability, or technical information is materially incorrect. Product colours and dimensions may appear differently because of displays, photography, fabric, and normal production variation.</p>
        </>
      )
    },
    {
      id: "orders-and-payments",
      title: "Orders and payment policies",
      content: (
        <>
          <p>Submitting an order is an offer to purchase the selected products. FabPodd may verify payment, stock, delivery information, and customisation data before accepting an order for fulfilment.</p>
          <p>The checkout currently supports PayU hosted checkout and, where offered, cash on delivery. An online order is treated as paid only after FabPodd verifies the provider’s payment status. Failed or pending payments do not create a right to dispatch. Do not submit duplicate payment attempts if a transaction is still being reconciled; contact support with the order reference.</p>
        </>
      )
    },
    {
      id: "custom-products",
      title: "Custom-printed and personalised products",
      content: (
        <>
          <p>You are responsible for reviewing the product, colour, size, quantity, print side, text, spelling, artwork, placement, and preview before submitting a customised item. The design data saved with the order is the production reference unless FabPodd separately provides a proof for approval.</p>
          <p>Screen colour, fabric texture, print method, garment construction, and normal manufacturing tolerances can affect the finished appearance. A reasonable production variation is not automatically a defect. Remedies for a damaged, defective, or materially incorrect item remain available as described below and under applicable law.</p>
        </>
      )
    },
    {
      id: "uploaded-content",
      title: "Customer-uploaded designs and intellectual property",
      content: (
        <>
          <p>You retain ownership of content you lawfully own. By uploading or submitting a design, you confirm that you have the rights and permissions needed to reproduce it and grant FabPodd a limited licence to store, reproduce, adapt for production, and use that content only as reasonably necessary to provide, fulfil, support, and document the requested service.</p>
          <p>You must not submit unlawful, infringing, defamatory, hateful, deceptive, privacy-invasive, or otherwise harmful content. FabPodd may decline or stop production of content it reasonably believes cannot lawfully or safely be produced. You are responsible for claims arising from content you supplied where permitted by law.</p>
        </>
      )
    },
    {
      id: "production",
      title: "Production timelines",
      content: (
        <>
          <p>Customised and made-to-order products require production after valid order information, payment where applicable, and any requested artwork approval are complete. Any production or dispatch estimate shown at checkout or communicated by support is an estimate, not a guaranteed deadline, unless FabPodd expressly agrees otherwise in writing.</p>
          <p>Production may pause if artwork, stock, sizing, address, payment, or customer approval requires clarification. Business and bulk orders may follow a separately agreed schedule.</p>
        </>
      )
    },
    {
      id: "shipping",
      title: "Shipping and delivery",
      content: (
        <>
          <p>Available shipping methods, charges, and estimates are shown or communicated for the order. Delivery depends on the address, serviceability, production completion, and carrier operations. Tracking information is provided when available.</p>
          <p>You are responsible for providing a complete deliverable address and reachable phone number. Contact support promptly if the delivery information is wrong. Risk and responsibility for the goods pass as provided by applicable law and the confirmed delivery arrangement.</p>
        </>
      )
    },
    {
      id: "cancellations-and-returns",
      title: "Cancellations, returns, refunds, and exchanges",
      content: (
        <>
          <p>Eligibility depends on the product type, production status, condition, reason for the request, and applicable consumer law. Personalised and made-to-order goods may not be eligible for a preference-based return or exchange after production has begun, but this does not remove remedies for goods that are damaged, defective, incorrectly supplied, or materially different from the accepted order.</p>
          <p>Review the current <Link to="/cancellation-policy">Cancellation Policy</Link> and <Link to="/return-and-refund-policy">Return & Refund Policy</Link>, and contact support before sending an item back. Approved online-payment refunds are initiated to the original payment route where practicable; processing time after initiation depends on the payment provider or bank.</p>
        </>
      )
    },
    {
      id: "damaged-products",
      title: "Damaged, defective, or incorrect products",
      content: (
        <>
          <p>Contact support as soon as reasonably possible after delivery with the order number, a description of the issue, and clear photographs where relevant. Keep the product and packaging until the review is complete.</p>
          <p>After verification, the appropriate remedy may include repair, remake, replacement, refund, or another remedy required by law. FabPodd may request additional evidence or collection of the item where reasonably necessary to assess the claim.</p>
        </>
      )
    },
    {
      id: "fabpodd-ip",
      title: "FabPodd intellectual property",
      content: (
        <p>The FabPodd name, logo, website design, software, product photography, catalog content, and other materials supplied by FabPodd are protected by applicable intellectual-property laws. Except for ordinary personal use of the service, you may not copy, scrape, modify, distribute, or commercially exploit them without permission.</p>
      )
    },
    {
      id: "liability",
      title: "Limitation of liability",
      content: (
        <>
          <p>To the extent permitted by law, FabPodd is not responsible for indirect or consequential loss that was not reasonably foreseeable when the order was accepted, or for delay or failure caused by events outside reasonable control. FabPodd remains responsible where liability cannot lawfully be limited, including applicable consumer remedies.</p>
          <p>You are responsible for checking that submitted artwork, personalisation, quantities, sizes, and delivery information are correct. Any financial limitation or exclusion must be interpreted subject to mandatory Indian law.</p>
        </>
      )
    },
    {
      id: "law-and-disputes",
      title: "Applicable Indian law and disputes",
      content: (
        <>
          <p>These terms are governed by the laws of India. Subject to mandatory consumer-protection law and any forum you are legally entitled to use, disputes are subject to {siteConfig.legalJurisdiction}.</p>
          <p>Please contact support or the grievance contact first so the issue can be reviewed. Nothing in this section prevents either party from seeking urgent relief or using a statutory consumer-dispute process.</p>
        </>
      )
    },
    {
      id: "changes",
      title: "Changes to these terms",
      content: <p>We may update these terms for future use of the service. The version displayed when an order is placed applies to that order unless a change is required by law or separately agreed. The current last-updated date appears below.</p>
    },
    {
      id: "contact",
      title: "Contact and support",
      content: (
        <>
          <p>Email <a href={`mailto:${siteConfig.supportEmail}`}>{siteConfig.supportEmail}</a> or call <a href={`tel:${siteConfig.supportPhone.replace(/\s/g, "")}`}>{siteConfig.supportPhone}</a> during {siteConfig.businessHours.toLowerCase()}.</p>
          <p>Grievance contact: {siteConfig.grievanceOfficer}, <a href={`mailto:${siteConfig.grievanceEmail}`}>{siteConfig.grievanceEmail}</a>. Business contact address: {siteConfig.businessAddress}.</p>
        </>
      )
    }
  ]
};

export default function LegalPage() {
  const { pathname } = useLocation();
  const isPrivacy = pathname === "/privacy-policy";
  const document = isPrivacy ? privacyDocument : termsDocument;

  return (
    <>
      <Seo title={document.title} description={document.description} path={pathname} />
      <main className="pb-[calc(8rem+env(safe-area-inset-bottom))] md:pb-24">
        <header className="bg-brand-black text-white">
          <div className="container-shell grid gap-8 py-12 md:py-16 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-end lg:py-20">
            <div className="max-w-4xl">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-cyan text-brand-black">
                {isPrivacy ? <ShieldCheck className="h-6 w-6" aria-hidden="true" /> : <FileText className="h-6 w-6" aria-hidden="true" />}
              </div>
              <h1 className="mt-7 text-balance font-heading text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl lg:text-6xl">{document.title}</h1>
              <p className="mt-5 max-w-[70ch] text-base leading-8 text-white/75 sm:text-lg">{document.introduction}</p>
            </div>
            <dl className="grid grid-cols-2 gap-4 border-t border-white/15 pt-6 text-sm lg:grid-cols-1 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <div>
                <dt className="text-white/55">Last updated</dt>
                <dd className="mt-1 font-semibold text-white">{siteConfig.legalLastUpdated}</dd>
              </div>
              <div>
                <dt className="text-white/55">Applies to</dt>
                <dd className="mt-1 font-semibold text-white">fabpodd.com and customer services</dd>
              </div>
            </dl>
          </div>
        </header>

        <div className="container-shell py-8 sm:py-12">
          {!siteConfig.legalContentApproved ? <OwnerReviewNotice /> : null}

          <div className="grid items-start gap-10 lg:grid-cols-[280px_minmax(0,760px)] lg:justify-center xl:gap-16">
            <aside className="lg:sticky lg:top-[calc(var(--total-header-height)+2rem)]">
              <nav aria-label={`${document.title} table of contents`} className="rounded-2xl bg-white p-5 shadow-card">
                <h2 className="font-heading text-lg font-extrabold">On this page</h2>
                <ol className="mt-4 grid gap-1">
                  {document.sections.map((section) => (
                    <li key={section.id}>
                      <a className="block rounded-lg px-3 py-2 text-sm leading-5 text-brand-muted transition hover:bg-brand-cyan/10 hover:text-brand-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-cyan" href={`#${section.id}`}>
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ol>
              </nav>
            </aside>

            <article aria-label={document.title} className="min-w-0">
              {document.sections.map((section, index) => (
                <section id={section.id} key={section.id} className="scroll-mt-[calc(var(--total-header-height)+2rem)] border-b border-brand-black/10 py-9 first:pt-0 sm:py-11">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-brand-cyan-dark" aria-hidden="true" />
                    <div className="min-w-0">
                      <h2 className="text-balance font-heading text-2xl font-extrabold tracking-[-0.02em] sm:text-3xl">{section.title}</h2>
                      <div className="legal-copy mt-5 max-w-[72ch] text-base leading-8 text-brand-charcoal/80">{section.content}</div>
                    </div>
                  </div>
                  {index === document.sections.length - 1 ? (
                    <p className="mt-8 pl-9 text-sm font-semibold text-brand-muted">Last updated: {siteConfig.legalLastUpdated}</p>
                  ) : null}
                </section>
              ))}
            </article>
          </div>
        </div>
      </main>
    </>
  );
}

function OwnerReviewNotice() {
  return (
    <section aria-labelledby="owner-review-title" className="mb-10 rounded-2xl bg-[#FFF4F8] p-5 text-brand-black sm:p-6">
      <div className="flex items-start gap-4">
        <AlertTriangle className="mt-0.5 h-6 w-6 shrink-0 text-brand-pinkdark" aria-hidden="true" />
        <div>
          <h2 id="owner-review-title" className="font-heading text-lg font-extrabold">Owner approval required before publication</h2>
          <p className="mt-2 max-w-[90ch] text-sm leading-6 text-brand-charcoal/75">Confirm the legal business name and full address, named grievance officer, retention approach, cancellation and return rules, production and delivery statements, and dispute jurisdiction. After legal and business review, set <code className="rounded bg-white px-1.5 py-0.5 text-xs">VITE_LEGAL_CONTENT_APPROVED=true</code> in the production environment.</p>
        </div>
      </div>
    </section>
  );
}

