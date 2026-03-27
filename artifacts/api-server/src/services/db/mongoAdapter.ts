import { logger } from "../../lib/logger";
import type { DbAdapter } from "./postgresAdapter";

function getMongoClient() {
  if (!process.env.MONGODB_URI) throw new Error("MONGODB_URI is not set");
  if (!process.env.MONGODB_DB_NAME) throw new Error("MONGODB_DB_NAME is not set");
}

export const mongoAdapter: DbAdapter = {
  async saveTransactionIntent(userEmail: string, amount: number) {
    logger.info({ userEmail, amount }, "[mongo] saveTransactionIntent");
    getMongoClient();

    const res = await fetch(
      `${process.env.MONGODB_DATA_API_URL}/action/insertOne`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.MONGODB_DATA_API_KEY ?? "",
        },
        body: JSON.stringify({
          collection: "payment_intents",
          database: process.env.MONGODB_DB_NAME,
          dataSource: process.env.MONGODB_DATA_SOURCE ?? "Cluster0",
          document: {
            user_email: userEmail,
            amount,
            status: "pending",
            created_at: new Date().toISOString(),
          },
        }),
      },
    );

    if (!res.ok) {
      throw new Error(`[mongo] saveTransactionIntent failed: ${await res.text()}`);
    }

    const data = (await res.json()) as { insertedId: string };
    const intentId = data.insertedId;
    logger.info({ intentId }, "[mongo] transaction intent saved");
    return { intentId };
  },

  async grantUserAccess(userEmail: string, transactionId: string) {
    logger.info({ userEmail, transactionId }, "[mongo] grantUserAccess");
    getMongoClient();

    const intentRes = await fetch(
      `${process.env.MONGODB_DATA_API_URL}/action/updateOne`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.MONGODB_DATA_API_KEY ?? "",
        },
        body: JSON.stringify({
          collection: "payment_intents",
          database: process.env.MONGODB_DB_NAME,
          dataSource: process.env.MONGODB_DATA_SOURCE ?? "Cluster0",
          filter: { user_email: userEmail, status: "pending" },
          update: {
            $set: {
              status: "completed",
              transaction_id: transactionId,
              updated_at: new Date().toISOString(),
            },
          },
        }),
      },
    );

    if (!intentRes.ok) {
      throw new Error(`[mongo] update intent failed: ${await intentRes.text()}`);
    }

    const userRes = await fetch(
      `${process.env.MONGODB_DATA_API_URL}/action/updateOne`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "api-key": process.env.MONGODB_DATA_API_KEY ?? "",
        },
        body: JSON.stringify({
          collection: "users",
          database: process.env.MONGODB_DB_NAME,
          dataSource: process.env.MONGODB_DATA_SOURCE ?? "Cluster0",
          filter: { email: userEmail },
          update: {
            $set: {
              subscription_status: "active",
              subscription_updated_at: new Date().toISOString(),
            },
          },
        }),
      },
    );

    if (!userRes.ok) {
      throw new Error(`[mongo] grant access failed: ${await userRes.text()}`);
    }

    logger.info({ userEmail, transactionId }, "[mongo] user access granted");
  },
};
