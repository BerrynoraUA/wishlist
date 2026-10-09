"use server";

import { redirect } from "next/navigation";
import { findMcpClient } from "@/mcp/config";
import { oauthSession } from "../session";

export type ConsentError = "invalid" | "expired" | "unknown" | "failed";

export async function decideConsent(
  _previous: { error: ConsentError | null },
  form: FormData,
): Promise<{ error: ConsentError | null }> {
  const authorizationId = String(form.get("authorization_id") ?? "");
  const decision = form.get("decision");
  if (!authorizationId || !["approve", "deny"].includes(String(decision)))
    return { error: "invalid" };
  const { db } = await oauthSession(
    `/oauth/consent?authorization_id=${encodeURIComponent(authorizationId)}`,
  );
  const { data: details, error } = await db.auth.oauth.getAuthorizationDetails(authorizationId);
  if (error || !details) return { error: "expired" };
  if ("redirect_url" in details) redirect(details.redirect_url);
  if (!findMcpClient(details.client.id)) return { error: "unknown" };
  const response =
    decision === "approve"
      ? await db.auth.oauth.approveAuthorization(authorizationId, { skipBrowserRedirect: true })
      : await db.auth.oauth.denyAuthorization(authorizationId, { skipBrowserRedirect: true });
  if (response.error || !response.data) return { error: "failed" };
  redirect(response.data.redirect_url);
}
