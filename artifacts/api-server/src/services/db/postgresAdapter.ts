import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../../lib/logger";

export interface DbAdapter {
  saveTransactionIntent(userEmail: string, amount: number): Promise<{ intentId: string }>;
  grantUserAccess(userEmail: string, transactionId: string): Promise<void>;
}

export const postgresAdapter: DbAdapter = {
  async saveTransactionIntent(userEmail: string, amount: number) {
    logger.info({ userEmail, amount }, "[postgres] saveTransactionIntent");

    const result = await db.execute(sql`
      INSERT INTO payment_intents (user_email, amount, status, created_at)
      VALUES (${userEmail}, ${amount}, 'pending', NOW())
      RETURNING id
    `);

    const intentId = String((result.rows[0] as { id: number }).id);
    logger.info({ intentId }, "[postgres] transaction intent saved");
    return { intentId };
  },

  async grantUserAccess(userEmail: string, transactionId: string) {
    logger.info({ userEmail, transactionId }, "[postgres] grantUserAccess");

    await db.execute(sql`
      UPDATE payment_intents
      SET status = 'completed', transaction_id = ${transactionId}, updated_at = NOW()
      WHERE user_email = ${userEmail} AND status = 'pending'
    `);

    await db.execute(sql`
      UPDATE users
      SET subscription_status = 'active', subscription_updated_at = NOW()
      WHERE email = ${userEmail}
    `);

    logger.info({ userEmail, transactionId }, "[postgres] user access granted");
  },
};
