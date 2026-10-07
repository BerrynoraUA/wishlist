import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpContext } from "./auth";
import { getMcpConfig, WIDGET_URI } from "./config";
import { imageSources } from "./image-proxy";
import { checked, result, ToolError } from "./results";
import { id } from "./schemas";
import type { Review } from "./review";

export function confirmationSignature(
  id: string,
  userId: string,
  clientId: string,
  secret: string,
) {
  return createHmac("sha256", secret).update(`${id}:${userId}:${clientId}`).digest("hex");
}

export function validConfirmation(signature: string, expected: string) {
  return (
    /^[a-f0-9]{64}$/.test(signature) &&
    timingSafeEqual(Buffer.from(signature, "hex"), Buffer.from(expected, "hex"))
  );
}

/** An important change the user must approve in a review card before it runs. */
type Confirmation<I> = {
  /** Ask for confirmation only when this holds. Defaults to always. */
  when?: (input: I) => boolean;
  /**
   * Server-resolved names of the records the change targets. Omit only when the input itself
   * names everything (e.g. creating a record).
   */
  review?: (input: I) => Promise<Review>;
  /** Runs again at confirm time; throw a ToolError if the reviewed selection changed. */
  recheck?: (reviewed: Review, input: I) => Promise<void>;
};

type ToolOptions<S extends z.ZodRawShape, I = z.output<z.ZodObject<S>>> = {
  title: string;
  description: string;
  schema: S;
  readOnly?: boolean;
  openWorld?: boolean;
  idempotent?: boolean;
  /** Callable only from the Wishlane card, never offered to the model. */
  appOnly?: boolean;
  /** The result renders in the Wishlane card. Review cards always do. */
  view?: boolean;
  /** Top-level inputs ChatGPT fills with files the user attached to the chat. */
  fileParams?: string[];
  confirm?: Confirmation<I>;
  run: (input: I) => Promise<Record<string, unknown>>;
};

type ConfirmableAction = {
  run: (args: unknown) => Promise<Record<string, unknown>>;
  recheck?: (reviewed: Review, args: unknown) => Promise<void>;
};

// Tools without a view answer in plain text; the card is only for results it can present.
function toolMeta({ appOnly = false, view = false, fileParams = [] as string[] }) {
  return {
    securitySchemes: [{ type: "oauth2", scopes: ["openid"] }],
    ...(fileParams.length && { "openai/fileParams": fileParams }),
    ...(appOnly && { ui: { visibility: ["app"] }, "openai/visibility": "private" }),
    ...(view && { ui: { resourceUri: WIDGET_URI }, "openai/outputTemplate": WIDGET_URI }),
    "openai/widgetAccessible": true,
  };
}

async function safely(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
  try {
    const output = await run();
    // Only the card needs these addresses, so they travel in _meta, hidden from the model.
    const sources = imageSources(output.structuredContent);
    return sources ? { ...output, _meta: { ...output._meta, imageSources: sources } } : output;
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text:
            error instanceof ToolError
              ? error.message
              : "Wishlane could not complete the request. Refresh the relevant data before retrying.",
        },
      ],
    };
  }
}

