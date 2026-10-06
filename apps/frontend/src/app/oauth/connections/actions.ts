"use server";

import { revalidatePath } from "next/cache";
import { getMcpConfig } from "@/mcp/config";
import { oauthSession } from "../session";

export async function disconnectChatGPT() {
  const { db } = await oauthSession("/oauth/connections");
  const { error } = await db.auth.oauth.revokeGrant({ clientId: getMcpConfig().clientId });
  if (error) throw new Error("Unable to disconnect. Please try again.");
  revalidatePath("/oauth/connections");
}
