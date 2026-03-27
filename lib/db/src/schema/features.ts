import {
  pgTable,
  serial,
  text,
  integer,
  boolean,
  timestamp,
  decimal,
} from "drizzle-orm/pg-core";

export const searchSlangTable = pgTable("search_slang", {
  id:        serial("id").primaryKey(),
  term:      text("term").notNull().unique(),
  mapsTo:    text("maps_to").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productSaleEventsTable = pgTable("product_sale_events", {
  id:        serial("id").primaryKey(),
  productId: integer("product_id").notNull(),
  quantity:  integer("quantity").notNull().default(1),
  soldAt:    timestamp("sold_at").notNull().defaultNow(),
});

export const compatibilityGamesTable = pgTable("compatibility_games", {
  id:           serial("id").primaryKey(),
  name:         text("name").notNull(),
  slug:         text("slug").notNull().unique(),
  categorySlug: text("category_slug").notNull(),
  specField:    text("spec_field").notNull().default(""),
  minSpec:      text("min_spec").notNull().default(""),
  recSpec:      text("rec_spec").notNull().default(""),
  imageUrl:     text("image_url").notNull().default(""),
  active:       boolean("active").notNull().default(true),
  createdAt:    timestamp("created_at").notNull().defaultNow(),
});

export const bundlesTable = pgTable("bundles", {
  id:          serial("id").primaryKey(),
  name:        text("name").notNull(),
  slug:        text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  badgeText:   text("badge_text").notNull().default("BUNDLE DEAL"),
  discountPct: integer("discount_pct").notNull().default(5),
  active:      boolean("active").notNull().default(true),
  imageUrl:    text("image_url").notNull().default(""),
  createdAt:   timestamp("created_at").notNull().defaultNow(),
});

export const bundleItemsTable = pgTable("bundle_items", {
  id:        serial("id").primaryKey(),
  bundleId:  integer("bundle_id").notNull(),
  productId: integer("product_id").notNull(),
  quantity:  integer("quantity").notNull().default(1),
});

export const codEscrowSettingsTable = pgTable("cod_escrow_settings", {
  id:                 serial("id").primaryKey(),
  enabled:            boolean("enabled").notNull().default(false),
  highValueThreshold: decimal("high_value_threshold", { precision: 10, scale: 2 }).notNull().default("500"),
  commitmentFeePct:   integer("commitment_fee_pct").notNull().default(10),
  updatedAt:          timestamp("updated_at").notNull().defaultNow(),
});
