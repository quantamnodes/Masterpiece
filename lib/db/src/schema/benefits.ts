import {
  pgTable,
  serial,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";

export const customerBenefitsTable = pgTable("customer_benefits", {
  id:                    serial("id").primaryKey(),
  tierBenefitsVisible:   boolean("tier_benefits_visible").notNull().default(true),
  bronzeDiscount:        integer("bronze_discount").notNull().default(0),
  silverDiscount:        integer("silver_discount").notNull().default(3),
  goldDiscount:          integer("gold_discount").notNull().default(7),
  platinumDiscount:      integer("platinum_discount").notNull().default(15),
  bronzeNext:            integer("bronze_next").notNull().default(500),
  silverNext:            integer("silver_next").notNull().default(2000),
  goldNext:              integer("gold_next").notNull().default(10000),
  updatedAt:             timestamp("updated_at").notNull().defaultNow(),
});
