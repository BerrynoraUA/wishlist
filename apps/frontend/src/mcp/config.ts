/** An AI assistant allowed to connect, identified by its pre-registered Supabase OAuth client. */
export type McpClient = {
  id: string;
  name: "ChatGPT" | "Claude";
  /** Browser origin the assistant may send requests from. */
  origin: string;
  /** Sandbox origin for the widget. Omitted where the host only accepts its own default. */
  widgetDomain?: (origin: string) => string;
};

const ASSISTANTS = [
  {
    env: "WISHLANE_MCP_CHATGPT_CLIENT_ID",
    name: "ChatGPT",
    origin: "https://chatgpt.com",
    widgetDomain: (origin: string) => origin,
  },
  // Claude rejects any ui.domain except its own {hash}.claudemcpcontent.com sandbox.
  { env: "WISHLANE_MCP_CLAUDE_CLIENT_ID", name: "Claude", origin: "https://claude.ai" },
] as const;

export function getMcpConfig() {
  const origin = process.env.WISHLANE_MCP_ORIGIN;
  const confirmationSecret = process.env.WISHLANE_MCP_CONFIRMATION_SECRET;
  const clients: McpClient[] = ASSISTANTS.flatMap(({ env, ...client }) => {
    const id = process.env[env];
    return id ? [{ id, ...client }] : [];
  });
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
