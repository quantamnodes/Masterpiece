# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Structure

```text
artifacts-monorepo/
├── artifacts/              # Deployable applications
│   ├── api-server/         # Express API server
│   └── axiomcraft/         # AxiomCraft e-commerce React + Vite frontend
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts (single workspace package)
│   └── src/                # Individual .ts scripts, run via `pnpm --filter @workspace/scripts run <script>`
├── pnpm-workspace.yaml     # pnpm workspace (artifacts/*, lib/*, lib/integrations/*, scripts)
├── tsconfig.base.json      # Shared TS options (composite, bundler resolution, es2022)
├── tsconfig.json           # Root TS project references
└── package.json            # Root package with hoisted devDeps
```

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references. This means:

- **Always typecheck from the root** — run `pnpm run typecheck` (which runs `tsc --build --emitDeclarationOnly`). This builds the full dependency graph so that cross-package imports resolve correctly. Running `tsc` inside a single package will fail if its dependencies haven't been built yet.
- **`emitDeclarationOnly`** — we only emit `.d.ts` files during typecheck; actual JS bundling is handled by esbuild/tsx/vite...etc, not `tsc`.
- **Project references** — when package A depends on package B, A's `tsconfig.json` must list B in its `references` array. `tsc --build` uses this to determine build order and skip up-to-date packages.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages that define it
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/api-server` (`@workspace/api-server`)

Express 5 API server. Routes live in `src/routes/` and use `@workspace/api-zod` for request and response validation and `@workspace/db` for persistence.

- Entry: `src/index.ts` — reads `PORT`, starts Express
- App setup: `src/app.ts` — mounts CORS, JSON/urlencoded parsing, routes at `/api`
- Routes: `src/routes/index.ts` mounts sub-routers; `src/routes/health.ts` exposes `GET /health` (full path: `/api/health`)
- Depends on: `@workspace/db`, `@workspace/api-zod`
- `pnpm --filter @workspace/api-server run dev` — run the dev server
- `pnpm --filter @workspace/api-server run build` — production esbuild bundle (`dist/index.cjs`)
- Build bundles an allowlist of deps (express, cors, pg, drizzle-orm, zod, etc.) and externalizes the rest

### `lib/db` (`@workspace/db`)

Database layer using Drizzle ORM with PostgreSQL. Exports a Drizzle client instance and schema models.

- `src/index.ts` — creates a `Pool` + Drizzle instance, exports schema
- `src/schema/index.ts` — barrel re-export of all models
- `src/schema/<modelname>.ts` — table definitions with `drizzle-zod` insert schemas (no models definitions exist right now)
- `drizzle.config.ts` — Drizzle Kit config (requires `DATABASE_URL`, automatically provided by Replit)
- Exports: `.` (pool, db, schema), `./schema` (schema only)

Production migrations are handled by Replit when publishing. In development, we just use `pnpm --filter @workspace/db run push`, and we fallback to `pnpm --filter @workspace/db run push-force`.

### `lib/api-spec` (`@workspace/api-spec`)

Owns the OpenAPI 3.1 spec (`openapi.yaml`) and the Orval config (`orval.config.ts`). Running codegen produces output into two sibling packages:

1. `lib/api-client-react/src/generated/` — React Query hooks + fetch client
2. `lib/api-zod/src/generated/` — Zod schemas

Run codegen: `pnpm --filter @workspace/api-spec run codegen`

### `lib/api-zod` (`@workspace/api-zod`)

Generated Zod schemas from the OpenAPI spec (e.g. `HealthCheckResponse`). Used by `api-server` for response validation.

### `lib/api-client-react` (`@workspace/api-client-react`)

Generated React Query hooks and fetch client from the OpenAPI spec (e.g. `useHealthCheck`, `healthCheck`).

### `lib/object-storage-web` (`@workspace/object-storage-web`)

Client-side object storage upload library using presigned URLs (GCS). Exports:
- `useUpload(options)` — React hook for plain `<input type="file">` uploads: requests presigned URL from backend, then PUTs file directly to GCS. Returns `{ uploadFile, isUploading, progress, error }`.
- `ObjectUploader` — Uppy-based modal component for drag-and-drop uploads (uses `@uppy/dashboard` + `@uppy/aws-s3`).

**Upload flow:** `POST /api/storage/uploads/request-url` (JSON metadata) → PUT to presigned URL → store `objectPath` in DB → serve via `GET /api/storage/objects/{path}`.

### `artifacts/axiomcraft` (`@workspace/axiomcraft`)

AxiomCraft premium PC hardware e-commerce storefront. React + Vite SPA, always dark mode.

**Pages (10+):**
- Home — cinematic hero, bento grid, stat counters, 3×3 New Acquisitions grid, Field Reports testimonials, Recently Viewed carousel
- Products — catalog with category/sort/socket/form-factor/wattage/memory/storage filters + **price range filter** (min/max inputs)
- Product Detail — spec table, variant switcher, add-to-cart, related products, **recently viewed tracking**, **Notify Me (restock alert)** for OOS items, **Customer Reviews section** (AI summary + voting), **Hold for Me** button
- Cart — BOPIS (delivery $15 flat / pickup free + branch selector), real order placement (POST /orders), loyalty point estimate, success screen
- Contact — support form
- Account — login/signup tabs, profile with tier badge, spending progress bar, **expandable order history with tracking timeline**, **My Holds (reservations)**, **loyalty points balance card**
- Deals — Deal Vault with discount badges, savings counter, animated deal cards
- PC Builder — pre-configured build presets + per-slot component selector with live price total
- Compare — side-by-side spec table for up to 3 products, **pre-populates from compare-store** when navigating from catalog
- Platinum — tier-gated secret page for Platinum operators with classified deals
- Wishlist — saved products list with toggle from ProductCard

**Feature Upgrades (v2):**
- **Traffic-light stock badges** (`StockBadge`): pulsing coloured dot (green >10, amber 1-10, red 0) on all product cards and detail pages
- **Hold for Me**: `HoldForMeModal` lets buyers reserve a product at a branch for 2 hours with a 4-digit OTP pickup code
- **Review helpfulness voting** (`ReviewVoteButtons`): thumbs-up/thumbs-down on each review with toggle-off; counts persisted in DB
- **Customer reviews section** on ProductDetail: star rating, title, body, optional photo URL; submit form for logged-in users
- **Gamified review incentives**: submitting a photo review auto-generates a 5% discount code
- **AI review summaries** (`ReviewSummary`): gpt-4o-mini generates a 2-sentence "Customers say…" summary per product, cached in memory for 1 hour
- **Expanded order tracking timeline** (`OrderTimeline`): 6-step accordion (confirmed → packing → dispatched → out_for_delivery → arriving → delivered) with timestamps, rider info, and live GPS indicator
- **Live rider GPS tracking**: `PUT /api/orders/:id/rider-location` for rider updates; polling every 15s in Account when order is out for delivery/arriving
- **Dynamic localization engine**: `useLocalizationStore` (Zustand persist) + `CurrencySelector` in Navbar; 15 currencies (USD, EUR, GBP, JPY, INR, AED, SGD, KRW, CNY, BRL, MXN…); auto-detects from IP on boot; converts all prices via `formatPrice(usdAmount)`

**New DB Tables:**
- `review_votes` — one vote per user per review (helpful bool)
- `reservations` — Hold for Me reservations with OTP and expiry
- `order_status_history` — audit trail of status transitions with timestamps
- `rider_locations` — live GPS (lat, lng, heading) keyed by orderId
- `discount_codes` — 5% codes generated for photo reviews

**New columns:** `reviews.photoUrl`, `reviews.helpfulCount`, `reviews.unhelpfulCount`; `orders.estimatedDelivery`, `orders.riderName`, `orders.riderPhone`, `orders.deliveryAddress`, `orders.deliveryNotes`

**New API routes:**
- `GET  /api/localization/rates` — 15-currency exchange rate table
- `GET  /api/localization/detect` — IP-based currency detection (ip-api.com)
- `GET  /api/products/:id/reviews` — review list (sorted by helpfulness)
- `POST /api/reviews` — submit review + auto-generate discount code for photo reviews
- `POST /api/reviews/:id/vote` — toggle helpful/unhelpful vote
- `GET  /api/reviews/:id/my-vote` — current user's vote
- `GET  /api/products/:id/review-summary` — AI summary (gpt-4o-mini via Replit proxy)
- `POST /api/reservations` — create 2-hour hold with OTP
- `GET  /api/reservations/my` — user's reservations
- `DELETE /api/reservations/:id` — cancel hold
- `PUT  /api/reservations/:id/confirm` — OTP-based pickup confirmation
- `GET  /api/orders/:id/tracking` — full timeline + rider info + ETA
- `PUT  /api/orders/:id/status` — advance order status (staff)
- `PUT  /api/orders/:id/rider-location` — rider GPS update
- `GET  /api/orders/:id/rider-location` — buyer polls rider position

**Design:** Brutalist luxury / futuristic noir — #050505 bg, #00F0FF cyan, #F04444 red accent
**Typography:** Space Grotesk (headings), Inter (body), JetBrains Mono (specs/numbers)
**Animations:** Framer Motion scroll-linked reveals, spring micro-interactions, staggered entrances
**State:** Zustand cart store + user store (both persisted to localStorage); TIER_CONFIG (Bronze/Silver/Gold/Platinum)
**Compare store:** `useCompareStore` (Zustand, max 4 items, no persist) → `CompareBar` (floating bottom bar, app-global)
**Recently Viewed store:** `useRecentlyViewedStore` (Zustand persist, max 8, localStorage) → `RecentlyViewedCarousel` on homepage
**Auth:** bcryptjs + express-session; POST /api/auth/register|login|logout|claim-role, GET /api/auth/me

**Multi-Role System:**
- **owner** — full access (migrated from old "admin"). Manages products, branches, access codes.
- **manager** — branch-specific access. Manages product availability/stock/discounts for their assigned branch.
- **user/buyer** — standard customer. Shopping, cart, wishlist, tiers.
- Access codes are generated dynamically by owners in the Dashboard > Access Codes tab.
- Access code format: `AXM-OWN-XXXXXX-YYYY` (owner), `AXM-MGR-SHID-XXXXXX-YYYY` (manager)
- Roles are claimed via POST /api/auth/claim-role with { accessCode }

**Multi-Branch System:**
- Branches table: name, location, contact, managerId, active
- branch_products table: per-product overrides for each branch (available, stock, discount, featured, notes)
- GET /api/branches — all branches (public)
- POST/PUT/DELETE /api/branches/:id — owner only
- GET /api/branches/:branchId/products — products with branch data
- PUT /api/branches/:branchId/products/:productId — update branch product (owner or branch manager)
- GET /api/products/:productId/branches — branch availability for a product

**Dashboards:**
- /dashboard — Owner Panel (Products, Branches, Access Codes tabs). Product form has `ProductImageField` component: inline URL input + Upload button (uses `useUpload` from `@workspace/object-storage-web`). File uploads go to GCS via presigned URL; the resulting `/api/storage/objects/…` URL is auto-populated into the form.
- /manager — Manager Panel (branch product management for their assigned branch)

**Navbar:** Dropdown menus (Hardware → categories, Tools → PC Builder/Compare/Deals), user dropdown with tier badge, search overlay, animated cart badge, mobile slide-over. Shows "Dashboard" for owners, "My Branch" for managers.
**API patterns:** API_BASE = `import.meta.env.BASE_URL.replace(/\/$/, "") + "/api"`; Product images: `https://picsum.photos/seed/{slug}/800/600`
**After DB schema changes:** rebuild declarations: `cd lib/db && pnpm exec tsc -p tsconfig.json`
**Seed:** `pnpm --filter @workspace/scripts run seed` — populates 6 categories, 20 hardware products

