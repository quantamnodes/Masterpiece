# Overview

This project is a pnpm workspace monorepo using TypeScript, designed for an e-commerce platform called AxiomCraft. The core purpose is to provide a robust, scalable, and feature-rich online store for premium PC hardware. The project aims to deliver a high-quality user experience with advanced features like real-time inventory tracking, customer reviews with AI summaries, loyalty programs, multi-currency support, and a comprehensive order tracking system. It also incorporates a flexible, provider-agnostic payment and database service layer to easily switch between different third-party providers. The business vision is to capture a significant share of the premium PC hardware market by offering a superior shopping experience and cutting-edge functionalities.

# User Preferences

I prefer iterative development, with a focus on delivering small, functional increments. Please ask for my approval before making any major architectural changes or introducing new external dependencies. I appreciate clear and concise explanations of your proposed solutions and implementations.

# System Architecture

The project is structured as a pnpm workspace monorepo, facilitating shared libraries and deployable applications.

**Core Technologies:**
- **Monorepo:** pnpm workspaces
- **Language:** TypeScript 5.9
- **Backend:** Node.js 24, Express 5
- **Database:** PostgreSQL with Drizzle ORM
- **Frontend:** React with Vite
- **Validation:** Zod (with `drizzle-zod` for ORM integration)
- **API Codegen:** Orval (from OpenAPI spec)
- **Build Tool:** esbuild

**Key Architectural Decisions & Features:**

1.  **Modular Monorepo Structure:**
    *   `artifacts/`: Contains deployable applications (`api-server`, `axiomcraft`).
    *   `lib/`: Houses shared libraries (`api-spec`, `api-client-react`, `api-zod`, `db`, `object-storage-web`).
    *   `scripts/`: Holds utility scripts.

2.  **TypeScript & Composite Projects:** Utilizes TypeScript's project references (`composite: true`) for efficient cross-package type-checking and declaration emission (`emitDeclarationOnly`).

3.  **API Server (`@workspace/api-server`):**
    *   Express.js based, handling API routes, validation, and persistence.
    *   Uses `@workspace/api-zod` for request/response validation and `@workspace/db` for database operations.
    *   Bundled with esbuild for production.

4.  **Database Layer (`@workspace/db`):**
    *   Drizzle ORM for PostgreSQL.
    *   Manages database schema and connections.
    *   Includes Drizzle Kit for migrations.

5.  **API Specification & Code Generation (`@workspace/api-spec`):**
    *   OpenAPI 3.1 specification (`openapi.yaml`) drives code generation.
    *   Orval generates:
        *   React Query hooks and fetch client (`@workspace/api-client-react`).
        *   Zod schemas (`@workspace/api-zod`).

6.  **Object Storage (`@workspace/object-storage-web`):**
    *   Client-side library for uploading files to GCS using presigned URLs.
    *   Provides React hooks and an Uppy-based component for uploads.

7.  **Frontend (`@workspace/axiomcraft`):**
    *   React + Vite SPA with a "Brutalist luxury / futuristic noir" design aesthetic (dark mode, specific color palette: #050505, #00F0FF, #F04444).
    *   **UI/UX:** Uses Space Grotesk (headings), Inter (body), JetBrains Mono (specs), Framer Motion for animations.
    *   **Core Pages:** Home, Products, Product Detail, Cart, Account, Deals, PC Builder, Compare, Platinum, Wishlist.
    *   **Advanced Features:**
        *   **Stock Management:** Traffic-light stock badges.
        *   **Reservations:** "Hold for Me" feature with OTP for pickup.
        *   **Customer Reviews:** AI-generated summaries (gpt-4o-mini), helpfulness voting, photo review incentives (discount codes).
        *   **Order Tracking:** Expanded timeline with live GPS tracking for riders.
        *   **Localization:** Dynamic localization engine with multi-currency support, IP-based detection using Zustand for persistence.
        *   **Authentication:** `bcryptjs` and `express-session` for multi-role system (owner, manager, user/buyer) with dynamic access codes.
        *   **Multi-Branch System:** Manages product availability and stock per branch.
        *   **Dashboards:** Owner and Manager panels for product, branch, and access code management.

8.  **Universal Switchboard (Provider-Agnostic Services):**
    *   Employs Factory/Strategy pattern for payment and database services.
    *   Environment variables (`ACTIVE_DATABASE`, `ACTIVE_PAYMENT`) dictate active provider at runtime.
    *   **DB Service Layer:** Abstracts database operations with adapters for PostgreSQL (Drizzle), Supabase, MongoDB, Firebase.
    *   **Payment Service Layer:** Abstracts payment gateway interactions with adapters for Stripe, AmarPay, LemonSqueezy, PayPal, SSLCommerz.
    *   Includes API routes for `checkout` and generic `webhook` processing, automatically detecting provider signatures.
    *   Manages a `payment_intents` table via Drizzle.

# External Dependencies

-   **Database:** PostgreSQL
-   **Object Storage:** Google Cloud Storage (GCS) for file uploads
-   **IP Detection:** ip-api.com
-   **AI Summaries:** GPT-4o-mini (via Replit proxy)
-   **Payment Gateways (Configurable):**
    *   Stripe
    *   AmarPay
    *   LemonSqueezy
    *   PayPal
    *   SSLCommerz
-   **Database Providers (Configurable):**
    *   Supabase
    *   MongoDB Atlas Data API
    *   Firestore (Firebase)
-   **Frontend Libraries:**
    *   Uppy (`@uppy/dashboard`, `@uppy/aws-s3`)
    *   Framer Motion
    *   Zustand (state management)
    *   React Query
-   **Auth/Security:**
    *   `bcryptjs`
    *   `express-session`