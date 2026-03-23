"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { insertDemoSyncedTransaction } from "@/lib/transactions";

export async function syncGmail() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) throw new Error("Unauthorized");

  await insertDemoSyncedTransaction(email);
}

