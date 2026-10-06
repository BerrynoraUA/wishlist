import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@wishlist/backend/supabase/shared";
import type { WishlistSupabaseClient } from "@wishlist/backend/supabase";
import { createNotifier, type Notifier } from "@wishlist/backend/notifications/notifier";
import { getMcpConfig, type McpClient } from "./config";

export type McpContext = {
  db: WishlistSupabaseClient;
  userId: string;
  client: McpClient;
  notifier: Notifier;
};

export function validMcpClaims(
  claims: Record<string, unknown>,
  expected: { issuer: string; resource: string; clientIds: string[] },
  now = Math.floor(Date.now() / 1000),
) {
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  return (
    claims.iss === expected.issuer &&
    audiences.includes(expected.resource) &&
    typeof claims.client_id === "string" &&
    expected.clientIds.includes(claims.client_id) &&
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
  const { resource, clients } = getMcpConfig();
  // A new, user-scoped client per request. Never use service_role or a browser session.
  const db = createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await db.auth.getClaims(token);
  if (error || !data) return null;
  const { claims } = data;
  if (
    !validMcpClaims(claims, {
      issuer: `${url}/auth/v1`,
      resource,
      clientIds: clients.map((c) => c.id),
    })
  )
    return null;
  // The signature is verified above; this checks the OAuth grant is still live, so a
  // disconnected (or deleted) account is rejected before its token expires.
  const active = await db.rpc("mcp_session_active");
  if (active.error || active.data !== true) return null;
  const client = clients.find((value) => value.id === claims.client_id);
  if (!client) return null;
  const fullName = claims.user_metadata?.full_name;
  const actorName = typeof fullName === "string" ? fullName : "Someone";
  return {
    db,
    userId: claims.sub,
    client,
    notifier: createNotifier(db, {
      log: (message) => console.error(`[mcp] ${message}`),
      actorName: async () => actorName,
    }),
  };
}

export function authenticationChallenge() {
  return `Bearer resource_metadata="${getMcpConfig().origin}/.well-known/oauth-protected-resource", scope="openid"`;
}
