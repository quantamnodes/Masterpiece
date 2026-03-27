import {
  pgTable,
  text,
  serial,
  integer,
  decimal,
  boolean,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const productsTable = pgTable(
  "products",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    categorySlug: text("category_slug").notNull(),
    category: text("category").notNull(),
    shortDescription: text("short_description").notNull().default(""),
    description: text("description").notNull().default(""),
    basePrice: decimal("base_price", { precision: 10, scale: 2 }).notNull(),
    salePrice: decimal("sale_price", { precision: 10, scale: 2 }),
    stock: integer("stock").notNull().default(0),
    sku: text("sku").notNull().unique(),
    imageUrl: text("image_url").notNull().default(""),
    badge: text("badge"),
    specs: jsonb("specs").notNull().default([]),
    variants: jsonb("variants").notNull().default([]),
    tags: jsonb("tags").notNull().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("products_category_idx").on(table.categorySlug),
    index("products_stock_idx").on(table.stock),
  ],
);

export const cartSessionsTable = pgTable("cart_sessions", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull().unique(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const cartItemsTable = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  productId: integer("product_id").notNull(),
  variantId: integer("variant_id"),
  variantName: text("variant_name"),
  quantity: integer("quantity").notNull().default(1),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const usersTable = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("user"), // user(buyer) | owner | manager
  branchId: integer("branch_id"), // for managers: which branch they manage
  tier: text("tier").notNull().default("bronze"), // bronze | silver | gold | platinum
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  purchaseCount: integer("purchase_count").notNull().default(0),
  loyaltyPoints: integer("loyalty_points").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const branchesTable = pgTable("branches", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  location: text("location").notNull().default(""),
  managerId: integer("manager_id"),
  contact: text("contact").notNull().default(""),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const accessCodesTable = pgTable("access_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // 'owner' | 'manager' | 'employee'
  branchId: integer("branch_id"),
  createdBy: integer("created_by").notNull(),
  label: text("label").notNull().default(""),
  active: boolean("active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  usedBy: integer("used_by"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const branchProductsTable = pgTable("branch_products", {
  id: serial("id").primaryKey(),
  branchId: integer("branch_id").notNull(),
  productId: integer("product_id").notNull(),
  available: boolean("available").notNull().default(true),
  stock: integer("stock"),
  discount: decimal("discount", { precision: 5, scale: 2 }),
  featured: boolean("featured").notNull().default(false),
  notes: text("notes").notNull().default(""),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const wishlistsTable = pgTable("wishlists", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const reviewsTable = pgTable("reviews", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  productId: integer("product_id").notNull(),
  rating: integer("rating").notNull().default(5),
  title: text("title").notNull().default(""),
  body: text("body").notNull(),
  reviewer: text("reviewer").notNull().default("Anonymous"),
  verified: boolean("verified").notNull().default(false),
  photoUrl: text("photo_url"),
  helpfulCount: integer("helpful_count").notNull().default(0),
  unhelpfulCount: integer("unhelpful_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  itemCount: integer("item_count").notNull().default(1),
  status: text("status").notNull().default("confirmed"), // confirmed | packing | dispatched | out_for_delivery | arriving | delivered | cancelled
  fulfillmentType: text("fulfillment_type").notNull().default("delivery"), // delivery | pickup
  branchId: integer("branch_id"), // for pickup orders
  deliveryFee: decimal("delivery_fee", { precision: 8, scale: 2 }).notNull().default("0"),
  estimatedDelivery: timestamp("estimated_delivery"),
  riderName: text("rider_name"),
  riderPhone: text("rider_phone"),
  deliveryAddress: text("delivery_address"),
  deliveryNotes: text("delivery_notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const restockNotificationsTable = pgTable("restock_notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id"),
  productId: integer("product_id").notNull(),
  email: text("email").notNull(),
  notified: boolean("notified").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ────────────────────────────────────────────────────────────────────────────
   NEW FEATURE TABLES
   ──────────────────────────────────────────────────────────────────────────── */

/** One vote per user per review (helpful / not helpful) */
export const reviewVotesTable = pgTable("review_votes", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  reviewId: integer("review_id").notNull(),
  helpful: boolean("helpful").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** "Hold for Me" — reserve a product at a branch for 2 hours */
export const reservationsTable = pgTable("reservations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  productId: integer("product_id").notNull(),
  branchId: integer("branch_id").notNull(),
  otpCode: text("otp_code").notNull(),
  status: text("status").notNull().default("active"), // active | confirmed | cancelled | expired
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Status history entries — one row per status transition */
export const orderStatusHistoryTable = pgTable("order_status_history", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  status: text("status").notNull(), // confirmed | packing | dispatched | out_for_delivery | arriving | delivered
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/** Rider live GPS position, one row per active order */
export const riderLocationsTable = pgTable("rider_locations", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().unique(),
  lat: decimal("lat", { precision: 10, scale: 7 }).notNull(),
  lng: decimal("lng", { precision: 10, scale: 7 }).notNull(),
  heading: integer("heading").notNull().default(0),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/** Discount codes awarded for submitting photo reviews */
export const discountCodesTable = pgTable("discount_codes", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  discountPct: integer("discount_pct").notNull().default(5),
  userId: integer("user_id"),
  reviewId: integer("review_id"),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type Order = typeof ordersTable.$inferSelect;
export type RestockNotification = typeof restockNotificationsTable.$inferSelect;
export type ReviewVote = typeof reviewVotesTable.$inferSelect;
export type Reservation = typeof reservationsTable.$inferSelect;
export type OrderStatusHistory = typeof orderStatusHistoryTable.$inferSelect;
export type RiderLocation = typeof riderLocationsTable.$inferSelect;
export type DiscountCode = typeof discountCodesTable.$inferSelect;

export const insertProductSchema = createInsertSchema(productsTable).omit({
  id: true,
  createdAt: true,
});
export const insertCartItemSchema = createInsertSchema(cartItemsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCategorySchema = createInsertSchema(categoriesTable).omit({
  id: true,
  createdAt: true,
});

export type Product = typeof productsTable.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type CartItem = typeof cartItemsTable.$inferSelect;
export type InsertCartItem = z.infer<typeof insertCartItemSchema>;
export type Category = typeof categoriesTable.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Branch = typeof branchesTable.$inferSelect;
export type AccessCode = typeof accessCodesTable.$inferSelect;
export type BranchProduct = typeof branchProductsTable.$inferSelect;
