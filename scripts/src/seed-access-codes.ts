import { db, accessCodesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

async function seedAccessCodes() {
  console.log("Seeding bootstrap access codes...");

  const bootstrapCodes: Array<{
    code: string;
    type: "owner" | "manager" | "employee";
    label: string;
    createdBy: number;
  }> = [
    {
      code: "AXIOM-OWNER-22015",
      type: "owner",
      label: "Bootstrap Owner",
      createdBy: 4,
    },
    {
      code: "AXIOM-OWNER-SYSTEM",
      type: "owner",
      label: "System Bootstrap Code",
      createdBy: 4,
    },
  ];

  for (const entry of bootstrapCodes) {
    const existing = await db
      .select()
      .from(accessCodesTable)
      .where(eq(accessCodesTable.code, entry.code))
      .limit(1);

    if (existing.length > 0) {
      console.log(`  [skip] ${entry.code} — already exists`);
      continue;
    }

    await db.insert(accessCodesTable).values({
      code: entry.code,
      type: entry.type,
      label: entry.label,
      createdBy: entry.createdBy,
      active: true,
      branchId: null,
    });
    console.log(`  [ok]   ${entry.code} inserted (type: ${entry.type})`);
  }

  console.log("Bootstrap access codes seeded.");
  process.exit(0);
}

seedAccessCodes().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
