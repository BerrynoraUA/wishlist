export type McpClient = { id: string; name: "ChatGPT" | "Claude" };

export function getMcpConfig() {
  const origin = process.env.WISHLANE_MCP_ORIGIN;
  const confirmationSecret = process.env.WISHLANE_MCP_CONFIRMATION_SECRET;
  const clients: McpClient[] = [
    { id: process.env.WISHLANE_MCP_CHATGPT_CLIENT_ID ?? "", name: "ChatGPT" as const },
    { id: process.env.WISHLANE_MCP_CLAUDE_CLIENT_ID ?? "", name: "Claude" as const },
  ].filter((client) => client.id);
  if (!origin || !clients.length || !confirmationSecret || confirmationSecret.length < 32) {
    throw new Error("Wishlane AI integration is not configured");
  }
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin) {
    throw new Error("WISHLANE_MCP_ORIGIN must be an HTTPS origin without a trailing slash");
  }
  return { origin, clients, confirmationSecret, resource: `${origin}/api/mcp` };
}

export function findMcpClient(clientId: unknown) {
  return getMcpConfig().clients.find((client) => client.id === clientId);
}

export const WIDGET_URI = "ui://wishlane/cards-v1.html";
