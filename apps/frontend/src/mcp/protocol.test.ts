import { afterEach, describe, expect, it, vi } from "vitest";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpContext } from "./auth";
import type { Notifier } from "@wishlist/backend/notifications/notifier";
import { createTools } from "./tools";
import { createWishlaneServer } from "./server";
import { ToolError } from "./results";
import { getMcpConfig, WIDGET_URI, type McpClient } from "./config";

const close: (() => Promise<void>)[] = [];
afterEach(async () => {
  await Promise.all(close.splice(0).map((fn) => fn()));
});

async function connect(server: McpServer) {
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);
  const client = new Client({ name: "test", version: "1" });
  await client.connect(clientTransport);
  close.push(
    () => client.close(),
    () => server.close(),
  );
  return client;
}

function context(clientName: McpClient["name"] = "ChatGPT") {
  const rows: Record<string, unknown>[] = [];
  const items: Record<string, unknown>[] = [];
  const from = vi.fn((table: string) => {
    const store = table === "item" ? items : rows;
    let operation = "select";
    let many = true;
    let values: Record<string, unknown> = {};
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    const query = {
      select: () => query,
      insert: (value: Record<string, unknown>) => {
        operation = "insert";
        values = value;
        return query;
      },
      update: (value: Record<string, unknown>) => {
        operation = "update";
        values = value;
        return query;
      },
      delete: () => {
        operation = "delete";
        return query;
      },
      eq: (key: string, value: unknown) => {
        filters.push((row) => row[key] === value);
        return query;
      },
      lt: (key: string, value: string) => {
        filters.push((row) => String(row[key]) < value);
        return query;
      },
      gt: (key: string, value: string) => {
        filters.push((row) => String(row[key]) > value);
        return query;
      },
      in: (key: string, values: unknown[]) => {
        filters.push((row) => values.includes(row[key]));
        return query;
      },
      single: () => {
        many = false;
        return query;
      },
      maybeSingle: () => {
        many = false;
        return query;
      },
      then: (resolve: (value: { data: unknown; error: null }) => unknown) => {
        if (operation === "insert")
          store.push({
            id: "10000000-0000-4000-8000-000000000002",
            status: "pending",
            expires_at: new Date(Date.now() + 600000).toISOString(),
            ...values,
          });
        const matches = store.filter((row) => filters.every((fn) => fn(row)));
        for (const row of matches) {
          if (operation === "update") Object.assign(row, values);
          if (operation === "delete") store.splice(store.indexOf(row), 1);
        }
        const data = many && operation === "select" ? matches : (matches[0] ?? null);
        return Promise.resolve(resolve({ data, error: null }));
      },
    };
    return query;
  });
  // Every wishlist the tests touch is Alice's.
  const rpc = vi.fn(async () => ({
    data: { id: "list", title: "Birthday", user_id: "alice", can_edit: true },
    error: null,
  }));
  return {
    ctx: {
      userId: "alice",
      client: getMcpConfig().clients.find((client) => client.name === clientName)!,
      notifier: {} as Notifier,
      db: { from, rpc } as unknown as McpContext["db"],
    } satisfies McpContext,
    rows,
    items,
    from,
  };
}