### Universal Switchboard (Provider-Agnostic Payments + DB)

Located in `artifacts/api-server/src/services/`.

**Architecture:** Factory/Strategy pattern. Set environment variables in `.env` (see `.env.example`) to select the active provider at runtime. No route code changes needed to switch providers.

**DB Service Layer** (`services/db/`):
- `dbService.ts` — exports `getDbAdapter()` based on `ACTIVE_DATABASE` env var (singleton, lazy-loaded)
- `postgresAdapter.ts` — uses existing Drizzle ORM + `@workspace/db` connection
- `supabaseAdapter.ts` — uses Supabase REST API
- `mongoAdapter.ts` — uses MongoDB Atlas Data API
- `firebaseAdapter.ts` — uses Firestore REST API

Every adapter implements:
- `saveTransactionIntent(userEmail, amount)` — saves pending intent before payment
- `grantUserAccess(userEmail, transactionId)` — marks intent completed + upgrades user

**Payment Service Layer** (`services/payment/`):
- `paymentService.ts` — exports `getPaymentAdapter()` based on `ACTIVE_PAYMENT` env var (singleton, lazy-loaded)
- `stripeAdapter.ts` — Stripe Checkout Sessions + webhook HMAC-SHA256 verification
- `amarpayAdapter.ts` — AmarPay POST redirect + IPN callback
- `lemonAdapter.ts` — LemonSqueezy checkouts + HMAC-SHA256 webhook
- `paypalAdapter.ts` — PayPal Orders v2 + event-type verification
- `sslcommerzAdapter.ts` — SSLCommerz gateway + IPN validation API

Every adapter implements:
- `createCheckoutSession(amount, currency, userEmail)` → `{ checkoutUrl }`
- `verifyWebhook(rawBody, signatureHeader)` → `{ status, transactionId, userEmail }`

**API Routes:**
- `POST /api/checkout` — saves intent via DB adapter, creates checkout via payment adapter, returns `{ checkoutUrl }`
- `POST /api/webhook` — verifies provider signature, grants user access on success; detects signature header automatically from all providers

**DB Table:** `payment_intents` (id, user_email, amount, status, transaction_id, provider, created_at, updated_at) — managed via Drizzle schema in `lib/db/src/schema/switchboard.ts`

**`.env.example`** at project root — full template with all provider credentials documented.

### `scripts` (`@workspace/scripts`)

Utility scripts package. Each script is a `.ts` file in `src/` with a corresponding npm script in `package.json`. Run scripts via `pnpm --filter @workspace/scripts run <script>`. Scripts can import any workspace package (e.g., `@workspace/db`) by adding it as a dependency in `scripts/package.json`.

- `pnpm --filter @workspace/scripts run seed` — seeds AxiomCraft database with hardware products
