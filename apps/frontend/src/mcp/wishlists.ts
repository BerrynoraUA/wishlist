import { z } from "zod";
import type { McpContext } from "./auth";
import type { Tools } from "./tools";
import { applyEach, checked, count, paged, safeItem, ToolError } from "./results";
import {
  id,
  ids,
  itemFields,
  page,
  priceRange,
  priority,
  search,
  visibility,
  VISIBILITIES,
  wishlistFields,
} from "./schemas";
import { getMcpConfig } from "./config";
import { requireWishlist } from "./access";
import { accessReview, wishlistReview, wishlistsReview } from "./review";
import { priorityId, wishRow } from "./items";

const VISIBILITY_HELP =
  "Visibility: public is anyone; friends is all friends; private is only you; selected_friends is only people and groups granted with set_wishlist_access.";

export function wishlistTools(tools: Tools, ctx: McpContext) {
  const { db } = ctx;
  tools.add("list_wishlists", {
    title: "Browse wishlists",
    description:
      "List your wishlists, discover public wishlists, or browse a friend's accessible wishlists. Use IDs from results in subsequent tools. visibility_type in results: 0 public, 1 friends, 2 private, 3 selected friends.",
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
            .range(input.offset, input.offset + input.limit),
        );
      } else {
        if (input.view === "friend" && !input.friend_id)
          throw new ToolError("Select a friend first.");
        lists = await checked(
          db.rpc(input.view === "mine" ? "get_my_wishlists_feed" : "get_friend_wishlists", {
            p_skip: input.offset,
            p_take: input.limit + 1,
            p_search: input.search ?? null,
            p_sort: "newest",
            ...(input.view === "friend" ? { p_friend_user_id: input.friend_id } : {}),
          }),
        );
      }
      const { rows, page } = paged(lists, input);
      return { kind: "wishlists", wishlists: rows, ...page };
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
      priorities: z.array(priority).max(4).optional(),
      ...priceRange,
    },
    readOnly: true,
    view: true,
    run: async (input) => {
      const wishlist = await requireWishlist(ctx, input.wishlist_id);
      const rows = await checked(
        db.rpc("get_wishlist_items", {
          p_wishlist_id: input.wishlist_id,
          p_skip: input.offset,
          p_take: input.limit + 1,
          p_search: input.search ?? null,
          p_sort: input.sort,
          p_priorities: input.priorities?.map(priorityId) ?? null,
          p_price_min: input.price_min === undefined ? null : Number(input.price_min),
          p_price_max: input.price_max === undefined ? null : Number(input.price_max),
        }),
      );
      const { rows: items, page } = paged(rows, input);
      return {
        kind: "items",
        wishlist,
        items: items.map((row: Record<string, unknown>) =>
          safeItem(row, ctx.userId, wishlist.user_id),
        ),
        ...page,
      };
    },
  });
  tools.add("create_wishlist", {
    title: "Create wishlist",
    description: `Create a wishlist, optionally with its first wishes in the same call. Defaults to friends. ${VISIBILITY_HELP} Public and friends lists notify friends. Only a public list needs review in the card.`,
    schema: {
      ...wishlistFields,
      visibility: visibility.default("friends"),
      items: z
        .array(z.object(itemFields).strict())
        .max(50)
        .optional()
        .describe("Wishes to add to the new list, with the same fields as create_wishes."),
    },
    confirm: { when: (input) => input.visibility === "public" },
    view: true,
    run: async ({ visibility, items = [], ...fields }) => {
      const visibility_type = VISIBILITIES.indexOf(visibility);
      const wishlist = await checked(
        db
          .from("wishlist")
          .insert({ ...fields, visibility_type, user_id: ctx.userId })
          .select()
          .single(),
      );
      if (items.length)
        await checked(
          db
            .from("item")
            .insert(items.map((item) => ({ ...wishRow(item), wishlist_id: wishlist.id }))),
        );
      if (visibility_type <= 1) await ctx.notifier.notifyNewWishlist(wishlist.id, wishlist.title);
      return {
        kind: "wishlists",
        wishlists: [wishlist],
        ...(items.length > 0 && { message: `Added ${count(items.length, "wish", "wishes")}.` }),
      };
    },
  });
  tools.add("update_wishlist", {
    title: "Edit wishlist",
    description: `Change wishlist details. Visibility changes require explicit user review. Omitted fields are unchanged. ${VISIBILITY_HELP}`,
    schema: {
      wishlist_id: id,
      changes: z
        .object({
          ...wishlistFields,
          title: wishlistFields.title.optional(),
          visibility: visibility.optional(),
        })
        .strict()
        .refine((value) => Object.keys(value).length > 0),
    },
    confirm: {
      when: (input) => input.changes.visibility !== undefined,
      review: (input) => wishlistReview(ctx, input.wishlist_id),
    },
    run: async ({ wishlist_id, changes: { visibility, ...changes } }) => {
      // Only the owner may change who can see a list; editors may change its details.
      await requireWishlist(ctx, wishlist_id, visibility === undefined ? "edit" : "own");
      const wishlist = await checked(
        db
          .from("wishlist")
          .update({
            ...changes,
            ...(visibility && { visibility_type: VISIBILITIES.indexOf(visibility) }),
          })
          .eq("id", wishlist_id)
          .select()
          .single(),
      );
      return { kind: "wishlists", wishlists: [wishlist] };
    },
  });
  tools.add("delete_wishlists", {
    title: "Delete wishlists and their items",
    description:
      "Permanently delete one or more wishlists and their wishes. Only their owner may delete them. Pass every wishlist the user wants removed in one call so they confirm once.",
    schema: { wishlist_ids: ids },
    confirm: { review: (input) => wishlistsReview(ctx, input.wishlist_ids) },
    run: async ({ wishlist_ids }) => {
      await Promise.all(wishlist_ids.map((wishlistId) => requireWishlist(ctx, wishlistId, "own")));
      await checked(db.from("wishlist").delete().in("id", wishlist_ids).eq("user_id", ctx.userId));
      return { message: `Deleted ${count(wishlist_ids.length, "wishlist")}.`, wishlist_ids };
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
      const rows = await checked(
        db.rpc("get_wishlist_access_list", { p_wishlist_id: wishlist_id }),
      );
      return {
        access: (rows ?? []).map((row: Record<string, unknown>) => ({
          target: row.target_type === "group" ? "group" : "user",
          target_id: row.target_id,
          name: row.target_type === "group" ? row.name : row.nickname,
          role: row.access_type === 1 ? "editor" : "viewer",
        })),
      };
    },
  });
  tools.add("set_wishlist_access", {
    title: "Change wishlist access",
    description:
      "Grant viewer/editor access to people, viewer access to groups, or revoke access. Pass every person and group in one call so the user confirms once. Groups support viewer only. Granted people are notified.",
    schema: {
      wishlist_id: id,
      grants: z
        .array(
          z
            .object({
              target: z.enum(["user", "group"]),
              target_id: id,
              role: z.enum(["viewer", "editor", "none"]),
            })
            .strict(),
        )
        .min(1)
        .max(50)
        .refine(
          (grants) => new Set(grants.map((grant) => grant.target_id)).size === grants.length,
          "List each person or group once",
        ),
    },
    confirm: {
      review: async ({ wishlist_id, grants }) => ({
        ...(await wishlistReview(ctx, wishlist_id)),
        ...(await accessReview(ctx, grants)),
      }),
    },
    run: async ({ wishlist_id, grants }) => {
      if (grants.some((grant) => grant.target === "group" && grant.role === "editor"))
        throw new ToolError("Groups can only have viewer access.");
      const wishlist = await requireWishlist(ctx, wishlist_id, "own");
      const byTarget = new Map(grants.map((grant) => [grant.target_id, grant]));
      await applyEach([...byTarget.keys()], async (targetId) => {
        const { target, role } = byTarget.get(targetId)!;
        if (target === "group")
          return checked(
            db.rpc(
              role === "none" ? "revoke_wishlist_group_access" : "grant_wishlist_group_access",
              { p_wishlist_id: wishlist_id, p_group_id: targetId },
            ),
          );
        if (role === "none")
          return checked(
            db.rpc("revoke_wishlist_access", {
              p_wishlist_id: wishlist_id,
              p_target_user_id: targetId,
            }),
          );
        await checked(
          db.rpc("grant_wishlist_access", {
            p_wishlist_id: wishlist_id,
            p_granted_to_user_id: targetId,
            p_access_type: role === "editor" ? 1 : 0,
          }),
        );
        await ctx.notifier.createLocalizedNotification({
          receiverId: targetId,
          key: "wishlist_access",
          vars: { title: wishlist.title },
          entityId: wishlist_id,
        });
      });
      return {
        message: `Updated access for ${count(grants.length, "person or group", "people and groups")}.`,
        wishlist_id,
      };
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
          p_take: input.limit + 1,
        }),
      );
      const { rows: items, page } = paged(rows, input);
      return {
        kind: "items",
        wishlist,
        items: items.map((row: Record<string, unknown>) =>
          safeItem(row, ctx.userId, wishlist.user_id),
        ),
        ...page,
      };
    },
  });
}
