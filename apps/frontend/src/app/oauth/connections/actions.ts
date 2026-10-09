"use server";

import { revalidatePath } from "next/cache";
import { findMcpClient } from "@/mcp/config";
import { oauthSession } from "../session";

export async function disconnectClient(form: FormData) {
  const client = findMcpClient(form.get("client_id"));
  if (!client) throw new Error("Unknown connection.");
  const { db } = await oauthSession("/oauth/connections");
  const { error } = await db.auth.oauth.revokeGrant({ clientId: client.id });
  if (error) throw new Error("Unable to disconnect. Please try again.");
  revalidatePath("/oauth/connections");
}
