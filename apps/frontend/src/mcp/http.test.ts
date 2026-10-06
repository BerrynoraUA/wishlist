import { afterEach, describe, expect, it, vi } from "vitest";

const client = vi.hoisted(() => ({ auth: { getClaims: vi.fn() }, rpc: vi.fn() }));
vi.mock("@supabase/supabase-js", () => ({ createClient: () => client }));
import { POST, GET } from "@/app/api/mcp/route";
import { GET as metadata } from "@/app/.well-known/oauth-protected-resource/route";

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});
const resource = "https://wishlane.example/api/mcp";
function request(body: unknown, authorization?: string, origin?: string) {
  return new Request(resource, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(authorization ? { Authorization: authorization } : {}),
      ...(origin ? { Origin: origin } : {}),
    },
    body: JSON.stringify(body),
  });
}
function authenticate(active = true, clientId = process.env.WISHLANE_MCP_CHATGPT_CLIENT_ID) {
  client.auth.getClaims.mockResolvedValue({
    data: {
      claims: {
        sub: "alice",
        iss: "https://example.supabase.co/auth/v1",
        aud: resource,
        role: "authenticated",
        client_id: clientId,
        exp: Date.now() / 1000 + 3600,
        user_metadata: { full_name: "Alice" },
      },
    },
    error: null,
  });
  client.rpc.mockResolvedValue({ data: active, error: null });
}

describe("Streamable HTTP endpoint", () => {
  it("requires OAuth even for initialization and GET discovery", async () => {
    for (const response of [
      await POST(request({ method: "initialize" })),
      await GET(new Request(resource)),
    ]) {
      expect(response.status).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain(
        "/.well-known/oauth-protected-resource",
      );
    }
    expect(client.auth.getClaims).not.toHaveBeenCalled();
  });
  it("publishes matching protected resource metadata without login", async () => {
    const response = await metadata();
    expect(await response.json()).toMatchObject({
      resource,
      authorization_servers: ["https://example.supabase.co/auth/v1"],
      scopes_supported: ["openid"],
    });
  });
  it("fails closed when unconfigured", async () => {
    vi.stubEnv("WISHLANE_MCP_CHATGPT_CLIENT_ID", "");
    vi.stubEnv("WISHLANE_MCP_CLAUDE_CLIENT_ID", "");
    expect((await POST(request({}))).status).toBe(503);
  });
  it("rejects unrelated browser origins", async () => {
    expect((await POST(request({}, "Bearer token", "https://attacker.example"))).status).toBe(403);
  });
  it("rejects invalid signatures and revoked OAuth sessions", async () => {
    client.auth.getClaims.mockResolvedValue({ data: null, error: new Error("Invalid signature") });
    expect((await POST(request({}, "Bearer forged"))).status).toBe(401);
    authenticate(false);
    expect((await POST(request({}, "Bearer revoked"))).status).toBe(401);
  });
  it("serves real MCP initialization and tools/list over stateless HTTP", async () => {
    authenticate();
    const initialized = await POST(
      request(
        {
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-11-25",
            capabilities: {},
            clientInfo: { name: "test", version: "1" },
          },
        },
        "Bearer token",
      ),
    );
    expect(initialized.status).toBe(200);
    expect((await initialized.json()).result.serverInfo.name).toBe("wishlane");
    const response = await POST(
      request({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }, "Bearer token"),
    );
    expect(response.status).toBe(200);
    expect((await response.json()).result.tools.length).toBeGreaterThan(40);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });
  it("serves Claude's OAuth client and rejects unknown clients", async () => {
    const list = { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} };
    authenticate(true, process.env.WISHLANE_MCP_CLAUDE_CLIENT_ID);
    expect((await POST(request(list, "Bearer token", "https://claude.ai"))).status).toBe(200);
    authenticate(true, "10000000-0000-4000-8000-00000000ffff");
    expect((await POST(request(list, "Bearer token"))).status).toBe(401);
  });
});
