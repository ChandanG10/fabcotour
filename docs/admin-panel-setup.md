# FAB COUTURE Admin Panel Setup

## Environment

Create a local `.env` from `.env.example` and fill in real values locally only.

Required variables:

```env
VITE_API_BASE_URL=http://localhost:8787/api
VITE_PRODUCTION_API_BASE_URL=https://fabcotour.vercel.app/api
SERVER_PORT=8787
NODE_ENV=development
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
JWT_EXPIRES_IN=1d
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
ADMIN_EMAIL=admin@fabcouture.in
ADMIN_PASSWORD=
```

## Install

```bash
npm install
```

## Database Migration

```bash
npm run migrate
```

This applies [`server/migrations/001_init.sql`](/Users/chandangirish/Documents/fabcotour/server/migrations/001_init.sql:1).

## Default Admin Seed

```bash
npm run seed:admin
```

The seed is idempotent and only creates the default admin if the email does not already exist.

## Reset Existing Admin Password

If the admin row already exists, changing `ADMIN_PASSWORD` in `.env` does not update the stored bcrypt hash automatically.

Run:

```bash
npm run reset:admin-password
```

This resets the existing default admin password to the current `.env` value.

## Local Development

Frontend:

```bash
npm run dev
```

Backend:

```bash
npm run dev:server
```

## Production Builds

```bash
npm run build
npm run build:server
```

## Admin Routes

- `GET /api/admin/auth/me`
- `POST /api/admin/auth/login`
- `POST /api/admin/auth/logout`
- `POST /api/admin/auth/change-password`
- `GET /api/admin/dashboard`
- `GET|POST /api/admin/products`
- `GET|PUT|DELETE /api/admin/products/:id`
- `PATCH /api/admin/products/:id/archive`
- `PATCH /api/admin/products/:id/images/reorder`
- `DELETE /api/admin/products/:id/images/:imageId`
- `GET|POST /api/admin/categories`
- `PUT|DELETE /api/admin/categories/:id`
- `GET|PUT /api/admin/homepage`
- `PUT /api/admin/homepage/site-settings`
- `GET|PUT /api/admin/orders`
- `GET /api/admin/customers`
- `GET|POST /api/admin/coupons`
- `PUT|DELETE /api/admin/coupons/:id`
- `GET|PUT /api/admin/reviews`
- `GET|PUT /api/admin/enquiries/corporate`
- `GET|PUT /api/admin/enquiries/bulk`
- `GET|PUT /api/admin/enquiries/contact`
- `POST /api/admin/uploads/images`

## Storefront Routes

- `GET /api/store/homepage`
- `GET /api/store/categories`
- `GET /api/store/products`
- `GET /api/store/products/:slug`

## Frontend Admin URLs

- `/admin`
- `/admin/login`
- `/admin/dashboard`

## Notes

- Admin auth uses the `admin_token` HTTP-only cookie. Production sets `Secure`,
  `SameSite=None`, `Path=/`, and `Partitioned` so the Vercel API session works
  from the storefront domain when third-party cookies are restricted.
- No admin token is stored in `localStorage`.
- Product/category/homepage image uploads go through Multer memory storage and Cloudinary.
- The storefront homepage, shop, product page, customiser, cart lookups, and header search now load products from the backend API layer instead of the hard-coded catalog.
