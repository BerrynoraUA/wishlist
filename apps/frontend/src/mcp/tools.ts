import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerAppTool } from "@modelcontextprotocol/ext-apps/server";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { McpContext } from "./auth";
import { getMcpConfig, WIDGET_URI } from "./config";
import { checked, result, ToolError } from "./results";
import { id } from "./schemas";
import { reviewContext, sameParticipants } from "./review";

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

type ToolOptions<S extends z.ZodRawShape> = {
  title: string;
  description: string;
  schema: S;
  readOnly?: boolean;
  confirm?: boolean | ((input: z.output<z.ZodObject<S>>) => boolean);
  openWorld?: boolean;
  idempotent?: boolean;
  run: (input: z.output<z.ZodObject<S>>) => Promise<Record<string, unknown>>;
};

export function createTools(server: McpServer, ctx: McpContext) {
  const actions = new Map<string, (args: unknown) => Promise<Record<string, unknown>>>();
  const { confirmationSecret } = getMcpConfig();

  async function safely(run: () => Promise<CallToolResult>): Promise<CallToolResult> {
    try {
      return await run();
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

  function add<S extends z.ZodRawShape>(name: string, options: ToolOptions<S>) {
    const schema = z.object(options.schema).strict();
    actions.set(name, async (args) => options.run(schema.parse(args)));
    registerAppTool(
      server,
      name,
      {
        title: options.title,
        description: `${options.description}${options.confirm ? " Important changes return a review card; the user must click Confirm to apply them. Never claim a pending change succeeded." : ""}`,
        inputSchema: schema,
        annotations: {
          readOnlyHint: options.readOnly ?? false,
          destructiveHint: Boolean(options.confirm),
          idempotentHint: options.readOnly || options.idempotent || false,
          openWorldHint: options.openWorld ?? false,
        },
        _meta: {
          securitySchemes: [{ type: "oauth2", scopes: ["openid"] }],
          ui: { resourceUri: WIDGET_URI },
          "openai/outputTemplate": WIDGET_URI,
          "openai/widgetAccessible": true,
        },
      },
      async (args: unknown) =>
        safely(async () => {
          const input = schema.parse(args);
          const confirm =
            typeof options.confirm === "function" ? options.confirm(input) : options.confirm;
          if (!confirm) return result(await options.run(input));
          const review = await reviewContext(ctx, input);
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
              .insert({
                user_id: ctx.userId,
                client_id: ctx.clientId,
                tool: name,
                arguments: input,
                review,
              })
              .select("id,expires_at")
              .single(),
          );
          if (!pending) throw new ToolError("Unable to prepare the review card.");
          return {
            ...result({
              kind: "confirmation",
              title: options.title,
              status: "pending",
              selection: review,
              changes: input,
              expires_at: pending.expires_at,
              message:
                "Review these changes and click Confirm in the Wishlane card. Nothing has changed yet.",
            }),
            // The model never sees a usable confirmation capability.
            _meta: {
              confirmation: {
                id: pending.id,
                signature: confirmationSignature(
                  pending.id,
                  ctx.userId,
                  ctx.clientId,
                  confirmationSecret,
                ),
              },
            },
          };
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
      _meta: {
        securitySchemes: [{ type: "oauth2", scopes: ["openid"] }],
        ui: { resourceUri: WIDGET_URI, visibility: ["app"] },
        "openai/visibility": "private",
        "openai/widgetAccessible": true,
      },
    },
    async (input: { id: string; signature: string }) =>
      safely(async () => {
        const expected = confirmationSignature(
          input.id,
          ctx.userId,
          ctx.clientId,
          confirmationSecret,
        );
        if (!validConfirmation(input.signature, expected))
          throw new ToolError("Invalid confirmation. Request a new review card.");
        const row = await checked(
          ctx.db
            .from("mcp_actions")
            .select("tool,arguments,review,status,result,expires_at")
            .eq("id", input.id)
            .eq("user_id", ctx.userId)
            .eq("client_id", ctx.clientId)
            .single(),
        );
        if (!row) throw new ToolError("This review is no longer available.");
        if (Date.parse(row.expires_at) <= Date.now())
          throw new ToolError("This review expired. Request a new review card.");
        if (row.status === "completed") return result(row.result);
        if (row.status !== "pending")
          throw new ToolError(
            "This review was already attempted. Refresh the data before requesting a new change.",
          );
        const run = actions.get(row.tool);
        if (!run) throw new ToolError("This action is no longer supported. Request a new review.");
        if (
          row.tool === "launch_secret_santa" &&
          !sameParticipants(row.review, await reviewContext(ctx, row.arguments))
        )
          throw new ToolError(
            "The participant list changed. Request a new review before drawing names.",
          );
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
          const output = await run(row.arguments);
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

  return { add };
}

export type Tools = ReturnType<typeof createTools>;