export function createTools(server: McpServer, ctx: McpContext) {
  const actions = new Map<string, ConfirmableAction>();
  const { confirmationSecret } = getMcpConfig();
  const sign = (actionId: string) =>
    confirmationSignature(actionId, ctx.userId, ctx.client.id, confirmationSecret);

  async function requestConfirmation(tool: string, title: string, input: unknown, review: Review) {
    await checked(
      ctx.db
        .from("mcp_actions")
        .delete()
        .eq("user_id", ctx.userId)
        .lt("expires_at", new Date().toISOString()),
    );
    const pending = await checked(
      ctx.db
        .from("mcp_actions")
        .insert({ user_id: ctx.userId, client_id: ctx.client.id, tool, arguments: input, review })
        .select("id,expires_at")
        .single(),
    );
    if (!pending) throw new ToolError("Unable to prepare the review card.");
    return {
      ...result({
        kind: "confirmation",
        tool,
        title,
        status: "pending",
        selection: review,
        changes: input,
        expires_at: pending.expires_at,
        message:
          "Review these changes and click Confirm in the Wishlane card. Nothing has changed yet.",
      }),
      // The model never sees a usable confirmation capability.
      _meta: { confirmation: { id: pending.id, signature: sign(pending.id) } },
    };
  }

  function add<S extends z.ZodRawShape>(name: string, options: ToolOptions<S>) {
    const schema = z.object(options.schema).strict();
    const { confirm } = options;
    const recheck = confirm?.recheck;
    actions.set(name, {
      run: (args) => options.run(schema.parse(args)),
      recheck: recheck && ((reviewed, args) => recheck(reviewed, schema.parse(args))),
    });
    registerAppTool(
      server,
      name,
      {
        title: options.title,
        description: `${options.description}${confirm ? " Important changes return a review card; the user must click Confirm to apply them. Never claim a pending change succeeded." : ""}`,
        inputSchema: schema,
        annotations: {
          readOnlyHint: options.readOnly ?? false,
          destructiveHint: Boolean(confirm),
          idempotentHint: options.readOnly || options.idempotent || false,
          openWorldHint: options.openWorld ?? false,
        },
        _meta: toolMeta({
          appOnly: options.appOnly,
          view: options.view || Boolean(confirm),
          fileParams: options.fileParams,
        }),
      },
      async (args: unknown) =>
        safely(async () => {
          const input = schema.parse(args);
          if (!confirm || !(confirm.when?.(input) ?? true)) return result(await options.run(input));
          const review = (await confirm.review?.(input)) ?? {};
          return requestConfirmation(name, options.title, input, review);
        }),
    );
  }

  registerAppTool(
    server,
    "confirm_action",
    {
      title: "Confirm Wishlane change",
      description:
        "Apply the exact change reviewed and explicitly confirmed by the user in the Wishlane card.",
      inputSchema: { id, signature: z.string().regex(/^[a-f0-9]{64}$/) },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
      _meta: toolMeta({ appOnly: true }),
    },
    async (input: { id: string; signature: string }) =>
      safely(async () => {
        if (!validConfirmation(input.signature, sign(input.id)))
          throw new ToolError("Invalid confirmation. Request a new review card.");
        const row = await checked(
          ctx.db
            .from("mcp_actions")
            .select("tool,arguments,review,status,result,expires_at")
            .eq("id", input.id)
            .eq("user_id", ctx.userId)
            .eq("client_id", ctx.client.id)
            .single(),
        );
        if (!row) throw new ToolError("This review is no longer available.");
        if (Date.parse(row.expires_at) <= Date.now())
          throw new ToolError("This review expired. Request a new review card.");
        if (row.status === "completed") return result(row.result);
        if (row.status === "cancelled")
          throw new ToolError("This review was cancelled. Nothing was changed.");
        if (row.status !== "pending")
          throw new ToolError(
            "This review was already attempted. Refresh the data before requesting a new change.",
          );
        const action = actions.get(row.tool);
        if (!action)
          throw new ToolError("This action is no longer supported. Request a new review.");
        await action.recheck?.(row.review, row.arguments);
        // Atomic claim prevents double clicks, parallel requests and retries from applying twice.
        const claimed = await checked(
          ctx.db
            .from("mcp_actions")
            .update({ status: "executing" })
            .eq("id", input.id)
            .eq("status", "pending")
            .gt("expires_at", new Date().toISOString())
            .select("id")
            .maybeSingle(),
        );
        if (!claimed)
          throw new ToolError(
            "This change is already being processed. Refresh to check its result.",
          );
        try {
          const output = await action.run(row.arguments);
          await checked(
            ctx.db
              .from("mcp_actions")
              .update({ status: "completed", result: output, arguments: {} })
              .eq("id", input.id),
          );
          return result(output);
        } catch (error) {
          await ctx.db
            .from("mcp_actions")
            .update({ status: "failed", arguments: {} })
            .eq("id", input.id);
          throw error;
        }
      }),
  );

  registerAppTool(
    server,
    "cancel_action",
    {
      title: "Cancel Wishlane change",
      description: "Discard a pending change the user cancelled in the Wishlane card.",
      inputSchema: { id, signature: z.string().regex(/^[a-f0-9]{64}$/) },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
      _meta: toolMeta({ appOnly: true }),
    },
    async (input: { id: string; signature: string }) =>
      safely(async () => {
        if (!validConfirmation(input.signature, sign(input.id)))
          throw new ToolError("Invalid confirmation. Request a new review card.");
        // Only a pending review can be cancelled; a change already applied stays applied.
        const cancelled = await checked(
          ctx.db
            .from("mcp_actions")
            .update({ status: "cancelled", arguments: {} })
            .eq("id", input.id)
            .eq("user_id", ctx.userId)
            .eq("client_id", ctx.client.id)
            .eq("status", "pending")
            .select("id")
            .maybeSingle(),
        );
        if (!cancelled)
          throw new ToolError("This review was already handled. Refresh to check its result.");
        return result({
          kind: "confirmation",
          status: "cancelled",
          message: "Nothing was changed.",
        });
      }),
  );

  return { add };
}

export type Tools = ReturnType<typeof createTools>;
