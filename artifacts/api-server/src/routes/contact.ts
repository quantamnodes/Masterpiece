import { Router } from "express";
import { db, usersTable, contactSettingsTable, contactMessagesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import nodemailer from "nodemailer";

const router = Router();

async function requireOwner(req: any, res: any, next: any) {
  if (!req.session?.userId) return res.status(401).json({ error: "Not authenticated" });
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.session.userId)).limit(1);
  if (!user || user.role !== "owner") return res.status(403).json({ error: "Owner access required" });
  next();
}

async function getSettings() {
  const rows = await db.select().from(contactSettingsTable).limit(1);
  if (rows.length > 0) return rows[0];
  const [row] = await db.insert(contactSettingsTable).values({}).returning();
  return row;
}

// GET /api/contact-settings — public (no SMTP creds)
router.get("/contact-settings", async (_req, res) => {
  try {
    const s = await getSettings();
    return res.json({
      email:           s.email,
      emailSub:        s.emailSub,
      phone:           s.phone,
      phoneSub:        s.phoneSub,
      address:         s.address,
      addressSub:      s.addressSub,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch contact settings" });
  }
});

// GET /api/contact-settings/admin — owner only (includes SMTP + direct line)
router.get("/contact-settings/admin", requireOwner, async (_req, res) => {
  try {
    const s = await getSettings();
    return res.json({
      email:           s.email,
      emailSub:        s.emailSub,
      phone:           s.phone,
      phoneSub:        s.phoneSub,
      address:         s.address,
      addressSub:      s.addressSub,
      smtpHost:        s.smtpHost,
      smtpPort:        s.smtpPort,
      smtpUser:        s.smtpUser,
      smtpPass:        s.smtpPass,
      smtpFrom:        s.smtpFrom,
      directLineEmail: s.directLineEmail,
    });
  } catch {
    return res.status(500).json({ error: "Failed to fetch admin contact settings" });
  }
});

// PUT /api/contact-settings — owner only
router.put("/contact-settings", requireOwner, async (req, res) => {
  try {
    const {
      email, emailSub, phone, phoneSub, address, addressSub,
      smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, directLineEmail,
    } = req.body;

    const existing = await db.select().from(contactSettingsTable).limit(1);
    const values = {
      email:           email           ?? "ops@axiomcraft.systems",
      emailSub:        emailSub        ?? "Response within 4 hours",
      phone:           phone           ?? "+1 (800) AXIOM-00",
      phoneSub:        phoneSub        ?? "Mon–Fri, 08:00–22:00 UTC",
      address:         address         ?? "Austin, TX 78701",
      addressSub:      addressSub      ?? "Hardware Innovation District",
      smtpHost:        smtpHost        ?? "",
      smtpPort:        smtpPort        ?? "587",
      smtpUser:        smtpUser        ?? "",
      smtpPass:        smtpPass        ?? "",
      smtpFrom:        smtpFrom        ?? "",
      directLineEmail: directLineEmail ?? "",
      updatedAt:       new Date(),
    };

    if (existing.length > 0) {
      await db.update(contactSettingsTable).set(values).where(eq(contactSettingsTable.id, existing[0].id));
    } else {
      await db.insert(contactSettingsTable).values(values);
    }

    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to save contact settings" });
  }
});

// POST /api/contact — submit contact form
router.post("/contact", async (req, res) => {
  try {
    const { name, email, reason, message } = req.body;
    if (!name || !email || !reason || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    await db.insert(contactMessagesTable).values({ name, email, reason, message });

    const s = await getSettings();

    const hasSmtp = s.smtpHost && s.smtpUser && s.smtpPass && s.smtpFrom;
    if (hasSmtp) {
      const transporter = nodemailer.createTransport({
        host: s.smtpHost,
        port: parseInt(s.smtpPort || "587"),
        secure: parseInt(s.smtpPort || "587") === 465,
        auth: { user: s.smtpUser, pass: s.smtpPass },
      });

      const html = `
        <div style="font-family:monospace;background:#050505;color:#e5e5e5;padding:32px;border-radius:4px;border:1px solid #222">
          <h2 style="color:#00F0FF;text-transform:uppercase;letter-spacing:2px;">⚡ AXIOMCRAFT — Incoming Transmission</h2>
          <table style="width:100%;border-collapse:collapse;margin-top:16px">
            <tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase">Operator</td><td style="padding:8px 0">${name}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase">Secure Channel</td><td style="padding:8px 0">${email}</td></tr>
            <tr><td style="padding:8px 0;color:#888;font-size:12px;text-transform:uppercase">Mission Type</td><td style="padding:8px 0">${reason}</td></tr>
          </table>
          <div style="margin-top:16px;padding:16px;background:#0a0a0a;border-left:3px solid #00F0FF;border-radius:2px">
            <p style="color:#888;font-size:12px;text-transform:uppercase;margin:0 0 8px">Message Payload</p>
            <p style="margin:0;white-space:pre-wrap">${message}</p>
          </div>
        </div>`;

      const mailOptions = {
        from:    s.smtpFrom,
        subject: `[AxiomCraft] New Transmission from ${name} — ${reason}`,
        html,
      };

      const recipients: string[] = [s.email];
      if (s.directLineEmail) recipients.push(s.directLineEmail);

      await transporter.sendMail({ ...mailOptions, to: recipients.join(", ") });
    }

    return res.json({ ok: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ error: "Failed to send message" });
  }
});

// GET /api/contact-messages — owner only inbox
router.get("/contact-messages", requireOwner, async (_req, res) => {
  try {
    const messages = await db.select().from(contactMessagesTable).orderBy(contactMessagesTable.createdAt);
    return res.json({ messages: messages.map(m => ({
      id: m.id,
      name: m.name,
      email: m.email,
      reason: m.reason,
      message: m.message,
      createdAt: m.createdAt.toISOString(),
    })) });
  } catch {
    return res.status(500).json({ error: "Failed to fetch messages" });
  }
});

export default router;
