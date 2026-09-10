# Corporate products

Corporate gifting is isolated from normal Products and Customisation. The existing corporate hero and general email enquiry form remain intact.

## Routes

- `/admin/corporate-products`: protected corporate catalogue with add/edit, image uploads, included-item editing, search/category filter, activation, featuring, deletion and numeric display order (lower first).
- `/corporate-gifting`: backend-driven Corporate Gift Collections, with 3/2/1 columns on desktop/tablet/mobile.
- `/corporate-gifting/:slug`: active product details, gallery and quote enquiry.
- `/api/admin/corporate-products`: authenticated GET/POST; `/:id` GET/PUT/PATCH/DELETE.
- `/api/corporate-products`: public GET; `/:slug` GET; `/:slug/enquiries` multipart POST.

Categories are corporate-only editable labels, with suggestions from existing corporate products. They do not change normal catalogue categories. Deleting a corporate product soft-deletes it and preserves past enquiries. Slugs stay reserved after deletion.

## Database setup

The additive `018_corporate_products.sql` migration creates the table and six initial products. Re-running it does not overwrite edited products. The targeted command avoids unrelated pending migrations:

```sh
node_modules/.bin/tsx server/scripts/migrate-corporate-products.ts
```

The migration was applied to the configured database during implementation. Migrations 013–017 were already pending and were deliberately left untouched.

Starter kits use Request Quote with no invented prices. MOQ is initially 1; customisation, logo printing, name personalisation, packaging and bulk options are initially enabled. Review these editable catalogue defaults before launch. Delivery dates are confirmed through quotes.

## Images and uploads

Six AI-generated studio mockups live in `public/images/corporate/`, named for their slugs. They are square 1200px WebP assets, approximately 109–169 KB each. Each `.webp.json` sidecar stores the exact prompt and built-in imagegen provenance. These are illustrative mockups rather than photographs of actual manufactured stock; replace them through Admin when physical product photography is available.

Admin main/gallery uploads reuse the existing authenticated Cloudinary image endpoint. Up to 10 additional images are supported. Product image replacement changes the reference only, preserving shared assets. Quote artwork uses the existing image validation and Cloudinary service, accepts JPG/PNG/WebP up to 5 MB, and verifies image signatures. Upload failure keeps the form; database failure attempts to clean up the new enquiry upload.

## Enquiries

Product enquiries are saved in the existing `corporate_enquiries` table and appear under Admin → Enquiries → Corporate Enquiries. Product name comes from the active database product, and quantity is checked against the current MOQ on the server. The inbox shows company, phone, quantity, requirements and artwork links. Product quote submission succeeds independently of SMTP. The existing general corporate email form keeps its current email behaviour.

## Validation

```sh
npm run build:server
NODE_ENV=production npm run build
node_modules/.bin/tsx scripts/test-corporate-products.ts
# Optional real Cloudinary round-trip; test images are cleaned up:
TEST_CORPORATE_UPLOADS=1 node_modules/.bin/tsx scripts/test-corporate-products.ts
```

API tests use connection-scoped temporary MySQL tables, so test product mutations and enquiries cannot change live records. They cover authentication, seed data, CRUD, duplicate slugs, validation, filters, activation, featuring/order, galleries, MOQ, invalid uploads, persistence and soft deletion. Optional upload checks validate the real Cloudinary paths.

The current local environment sets NODE_ENV=development; pass NODE_ENV=production explicitly when validating a production frontend build. The existing admin session provider has a development StrictMode session-loading race; this feature does not change authentication.

UI verification uses isolated API fixtures derived from the six database products, keeping browser test edits out of live data. Deploy the updated API and frontend together; the existing deployment was not changed by this task.

### Completed verification (2026-09-10)

- Backend build, explicit production frontend build, and lint of all new feature/test files passed. Vite still reports the existing large bundle warning.
- Real MySQL temporary-table integration suite passed, including real Cloudinary admin-image and enquiry-artwork round-trips; uploaded test assets were deleted.
- Read-only API checks against the configured database returned HTTP 200 with 6 corporate products, 72 shop products and 54 store categories.
- Production UI checks with isolated fixtures passed at 1440px and 390px: six cards, details navigation, quote submission, admin deep-link, search, included-item edit/save and activation. No JavaScript exceptions or horizontal overflow were observed. Tablet grid is defined at 768px but was not separately browser-captured.
- Independent scoped visual review: Ship, no material findings. Screenshots are under `.impeccable/review/corporate/`.
- Existing normal product create/edit implementation was left unchanged; no live normal-product mutations were used for testing.
