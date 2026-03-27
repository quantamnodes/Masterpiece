import {
  pgTable,
  text,
  serial,
  timestamp,
} from "drizzle-orm/pg-core";

export const contactSettingsTable = pgTable("contact_settings", {
  id:                serial("id").primaryKey(),
  email:             text("email").notNull().default("ops@axiomcraft.systems"),
  emailSub:          text("email_sub").notNull().default("Response within 4 hours"),
  phone:             text("phone").notNull().default("+1 (800) AXIOM-00"),
  phoneSub:          text("phone_sub").notNull().default("Mon–Fri, 08:00–22:00 UTC"),
  address:           text("address").notNull().default("Austin, TX 78701"),
  addressSub:        text("address_sub").notNull().default("Hardware Innovation District"),
  smtpHost:          text("smtp_host").notNull().default(""),
  smtpPort:          text("smtp_port").notNull().default("587"),
  smtpUser:          text("smtp_user").notNull().default(""),
  smtpPass:          text("smtp_pass").notNull().default(""),
  smtpFrom:          text("smtp_from").notNull().default(""),
  directLineEmail:   text("direct_line_email").notNull().default(""),
  updatedAt:         timestamp("updated_at").notNull().defaultNow(),
});

export const contactMessagesTable = pgTable("contact_messages", {
  id:        serial("id").primaryKey(),
  name:      text("name").notNull(),
  email:     text("email").notNull(),
  reason:    text("reason").notNull(),
  message:   text("message").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
