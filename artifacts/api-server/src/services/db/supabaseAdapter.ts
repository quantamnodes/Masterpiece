import { logger } from "../../lib/logger";
import type { DbAdapter } from "./postgresAdapter";

export const supabaseAdapter: DbAdapter = {
  async saveTransactionIntent(userEmail: string, amount: number) {
    logger.info({ userEmail, amount }, "[supabase] saveTransactionIntent");

    const res = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/payment_intents`,
      {
        method: "POST",
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ user_email: userEmail, amount, status: "pending" }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`[supabase] saveTransactionIntent failed: ${text}`);
    }

    const rows = (await res.json()) as Array<{ id: string }>;
    const intentId = rows[0].id;
    logger.info({ intentId }, "[supabase] transaction intent saved");
    return { intentId };
  },

  async grantUserAccess(userEmail: string, transactionId: string) {
    logger.info({ userEmail, transactionId }, "[supabase] grantUserAccess");

    const intentRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/payment_intents?user_email=eq.${encodeURIComponent(userEmail)}&status=eq.pending`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed", transaction_id: transactionId }),
      },
    );

    if (!intentRes.ok) {
      throw new Error(`[supabase] update intent failed: ${await intentRes.text()}`);
    }

    const userRes = await fetch(
      `${process.env.SUPABASE_URL}/rest/v1/users?email=eq.${encodeURIComponent(userEmail)}`,
      {
        method: "PATCH",
        headers: {
          apikey: process.env.SUPABASE_ANON_KEY ?? "",
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ subscription_status: "active" }),
      },
    );

    if (!userRes.ok) {
      throw new Error(`[supabase] grant access failed: ${await userRes.text()}`);
    }

    logger.info({ userEmail, transactionId }, "[supabase] user access granted");
  },
};
