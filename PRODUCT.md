# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

FabPodd serves shoppers who want to choose a blank product, personalise one or more printable sides, and place the finished item through the existing commerce flow. Administrators manage the dedicated customisation catalogue, mockups, print areas, methods, pricing, artwork, designs, and custom orders independently from the normal shop catalogue.

## Product Purpose

FabPodd combines a normal apparel and merchandise storefront with a separate product-customisation studio. Success means a shopper can move from a dedicated blank-product catalogue into a reliable full-screen designer, retain an independent design on every product side, receive server-validated pricing, and purchase the customised item without disrupting ordinary shopping.

## Positioning

The customisation experience is a purpose-built, four-sided blank-product workflow integrated with FabPodd's existing cart, checkout, authentication, order, upload, and admin infrastructure while remaining structurally isolated from normal merchandise management.

## Operating Context

The primary flow is category-based product selection at `/customise`, followed directly by a full-screen designer at `/customise/:productSlug/design`. Shoppers choose a product colour and size, add text or original artwork within configured print boundaries, switch between front, back, right, and left, recover local drafts, review backend-calculated pricing, and add the configured result to the existing cart. Administrators use the existing protected admin application through a separate Customisation navigation section.

## Capabilities and Constraints

- Normal shop and customisation catalogues use separate database tables, API routes, admin controls, and product imagery.
- Existing homepage, shop routes, normal product details, search, wishlist, cart, checkout, authentication, customer orders, product administration, payments, delivery, Cloudinary, and environment configuration must remain compatible.
- Every custom product colour has distinct front, back, right, and left blank mockup records and each side has natural-image-based print-area coordinates.
- The 2D editor uses Fabric.js and preserves independent canvas JSON and undo/redo history for each side.
- P0 functionality is completed and verified before P1. P2 is explicitly non-blocking and must not destabilise P0.
- Database changes are additive and existing production data is never deleted or rewritten.
- Uploaded artwork is validated, original-resolution references are retained, and pricing is authoritative on the backend.
- Production blank-product imagery is not yet available; clearly identified original local placeholders may be seeded without reusing printed shop imagery.

## Brand Commitments

The product name is FabPodd. New customisation surfaces retain the existing FabPodd logo, navigation, typography, navy and accent palette, cart/authentication state, and customer-facing voice. The catalogue uses the normal header and footer; the focused designer intentionally omits both. Third-party references are behavioural and structural only: their branding, copy, assets, icons, and source code must not be copied.

## Evidence on Hand

- Existing brand and UI implementation: `src/components/layout/AppShell.tsx`, `src/styles/index.css`, and `src/assets/`.
- Existing React/Vite frontend, Express/MySQL backend, protected admin, cart, checkout, orders, and Cloudinary upload infrastructure.
- A detailed user-supplied specification for catalogue structure, editor behaviour, administration, data separation, performance, security, and acceptance testing.
- No final custom-product mockups or original clip-art library were supplied; placeholder assets must be identified and replaceable.

## Product Principles

- Keep normal commerce stable while customisation evolves independently.
- Make the printable result predictable across every product side and viewport.
- Preserve shopper work through side changes, colour changes, and refreshes.
- Treat backend validation and pricing as authoritative.
- Prefer clear, direct creation tools over decorative complexity.

## Accessibility & Inclusion

Customisation must support keyboard navigation, visible focus, accessible names, useful alternative text, adequate contrast, reduced motion, screen-reader announcements, and minimum 44px touch targets. The catalogue and studio must remain usable without horizontal overflow from 320px through desktop widths.
