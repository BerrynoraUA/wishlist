import { getMcpConfig } from "@/mcp/config";
import { getSupabasePublicEnv } from "@wishlist/backend/supabase/shared";

export async function GET() {
  try {
    const { origin, resource } = getMcpConfig();
    return Response.json(
      {
        resource,
        resource_name: "Wishlane",
        authorization_servers: [`${getSupabasePublicEnv().url}/auth/v1`],
        scopes_supported: ["openid"],
        bearer_methods_supported: ["header"],
        resource_policy_uri: `${origin}/privacy-policy`,
        resource_tos_uri: `${origin}/terms-of-service`,
      },
      { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
    );
  } catch {
    return Response.json({ error: "Integration not configured" }, { status: 503 });
  }
}
