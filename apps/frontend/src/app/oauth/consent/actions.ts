"use server";

import { redirect } from "next/navigation";
import { getMcpConfig } from "@/mcp/config";
import { oauthSession } from "../session";

export async function decideConsent(_previous: { error: string }, form: FormData) {
  const authorizationId = String(form.get("authorization_id") ?? "");
  const decision = form.get("decision");
  if (!authorizationId || !["approve", "deny"].includes(String(decision)))
    return { error: "Invalid authorization request. Reconnect from ChatGPT." };
  const { db } = await oauthSession(
    `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
  );
  const { data: details, error } = await db.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !details) return { error: "This request expired. Reconnect from ChatGPT." };
  if ("redirect_url" in details) redirect(details.redirect_url);
  if (details.client.id !== getMcpConfig().clientId)
    return { error: "This client is not the Wishlane ChatGPT integration." };
  const response =
    decision === "approve"
      ? await db.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await db.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
  if (response.error || !response.data)
    return { error: "Unable to complete authorization. Please try connecting again." };
  redirect(response.data.redirect_url);
}
