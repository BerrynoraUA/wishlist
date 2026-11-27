import { supabase } from "@wishlist/backend/supabase/native";
import {
  createWishlist,
  patchWishlist,
  deleteWishlist,
  grantWishlistAccess,
  revokeWishlistAccess,
} from "@/api/wishlists";
import { createItem, updateItem, deleteItem } from "@/api/items";
import {
  createFriendGroup,
  updateFriendGroup,
  deleteFriendGroup,
  grantWishlistGroupAccess,
  revokeWishlistGroupAccess,
} from "@/api/friends";
import {
  createSecretSantaEvent,
  updateSecretSantaEvent,
  deleteSecretSantaEvent,
} from "@/api/secret-santa";
import { updateProfile, updateSettings } from "@/api/settings";
import { scrapeProductLink } from "@/api/scrape-product";
import { uploadQueuedImage, type ImageUploadTarget } from "./image-upload";
import { File } from "expo-file-system";
import type { QueuedWrite } from "./write-queue";
import type { WishlistFormValues, WishlistUpdateValues } from "@wishlist/backend/types/wishlist";
import type { CreateItemParams, UpdateItemParams } from "@wishlist/backend/types/item";
import type { FriendGroupPayload } from "@wishlist/backend/types/friends";
import type {
  CreateSecretSantaEventInput,
  UpdateSecretSantaEventInput,
} from "@wishlist/backend/types/secret-santa";
import type { UpdateProfilePayload, UpdateSettingsPayload } from "@wishlist/backend/types/settings";

const IMAGE_FIELDS = {
  wishlist: ["imageUrl", "wishlist"],
  item: ["image_url", "item"],
  event: ["imageUrl", "secretSanta"],
  profile: ["avatar_url", "avatar"],
} as const;

export async function sendQueuedWrite(write: QueuedWrite) {
  // A persisted write must never be sent with another account's credentials.
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) throw error;
  if (user?.id !== write.userId) throw new Error("Sign in to the account that saved this change.");

  const payload = { ...(write.payload as Record<string, unknown>) };
  if (write.entity === "access") {
    const target = payload.targetId as string;
    if (payload.group) {
      if (write.action === "delete") await revokeWishlistGroupAccess(write.id, target);
      else await grantWishlistGroupAccess(write.id, target);
    } else {
      if (write.action === "delete") await revokeWishlistAccess(write.id, target);
      else await grantWishlistAccess(write.id, target, payload.accessType as 0 | 1 | 2 | 3);
    }
    return;
  }
  if (write.entity in IMAGE_FIELDS && write.action !== "delete") {
    const [field, target] = IMAGE_FIELDS[write.entity as keyof typeof IMAGE_FIELDS];
    const uri = payload[field];
    if (typeof uri === "string" && uri.startsWith("file:")) {
      const file = new File(uri);
      payload[field] = await uploadQueuedImage(
        { uri, key: file.name.split(".")[0], mimeType: file.type, fileName: file.name },
        target as ImageUploadTarget,
      );
    }
  }

  if (write.entity === "wishlist") {
    if (write.action === "delete") return deleteWishlist(write.id);
    if (write.action === "create") return createWishlist(payload as WishlistFormValues, write.id);
    return patchWishlist(write.id, payload as WishlistUpdateValues);
  }
  if (write.entity === "item") {
    if (write.action === "delete") return deleteItem(write.id);
    if (write.action === "update") return updateItem(write.id, payload as UpdateItemParams);
    const { fillFromLink, ...values } = payload;
    if (fillFromLink && typeof values.url === "string") {
      const product = await scrapeProductLink(values.url);
      // Only fill missing fields; subsequent queued edits still run after this create.
      if (!values.name || values.name === values.url) values.name = product.title || values.url;
      values.description ||= product.description;
      values.image_url ||= product.image;
      values.price ||= product.price;
      values.currency ||= product.currency;
      if (!values.discount_price) {
        values.discount_price = product.discount_price;
        values.has_discount = product.has_discount;
        values.discount_end_date = product.discount_end_date;
      }
    }
    return createItem(values as unknown as CreateItemParams, write.id);
  }
  if (write.entity === "group") {
    if (write.action === "delete") return deleteFriendGroup(write.id);
    if (write.action === "create") {
      await createFriendGroup(payload as FriendGroupPayload, write.id);
      return write.local;
    }
    await updateFriendGroup(write.id, payload as FriendGroupPayload);
    return write.local;
  }
  if (write.entity === "event") {
    if (write.action === "delete") return deleteSecretSantaEvent(write.id);
    if (write.action === "create")
      return createSecretSantaEvent(payload as CreateSecretSantaEventInput, write.id);
    return updateSecretSantaEvent(write.id, payload as UpdateSecretSantaEventInput);
  }
  if (write.entity === "profile") return updateProfile(payload as UpdateProfilePayload);
  return updateSettings(payload as UpdateSettingsPayload);
}
