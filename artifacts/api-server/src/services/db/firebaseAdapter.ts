import { logger } from "../../lib/logger";
import type { DbAdapter } from "./postgresAdapter";

function firestoreUrl(collection: string, docId?: string) {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not set");
  const base = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents`;
  return docId ? `${base}/${collection}/${docId}` : `${base}/${collection}`;
}

async function firestoreRequest(
  url: string,
  method: string,
  body?: unknown,
) {
  const token = process.env.FIREBASE_SERVICE_ACCOUNT_TOKEN;
  if (!token) throw new Error("FIREBASE_SERVICE_ACCOUNT_TOKEN is not set");

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    throw new Error(`[firebase] ${method} ${url} failed: ${await res.text()}`);
  }

  return res.json();
}

export const firebaseAdapter: DbAdapter = {
  async saveTransactionIntent(userEmail: string, amount: number) {
    logger.info({ userEmail, amount }, "[firebase] saveTransactionIntent");

    const doc = await firestoreRequest(
      firestoreUrl("payment_intents"),
      "POST",
      {
        fields: {
          user_email: { stringValue: userEmail },
          amount: { doubleValue: amount },
          status: { stringValue: "pending" },
          created_at: { timestampValue: new Date().toISOString() },
        },
      },
    );

    const intentId = (doc as { name: string }).name.split("/").pop() ?? "";
    logger.info({ intentId }, "[firebase] transaction intent saved");
    return { intentId };
  },

  async grantUserAccess(userEmail: string, transactionId: string) {
    logger.info({ userEmail, transactionId }, "[firebase] grantUserAccess");

    const searchRes = (await firestoreRequest(
      `${firestoreUrl("payment_intents")}:runQuery`,
      "POST",
      {
        structuredQuery: {
          from: [{ collectionId: "payment_intents" }],
          where: {
            compositeFilter: {
              op: "AND",
              filters: [
                {
                  fieldFilter: {
                    field: { fieldPath: "user_email" },
                    op: "EQUAL",
                    value: { stringValue: userEmail },
                  },
                },
                {
                  fieldFilter: {
                    field: { fieldPath: "status" },
                    op: "EQUAL",
                    value: { stringValue: "pending" },
                  },
                },
              ],
            },
          },
          limit: 1,
        },
      },
    )) as Array<{ document?: { name: string } }>;

    const docName = searchRes[0]?.document?.name;
    if (docName) {
      await firestoreRequest(`${docName}?updateMask.fieldPaths=status&updateMask.fieldPaths=transaction_id`, "PATCH", {
        fields: {
          status: { stringValue: "completed" },
          transaction_id: { stringValue: transactionId },
        },
      });
    }

    logger.info({ userEmail, transactionId }, "[firebase] user access granted");
  },
};
