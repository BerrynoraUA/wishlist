import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { authenticateMcp, authenticationChallenge } from "@/mcp/auth";
import { getMcpConfig } from "@/mcp/config";
import { createWishlaneServer } from "@/mcp/server";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(request: Request) {
  let origin: string;
  try {
    origin = getMcpConfig().origin;
  } catch {
    return Response.json({ error: "Wishlane AI integration is not configured." }, { status: 503 });
  }
  const requestOrigin = request.headers.get("origin");
  if (
    requestOrigin &&
    ![origin, "https://chatgpt.com", "https://claude.ai"].includes(requestOrigin)
  )
    return new Response(null, { status: 403 });
  const ctx = await authenticateMcp(request).catch(() => null);
  if (!ctx)
    return new Response(null, {
      status: 401,
      headers: { "WWW-Authenticate": authenticationChallenge(), "Cache-Control": "no-store" },
    });
  const server = createWishlaneServer(ctx);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
    maxRequestBodySize: 8 * 1024 * 1024,
  });
  try {
    await server.connect(transport);
    const response = await transport.handleRequest(request);
    response.headers.set("Cache-Control", "no-store");
    return response;
  } finally {
    await server.close();
  }
}

export async function GET(request: Request) {
  try {
    if (!(await authenticateMcp(request)))
      return new Response(null, {
        status: 401,
        headers: { "WWW-Authenticate": authenticationChallenge() },
      });
  } catch {
    return new Response(null, { status: 503 });
  }
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export const DELETE = GET;
