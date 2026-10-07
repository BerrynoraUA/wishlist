import { z } from "zod";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { checked, safeItem, ToolError } from "./results";
import { id, page, search, wishlistFields } from "./schemas";
import { getMcpConfig } from "./config";
import { requireWishlist } from "./access";
import { groupReview, peopleReview, wishlistReview } from "./review";

export function wishlistTools(tools: Tools, ctx: McpContext) {
  const { db } = ctx;
  tools.add("list_wishlists", {
    title: "Browse wishlists",
    description:
      "List your wishlists, discover public wishlists, or browse a friend's accessible wishlists. Use IDs from results in subsequent tools.",
    schema: {
      ...search,
      view: z.enum(["mine", "public", "friend"]).default("mine"),
      friend_id: id.optional(),
    },
    readOnly: true,
    view: true,
    run: async (input) => {
      let lists;
      if (input.view === "public") {
        let query = db
          .from("wishlist")
          .select(
            "id,title,description,image_url,event_date,visibility_type,accent_type,user_id,is_pinned",
          )
          .eq("visibility_type", 0)
          .neq("user_id", ctx.userId);
        if (input.search) query = query.ilike("title", `%${input.search}%`);
        lists = await checked(
          query
            .order("created_at", { ascending: false })
            .range(input.offset, input.offset + input.limit - 1),
        );
      } else {
        if (input.view === "friend" && !input.friend_id)
          throw new ToolError("Select a friend first.");
        lists = await checked(
          db.rpc(input.view === "mine" ? "get_my_wishlists_feed" : "get_friend_wishlists", {
            p_skip: input.offset,
            p_take: input.limit,
            p_search: input.search ?? null,
            p_sort: "newest",
            ...(input.view === "friend" ? { p_friend_user_id: input.friend_id } : {}),
          }),
        );
      }
      return {
        kind: "wishlists",
        wishlists: lists ?? [],
        offset: input.offset,
        limit: input.limit,
      };
    },
  });
  tools.add("get_wishlist", {
    title: "View wishlist",
    description:
      "Get an accessible wishlist and a page of wishes. Reservation identities are never exposed; other people's gifts remain hidden from the owner.",
    schema: {
      wishlist_id: id,
      ...search,
      sort: z
        .enum([
          "newest",
          "oldest",
          "price-low",
          "price-high",
          "name-asc",
          "name-desc",
          "priority-high",
          "priority-low",
          "default",
        ])
        .default("default"),
      priority_ids: z.array(id).max(4).optional(),
      price_min: z.number().nonnegative().optional(),
      price_max: z.number().nonnegative().optional(),
    },
    readOnly: true,
    view: true,
    run: async (input) => {
      const wishlist = await requireWishlist(ctx, input.wishlist_id);
      const rows = await checked(
        db.rpc("get_wishlist_items", {
          p_wishlist_id: input.wishlist_id,
          p_skip: input.offset,
          p_take: input.limit,
          p_search: input.search ?? null,
          p_sort: input.sort,
          p_priorities: input.priority_ids ?? null,
          p_price_min: input.price_min ?? null,
          p_price_max: input.price_max ?? null,
        }),
      );
      return {
        kind: "items",
        wishlist,
        items: (rows ?? []).map((row: Record<string, unknown>) =>
          safeItem(row, ctx.userId, wishlist.user_id),
        ),
        offset: input.offset,
        limit: input.limit,
      };
    },
  });
  tools.add("create_wishlist", {
    title: "Create wishlist",
    description:
      "Create a wishlist. Visibility: 0 public, 1 friends, 2 private, 3 selected friends. Creating a visible list requires review and may notify friends.",
    schema: { ...wishlistFields, visibility_type: z.number().int().min(0).max(3).default(1) },
    confirm: { when: (input) => input.visibility_type !== 2 },
    run: async (input) => {
      const wishlist = await checked(
        db
          .from("wishlist")
          .insert({ ...input, user_id: ctx.userId })
          .select()
          .single(),
      );
      if (input.visibility_type <= 1)
        await ctx.notifier.notifyNewWishlist(wishlist.id, wishlist.title);
      return { kind: "wishlists", wishlists: [wishlist] };
    },
  });
  tools.add("update_wishlist", {
    title: "Edit wishlist",
    description:
      "Change wishlist details. Visibility changes require explicit user review. Omitted fields are unchanged.",
    schema: {
      wishlist_id: id,
      changes: z
        .object({
          ...wishlistFields,
          title: wishlistFields.title.optional(),
          visibility_type: z.number().int().min(0).max(3).optional(),
        })
        .strict()
        .refine((value) => Object.keys(value).length > 0),
    },
    confirm: {
      when: (input) => input.changes.visibility_type !== undefined,
      review: (input) => wishlistReview(ctx, input.wishlist_id),
    },
    run: async ({ wishlist_id, changes }) => {
      // Only the owner may change who can see a list; editors may change its details.
      await requireWishlist(
        ctx,
        wishlist_id,
        changes.visibility_type === undefined ? "edit" : "own",
      );
      const wishlist = await checked(
        db.from("wishlist").update(changes).eq("id", wishlist_id).select().single(),
      );
      return { kind: "wishlists", wishlists: [wishlist] };
    },
  });
  tools.add("delete_wishlist", {
    title: "Delete wishlist and its items",
    description: "Permanently delete a wishlist and its wishes. Only its owner may delete it.",
    schema: { wishlist_id: id },
    confirm: { review: (input) => wishlistReview(ctx, input.wishlist_id) },
    run: async ({ wishlist_id }) => {
      await requireWishlist(ctx, wishlist_id, "own");
      await checked(db.from("wishlist").delete().eq("id", wishlist_id).eq("user_id", ctx.userId));
      return { message: "Wishlist deleted.", wishlist_id };
    },
  });
  tools.add("set_wishlist_pinned", {
    title: "Pin or unpin wishlist",
    description: "Set the pinned state of your wishlist.",
    schema: { wishlist_id: id, pinned: z.boolean() },
    idempotent: true,
    run: async ({ wishlist_id, pinned }) => {
      await requireWishlist(ctx, wishlist_id, "own");
      await checked(db.from("wishlist").update({ is_pinned: pinned }).eq("id", wishlist_id));
      return { wishlist_id, pinned };
    },
  });
  tools.add("get_wishlist_access", {
    title: "View wishlist sharing",
    description: "List people and groups with access to your wishlist.",
    schema: { wishlist_id: id },
    readOnly: true,
    run: async ({ wishlist_id }) => {
      await requireWishlist(ctx, wishlist_id, "own");
      return {
        access: await checked(db.rpc("get_wishlist_access_list", { p_wishlist_id: wishlist_id })),
      };
    },
  });
  tools.add("set_wishlist_access", {
    title: "Change wishlist access",
    description:
      "Grant viewer/editor access to a user, viewer access to a group, or revoke access. Group access supports viewer only.",
    schema: {
      wishlist_id: id,
      target: z.enum(["user", "group"]),
      target_id: id,
      role: z.enum(["viewer", "editor", "none"]),
    },
    confirm: {
      review: async ({ wishlist_id, target, target_id }) => ({
        ...(await wishlistReview(ctx, wishlist_id)),
        ...(target === "group"
          ? await groupReview(ctx, target_id)
          : await peopleReview(ctx, [target_id])),
      }),
    },
    run: async ({ wishlist_id, target, target_id, role }) => {
      const wishlist = await requireWishlist(ctx, wishlist_id, "own");
      if (target === "group") {
        if (role === "editor") throw new ToolError("Groups can only have viewer access.");
        await checked(
          db.rpc(role === "none" ? "revoke_wishlist_group_access" : "grant_wishlist_group_access", {
            p_wishlist_id: wishlist_id,
            p_group_id: target_id,
          }),
        );
      } else if (role === "none") {
        await checked(
          db.rpc("revoke_wishlist_access", {
            p_wishlist_id: wishlist_id,
            p_target_user_id: target_id,
          }),
        );
      } else {
        await checked(
          db.rpc("grant_wishlist_access", {
            p_wishlist_id: wishlist_id,
            p_granted_to_user_id: target_id,
            p_access_type: role === "editor" ? 1 : 0,
          }),
        );
        await ctx.notifier.createLocalizedNotification({
          receiverId: target_id,
          key: "wishlist_access",
          vars: { title: wishlist.title },
          entityId: wishlist_id,
        });
      }
      return { message: "Wishlist access updated.", wishlist_id };
    },
  });
  tools.add("create_share_link", {
    title: "Create wishlist share link",
    description:
      "Create a bearer link that lets anyone possessing it view this wishlist, including private wishes. Review before creating or sharing it.",
    schema: { wishlist_id: id },
    confirm: { review: (input) => wishlistReview(ctx, input.wishlist_id) },
    openWorld: true,
    run: async ({ wishlist_id }) => {
      await requireWishlist(ctx, wishlist_id, "own");
      const token = await checked(
        db.rpc("create_wishlist_share_token", { p_wishlist_id: wishlist_id }),
      );
      return { share_url: `${getMcpConfig().origin}/share?token=${encodeURIComponent(token)}` };
    },
  });
  tools.add("view_shared_wishlist", {
    title: "View shared wishlist",
    description:
      "View a wishlist using a share token supplied by the user. Still requires a connected Wishlane account. Does not send friend requests or grant reservation access.",
    schema: { token: z.string().min(1).max(2000), ...page },
    readOnly: true,
    view: true,
    run: async (input) => {
      const wishlist = await checked(
        db.rpc("get_wishlist_by_share_token", { p_token: input.token }),
      );
      const rows = await checked(
        db.rpc("get_wishlist_items_by_share_token", {
          p_token: input.token,
          p_skip: input.offset,
          p_take: input.limit,
        }),
      );
      return {
        kind: "items",
        wishlist,
        items: (rows ?? []).map((row: Record<string, unknown>) =>
          safeItem(row, ctx.userId, wishlist.user_id),
        ),
        offset: input.offset,
        limit: input.limit,
      };
    },
  });
}
