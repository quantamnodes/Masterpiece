import {
  pgTable,
  text,
  serial,
  decimal,
  timestamp,
  index,
} from "drizzle-orm/pg-core";

export const paymentIntentsTable = pgTable(
  "payment_intents",
  {
    id: serial("id").primaryKey(),
    userEmail: text("user_email").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    status: text("status").notNull().default("pending"),
    transactionId: text("transaction_id"),
    provider: text("provider"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("payment_intents_user_email_idx").on(t.userEmail)],
);
