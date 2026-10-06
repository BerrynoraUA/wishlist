import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@wishlist/backend/supabase/shared";
import type { WishlistSupabaseClient } from "@wishlist/backend/supabase";
import { getMcpConfig } from "./config";

export type McpContext = {
  db: WishlistSupabaseClient;
  userId: string;
  clientId: string;
  actorName: string;
};

export function validMcpClaims(
  claims: Record<string, unknown>,
  expected: { issuer: string; resource: string; clientId: string },
  now = Math.floor(Date.now() / 1000),
) {
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return (
    claims.iss === expected.issuer &&
    audiences.includes(expected.resource) &&
    claims.client_id === expected.clientId &&
    claims.role === "authenticated" &&
    typeof claims.sub === "string" &&
    typeof claims.exp === "number" &&
    claims.exp > now &&
    (claims.nbf === undefined || (typeof claims.nbf === "number" && claims.nbf <= now))
  );
}

export async function authenticateMcp(request: Request): Promise<McpContext | null> {
  const match = /^Bearer ([^\s]+)$/i.exec(request.headers.get("authorization") ?? "");
  if (!match) return null;
  const token = match[1];
  const { url, key } = getSupabasePublicEnv();
  const { resource, clientId } = getMcpConfig();
  // A new, user-scoped client per request. Never use service_role or a browser session.
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await db.auth.getClaims(token);
  if (
    error ||
    !data ||
    !validMcpClaims(data.claims, {
      issuer: `${url}/auth/v1`,
      resource,
      clientId,
    })
  )
    return null;
  const userResult = await db.auth.getUser(token);
  if (userResult.error || userResult.data.user?.id !== data.claims.sub) return null;
  const active = await db.rpc("mcp_session_active");
  if (active.error || active.data !== true) return null;
  const user = userResult.data.user;
  return {
    db,
    userId: user.id,
    clientId,
    actorName:
      typeof user.user_metadata.full_name === "string" ? user.user_metadata.full_name : "Someone",
  };
}

export function authenticationChallenge() {
  return `Bearer resource_metadata="${getMcpConfig().origin}/.well-known/oauth-protected-resource", scope="openid"`;
}
