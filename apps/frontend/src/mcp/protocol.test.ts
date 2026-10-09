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
import { errorMessage, ToolError } from "./results";
import { getMcpConfig, type McpClient } from "./config";
import { WIDGET_URI } from "./widget";

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
  const tables: Record<string, Record<string, unknown>[]> = { mcp_actions: [], item: [] };
  const rows = tables.mcp_actions;
  const items = tables.item;
  let inserted = 0;
  const from = vi.fn((table: string) => {
    const store = (tables[table] ??= []);
    let operation = "select";
    let many = true;
    let values: Record<string, unknown> | Record<string, unknown>[] = {};
    const filters: ((row: Record<string, unknown>) => boolean)[] = [];
    const query = {
      select: () => query,
      insert: (value: Record<string, unknown> | Record<string, unknown>[]) => {
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
        if (operation === "insert") {
          const added = (Array.isArray(values) ? values : [values]).map((value) => ({
            id: `10000000-0000-4000-8000-${String(2 + inserted++).padStart(12, "0")}`,
            status: "pending",
            expires_at: new Date(Date.now() + 600000).toISOString(),
            ...value,
          }));
          store.push(...added);
          return Promise.resolve(resolve({ data: many ? added : added[0], error: null }));
        }
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
    data: { id: "list", title: "Birthday", user_id: "alice", can_edit: true } as Record<
      string,
      unknown
    >,
    error: null,
  }));
  const notifier = {
    createLocalizedNotification: vi.fn(async () => {}),
    notifyNewWishlist: vi.fn(async () => {}),
  };
  const bucket = {
    upload: vi.fn(async () => ({ data: {}, error: null })),
    remove: vi.fn(async () => ({ data: {}, error: null })),
    getPublicUrl: () => ({ data: { publicUrl: "https://storage.example/image.webp" } }),
  };
  return {
    ctx: {
      userId: "alice",
      client: getMcpConfig().clients.find((client) => client.name === clientName)!,
      notifier: notifier as unknown as Notifier,
      db: { from, rpc, storage: { from: () => bucket } } as unknown as McpContext["db"],
    } satisfies McpContext,
    tables,
    rows,
    items,
    from,
    rpc,
    notifier,
    bucket,
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
      // List RPCs fetch one row past the page to report has_more.
      expect(rpc).toHaveBeenCalledWith(
        rpcName,
        expect.objectContaining({
          [limitKey]: name === "list_wishlists" ? 51 : 50,
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
    for (const name of ["get_wishlist", "delete_wishlists", "set_gift_status"]) {
      expect(template(name)).toBe(WIDGET_URI);
      expect(resourceUri(name)).toBe(WIDGET_URI);
    }
    for (const name of ["list_friends"]) {
      expect(template(name)).toBeUndefined();
      expect(resourceUri(name)).toBeUndefined();
    }
  });

  it("versions the card URI and still serves the card at earlier URIs", async () => {
    expect(WIDGET_URI).toMatch(/^ui:\/\/wishlane\/cards-[0-9a-f]{12}\.html$/);
    const client = await connect(createWishlaneServer(context().ctx));
    const current = await client.readResource({ uri: WIDGET_URI });
    const earlier = await client.readResource({ uri: "ui://wishlane/cards-v1.html" });
    expect(earlier.contents[0]).toMatchObject({
      uri: "ui://wishlane/cards-v1.html",
      mimeType: current.contents[0].mimeType,
      text: (current.contents[0] as { text: string }).text,
    });
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

  it.each(["reserved", "bought"])(
    "confirms %s before changing gift status or notifying",
    async (status) => {
      const { ctx, items, rpc, notifier } = context();
      const itemId = "20000000-0000-4000-8000-000000000001";
      items.push({ id: itemId, wishlist_id: "list", name: "Mug" });
      const client = await connect(createWishlaneServer(ctx));
      const pending = (await client.callTool({
        name: "set_gift_status",
        arguments: { item_id: itemId, status },
      })) as CallToolResult;
      expect(pending.structuredContent).toMatchObject({
        kind: "confirmation",
        status: "pending",
        selection: {
          wish: "Mug",
          wishlist: "Birthday",
          owner_notification: "On when the gift status changes",
        },
        changes: { status, silent: false },
      });
      expect(rpc).not.toHaveBeenCalledWith("mcp_set_gift_status", expect.anything());
      expect(notifier.createLocalizedNotification).not.toHaveBeenCalled();
      rpc.mockResolvedValueOnce({
        data: { changed: true, owner_id: "bob", wishlist_id: "list" },
        error: null,
      });
      const applied = await client.callTool({
        name: "confirm_action",
        arguments: pending._meta!.confirmation as Record<string, unknown>,
      });
      expect(applied.isError).not.toBe(true);
      expect(rpc).toHaveBeenCalledWith("mcp_set_gift_status", {
        p_item_id: itemId,
        p_status: status === "reserved" ? 1 : 2,
      });
      expect(notifier.createLocalizedNotification).toHaveBeenCalledExactlyOnceWith({
        receiverId: "bob",
        key: status === "reserved" ? "item_reserved" : "item_bought",
        entityId: "list",
      });
    },
  );

  it("confirms secret gift actions without sending an owner notification", async () => {
    const { ctx, items, rpc, notifier } = context();
    const itemId = "20000000-0000-4000-8000-000000000001";
    items.push({ id: itemId, wishlist_id: "list", name: "Mug" });
    const client = await connect(createWishlaneServer(ctx));
    const pending = (await client.callTool({
      name: "set_gift_status",
      arguments: { item_id: itemId, status: "reserved", silent: true },
    })) as CallToolResult;
    expect(pending.structuredContent).toMatchObject({
      status: "pending",
      selection: { owner_notification: "Off (secret action)" },
    });
    rpc.mockResolvedValueOnce({
      data: { changed: true, owner_id: "bob", wishlist_id: "list" },
      error: null,
    });
    const applied = await client.callTool({
      name: "confirm_action",
      arguments: pending._meta!.confirmation as Record<string, unknown>,
    });
    expect(applied.isError).not.toBe(true);
    expect(rpc).toHaveBeenCalledWith("mcp_set_gift_status", { p_item_id: itemId, p_status: 1 });
    expect(notifier.createLocalizedNotification).not.toHaveBeenCalled();
  });

  it("releases a gift without requesting confirmation", async () => {
    const { ctx, rpc, rows, notifier } = context();
    const itemId = "20000000-0000-4000-8000-000000000001";
    rpc.mockResolvedValueOnce({ data: { changed: true }, error: null });
    const client = await connect(createWishlaneServer(ctx));
    const output = await client.callTool({
      name: "set_gift_status",
      arguments: { item_id: itemId, status: "available" },
    });
    expect(output.isError).not.toBe(true);
    expect(output.structuredContent).toMatchObject({ status: "available" });
    expect(rows).toHaveLength(0);
    expect(rpc).toHaveBeenCalledWith("mcp_set_gift_status", { p_item_id: itemId, p_status: 0 });
    expect(notifier.createLocalizedNotification).not.toHaveBeenCalled();
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

  it("creates a friends wishlist with its wishes at once, reviewing only public lists", async () => {
    const { ctx, tables, items, notifier } = context();
    const client = await connect(createWishlaneServer(ctx));
    const created = (await client.callTool({
      name: "create_wishlist",
      arguments: {
        title: "Birthday",
        items: [{ name: "Mug", priority: "starred" }, { name: "Book" }],
      },
    })) as CallToolResult;
    expect(created.structuredContent).toMatchObject({
      kind: "wishlists",
      message: "Added 2 wishes.",
    });
    expect(tables.wishlist).toMatchObject([
      { title: "Birthday", visibility_type: 1, user_id: "alice" },
    ]);
    expect(items).toMatchObject([
      { name: "Mug", priority_id: "11111111-0000-0000-0000-000000000011" },
      { name: "Book" },
    ]);
    expect(items[1]).not.toHaveProperty("priority_id");
    expect(notifier.notifyNewWishlist).toHaveBeenCalledOnce();
    const pending = (await client.callTool({
      name: "create_wishlist",
      arguments: { title: "Everyone", visibility: "public" },
    })) as CallToolResult;
    expect(pending.structuredContent).toMatchObject({ kind: "confirmation", status: "pending" });
    expect(tables.wishlist).toHaveLength(1);
  });

  it("reports has_more instead of leaving a full page ambiguous", async () => {
    const { ctx } = context();
    const rpc = vi.fn(async () => ({ data: [{ id: "a" }, { id: "b" }, { id: "c" }], error: null }));
    ctx.db = { ...ctx.db, rpc } as unknown as McpContext["db"];
    const client = await connect(createWishlaneServer(ctx));
    const output = (await client.callTool({
      name: "list_wishlists",
      arguments: { limit: 2 },
    })) as CallToolResult;
    expect(output.structuredContent).toMatchObject({
      wishlists: [{ id: "a" }, { id: "b" }],
      has_more: true,
    });
  });

  it("changes access for several people and groups with one review", async () => {
    const { ctx, tables, rpc, notifier } = context();
    const anna = "30000000-0000-4000-8000-000000000001";
    const family = "30000000-0000-4000-8000-000000000002";
    tables.profiles = [{ id: anna, nickname: "anna" }];
    tables.friend_groups = [{ id: family, name: "Family", user_id: "alice" }];
    const client = await connect(createWishlaneServer(ctx));
    const pending = (await client.callTool({
      name: "set_wishlist_access",
      arguments: {
        wishlist_id: "40000000-0000-4000-8000-000000000001",
        grants: [
          { target: "user", target_id: anna, role: "editor" },
          { target: "group", target_id: family, role: "viewer" },
        ],
      },
    })) as CallToolResult;
    expect(pending.structuredContent).toMatchObject({
      selection: { wishlist: "Birthday", access: ["@anna: Editor", "Family (group): Viewer"] },
    });
    expect(rpc).not.toHaveBeenCalledWith("grant_wishlist_access", expect.anything());
    await client.callTool({
      name: "confirm_action",
      arguments: pending._meta!.confirmation as Record<string, unknown>,
    });
    expect(rpc).toHaveBeenCalledWith("grant_wishlist_access", {
      p_wishlist_id: "40000000-0000-4000-8000-000000000001",
      p_granted_to_user_id: anna,
      p_access_type: 1,
    });
    expect(rpc).toHaveBeenCalledWith("grant_wishlist_group_access", {
      p_wishlist_id: "40000000-0000-4000-8000-000000000001",
      p_group_id: family,
    });
    expect(notifier.createLocalizedNotification).toHaveBeenCalledOnce();
  });

  it("answers friend requests the user asked about without a review card", async () => {
    const { ctx, rpc } = context();
    const requestIds = [1, 2].map((n) => `50000000-0000-4000-8000-00000000000${n}`);
    const client = await connect(createWishlaneServer(ctx));
    const output = (await client.callTool({
      name: "respond_to_friend_requests",
      arguments: { request_ids: requestIds, response: "accept" },
    })) as CallToolResult;
    expect(output.structuredContent).toMatchObject({ message: "Accepted 2 friend requests." });
    for (const id of requestIds)
      expect(rpc).toHaveBeenCalledWith("accept_friend_request", { p_request_id: id });
  });

  it("never applies a review the user cancelled", async () => {
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
    const capability = output._meta!.confirmation as Record<string, unknown>;
    expect(
      (await client.callTool({ name: "cancel_action", arguments: capability })).isError,
    ).not.toBe(true);
    expect(rows[0].status).toBe("cancelled");
    const applied = (await client.callTool({
      name: "confirm_action",
      arguments: capability,
    })) as CallToolResult;
    expect(applied.isError).toBe(true);
    expect(JSON.stringify(applied.content)).toContain("cancelled");
    expect(run).not.toHaveBeenCalled();
  });

  it("refuses chat attachments that point at a private network", async () => {
    const { ctx, items, bucket } = context();
    const itemId = "20000000-0000-4000-8000-000000000001";
    items.push({ id: itemId, wishlist_id: "list", name: "Mug" });
    const client = await connect(createWishlaneServer(ctx));
    const output = await client.callTool({
      name: "attach_wish_image",
      arguments: {
        item_id: itemId,
        image: { download_url: "https://127.0.0.1/secret.png", file_id: "file_1" },
      },
    });
    expect(output.isError).toBe(true);
    expect(bucket.upload).not.toHaveBeenCalled();
  });

  it("explains known database failures instead of a generic error", () => {
    expect(
      errorMessage({
        code: "P0001",
        message: "You can have up to 3 starred items in one wishlist",
      }),
    ).toBe("You can have up to 3 starred items in one wishlist");
    expect(errorMessage({ code: "23505", message: "duplicate key" })).toContain("already exists");
    expect(errorMessage({ code: "XX000", message: "internal detail" })).not.toContain("internal");
  });
});
