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
  tier: text("tier").notNull().default("bronze"), // bronze | silver | gold | platinum
  totalSpent: decimal("total_spent", { precision: 12, scale: 2 }).notNull().default("0"),
  purchaseCount: integer("purchase_count").notNull().default(0),
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
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

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
