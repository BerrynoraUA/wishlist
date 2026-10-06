export function getMcpConfig() {
  const origin = process.env.WISHLANE_MCP_ORIGIN;
  const clientId = process.env.WISHLANE_MCP_CLIENT_ID;
  const confirmationSecret = process.env.WISHLANE_MCP_CONFIRMATION_SECRET;
  if (!origin || !clientId || !confirmationSecret || confirmationSecret.length < 32) {
    throw new Error("Wishlane ChatGPT integration is not configured");
  }
  const url = new URL(origin);
  if (url.protocol !== "https:" || url.origin !== origin) {
    throw new Error("WISHLANE_MCP_ORIGIN must be an HTTPS origin without a trailing slash");
  }
  return { origin, clientId, confirmationSecret, resource: `${origin}/api/mcp` };
}

export const WIDGET_URI = "ui://wishlane/cards-v1.html";