describe("MCP tools and resources", () => {
  it.each([
    ["list_wishlists", "get_my_wishlists_feed", "p_take"],
    ["list_secret_santa_events", "list_secret_santa_events", "p_limit"],
  ])(
    "caps oversized pages for %s before querying the database",
    async (name, rpcName, limitKey) => {
      const { ctx } = context();
      const rpc = vi.fn(async () => ({ data: [], error: null }));
      ctx.db = { ...ctx.db, rpc } as unknown as McpContext["db"];
      const client = await connect(createWishlaneServer(ctx));
      const output = await client.callTool({ name, arguments: { limit: 100, offset: 50 } });
      expect(output.isError).not.toBe(true);
      expect(rpc).toHaveBeenCalledWith(
        rpcName,
        expect.objectContaining({
          [limitKey]: 50,
          ...(name === "list_wishlists" ? { p_skip: 50 } : { p_offset: 50 }),
        }),
      );
    },
  );

  it("publishes authenticated domain tools and a restrictive self-contained UI", async () => {
    const { ctx } = context();
    const client = await connect(createWishlaneServer(ctx));
    const { tools } = await client.listTools();
    expect(tools.length).toBeGreaterThan(40);
    expect(tools.map((tool) => tool.name)).not.toEqual(
      expect.arrayContaining(["execute_sql", "delete_account", "get_billing"]),
    );
    for (const tool of tools)
      expect(tool._meta?.securitySchemes).toEqual([{ type: "oauth2", scopes: ["openid"] }]);
    expect(tools.find((tool) => tool.name === "confirm_action")?._meta?.ui).toMatchObject({
      visibility: ["app"],
    });
    const resource = await client.readResource({ uri: WIDGET_URI });
    expect(resource.contents[0].mimeType).toBe("text/html;profile=mcp-app");
    const html = "text" in resource.contents[0] ? resource.contents[0].text : "";
    expect(html).toContain("ui/initialize");
    expect(html).not.toContain("__WISHLANE_CONFIG__");
    expect(resource.contents[0]._meta?.ui).toMatchObject({
      csp: { connectDomains: [] },
      domain: "https://wishlane.example",
    });
  });

  it("opens the card only for results it can present", async () => {
    const client = await connect(createWishlaneServer(context().ctx));
    const { tools } = await client.listTools();
    const template = (name: string) =>
      tools.find((tool) => tool.name === name)?._meta?.["openai/outputTemplate"];
    const resourceUri = (name: string) =>
      (tools.find((tool) => tool.name === name)?._meta?.ui as { resourceUri?: string })
        ?.resourceUri;
    for (const name of ["get_wishlist", "delete_wishlists"]) {
      expect(template(name)).toBe(WIDGET_URI);
      expect(resourceUri(name)).toBe(WIDGET_URI);
    }
    for (const name of ["list_friends", "set_gift_status"]) {
      expect(template(name)).toBeUndefined();
      expect(resourceUri(name)).toBeUndefined();
    }
  });

  it("leaves Claude on its default widget sandbox origin", async () => {
    const client = await connect(createWishlaneServer(context("Claude").ctx));
    const resource = await client.readResource({ uri: WIDGET_URI });
    expect(resource.contents[0]._meta?.ui).not.toMatchObject({ domain: expect.anything() });
  });

  it("validates tool input before database access", async () => {
    const { ctx, from } = context();
    const client = await connect(createWishlaneServer(ctx));
    const output = await client.callTool({
      name: "delete_wishes",
      arguments: { item_ids: ["not-a-uuid"] },
    });
    expect(output.isError).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("reviews and deletes several wishes with one confirmation", async () => {
    const { ctx, items } = context();
    const itemIds = [1, 2, 3].map((n) => `20000000-0000-4000-8000-00000000000${n}`);
    items.push(
      ...itemIds.map((id, index) => ({ id, wishlist_id: "list", name: `Gift ${index + 1}` })),
      { id: "20000000-0000-4000-8000-000000000009", wishlist_id: "list", name: "Keep" },
    );
    const client = await connect(createWishlaneServer(ctx));
    const pending = (await client.callTool({
      name: "delete_wishes",
      arguments: { item_ids: itemIds },
    })) as CallToolResult;
    expect(pending.structuredContent).toMatchObject({
      status: "pending",
      selection: { wishes: ["Gift 1", "Gift 2", "Gift 3"], wishlist: "Birthday" },
    });
    expect(items).toHaveLength(4);
    const applied = await client.callTool({
      name: "confirm_action",
      arguments: pending._meta!.confirmation as Record<string, unknown>,
    });
    expect(applied.isError).not.toBe(true);
    expect(items.map((item) => item.name)).toEqual(["Keep"]);
  });

  it("reviews a single wish without bulk wording", async () => {
    const { ctx, items } = context();
    const itemId = "20000000-0000-4000-8000-000000000001";
    items.push({ id: itemId, wishlist_id: "list", name: "Mug" });
    const client = await connect(createWishlaneServer(ctx));
    const pending = (await client.callTool({
      name: "delete_wishes",
      arguments: { item_ids: [itemId] },
    })) as CallToolResult;
    expect(pending.structuredContent).toMatchObject({
      selection: { wish: "Mug", wishlist: "Birthday" },
    });
    const applied = (await client.callTool({
      name: "confirm_action",
      arguments: pending._meta!.confirmation as Record<string, unknown>,
    })) as CallToolResult;
    expect(applied.structuredContent).toMatchObject({ message: "Deleted 1 item." });
    expect(items).toHaveLength(0);
  });

  it("rejects a bulk change that lists a record twice", async () => {
    const { ctx, from } = context();
    const client = await connect(createWishlaneServer(ctx));
    const itemId = "20000000-0000-4000-8000-000000000001";
    const output = await client.callTool({
      name: "delete_wishes",
      arguments: { item_ids: [itemId, itemId] },
    });
    expect(output.isError).toBe(true);
    expect(from).not.toHaveBeenCalled();
  });

  it("previews without executing, then applies the approved change at most once", async () => {
    const { ctx } = context();
    const server = new McpServer({ name: "test", version: "1" });
    const run = vi.fn(async () => ({ message: "Changed" }));
    createTools(server, ctx).add("important_change", {
      title: "Change",
      description: "Test",
      schema: { name: z.string() },
      confirm: { review: async ({ name }) => ({ target: `Resolved ${name}` }) },
      run,
    });
    const client = await connect(server);
    const pending = (await client.callTool({
      name: "important_change",
      arguments: { name: "Exact original change" },
    })) as CallToolResult;
    expect(pending.structuredContent).toMatchObject({
      status: "pending",
      selection: { target: "Resolved Exact original change" },
    });
    expect(JSON.stringify(pending.content)).not.toContain("signature");
    expect(run).not.toHaveBeenCalled();
    const confirmation = pending._meta!.confirmation as Record<string, unknown>;
    const applied = await client.callTool({ name: "confirm_action", arguments: confirmation });
    expect(applied.isError).not.toBe(true);
    expect(run).toHaveBeenCalledExactlyOnceWith({ name: "Exact original change" });
    await client.callTool({ name: "confirm_action", arguments: confirmation });
    expect(run).toHaveBeenCalledTimes(1);
  });

  it("rejects forged, expired and cross-user confirmation requests", async () => {
    const { ctx, rows } = context();
    const server = new McpServer({ name: "test", version: "1" });
    const run = vi.fn(async () => ({ message: "Changed" }));
    createTools(server, ctx).add("important_change", {
      title: "Change",
      description: "Test",
      schema: {},
      confirm: {},
      run,
    });
    const client = await connect(server);
    const output = (await client.callTool({
      name: "important_change",
      arguments: {},
    })) as CallToolResult;
    const capability = output._meta!.confirmation as { id: string; signature: string };
    expect(
      (
        await client.callTool({
          name: "confirm_action",
          arguments: { ...capability, signature: "0".repeat(64) },
        })
      ).isError,
    ).toBe(true);
    ctx.userId = "bob";
    expect((await client.callTool({ name: "confirm_action", arguments: capability })).isError).toBe(
      true,
    );
    ctx.userId = "alice";
    rows[0].expires_at = new Date(0).toISOString();
    expect((await client.callTool({ name: "confirm_action", arguments: capability })).isError).toBe(
      true,
    );
    expect(run).not.toHaveBeenCalled();
  });

  it("re-validates the reviewed selection before applying a confirmed change", async () => {
    const { ctx } = context();
    const server = new McpServer({ name: "test", version: "1" });
    const run = vi.fn(async () => ({ message: "Changed" }));
    let changed = false;
    createTools(server, ctx).add("important_change", {
      title: "Change",
      description: "Test",
      schema: {},
      confirm: {
        recheck: async () => {
          if (changed) throw new ToolError("The selection changed.");
        },
      },
      run,
    });
    const client = await connect(server);
    const output = (await client.callTool({
      name: "important_change",
      arguments: {},
    })) as CallToolResult;
    changed = true;
    const applied = (await client.callTool({
      name: "confirm_action",
      arguments: output._meta!.confirmation as Record<string, unknown>,
    })) as CallToolResult;
    expect(applied.isError).toBe(true);
    expect(JSON.stringify(applied.content)).toContain("The selection changed.");
    expect(run).not.toHaveBeenCalled();
  });
});
