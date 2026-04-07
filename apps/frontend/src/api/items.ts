import { supabaseBrowser } from "@/lib/supabase-browser";
import { Item } from "@/types/item";
import { CreateItemParams, UpdateItemParams } from "./types/item";
import { getItems } from "./helpers/item-helper";
import {
  deletePublicImage,
  uploadPublicImage,
} from "@/lib/helpers/storage-image";

const ITEM_IMAGE_BUCKET = "items";

async function ensureProForPriority(priority: number | null | undefined) {
  void priority;
}

export async function createItem({
  wishlist_id,
  name,
  description,
  price,
  priority,
  image,
  image_url,
  url,
  status = 0,
  discount_price,
  has_discount,
  discount_end_date,
  currency,
}: CreateItemParams): Promise<Item> {
  const {
    data: { session },
    error: sessionError,
  } = await supabaseBrowser.auth.getSession();

  if (sessionError) throw sessionError;
  if (!session?.user) throw new Error("Not authenticated");

  await ensureProForPriority(priority);

  let finalImageUrl: string | null = null;
  let uploadedFile = false;

  if (image) {
    finalImageUrl = await uploadItemImage(image);
    uploadedFile = true;
  } else if (image_url) {
    finalImageUrl = image_url;
  }

  const { data, error } = await supabaseBrowser
    .from("item")
    .insert({
      wishlist_id,
      name,
      description,
      price,
      priority,
      image_url: finalImageUrl,
      url,
      status,
      discount_price: discount_price ?? null,
      has_discount: has_discount ?? false,
      discount_end_date: discount_end_date ?? null,
      currency: currency ?? null,
    })
    .select()
    .single();

  if (error) {
    if (uploadedFile && finalImageUrl) {
      await deleteItemImage(finalImageUrl).catch(console.error);
    }
    throw error;
  }

  return data;
}

export async function getWishlistItems(
  wishlistId: string,
  params: PaginationParams = {},
): Promise<Item[]> {
  return getItems((query) => query.eq("wishlist_id", wishlistId), params);
}

export async function updateItem(
  itemId: string,
  updates: UpdateItemParams,
): Promise<Item> {
  const { image, removeImage, image_url, ...restUpdates } = updates;

  await ensureProForPriority(restUpdates.priority);

  if (image || removeImage || image_url !== undefined) {
    const { data: currentItem } = await supabaseBrowser
      .from("item")
      .select("image_url")
      .eq("id", itemId)
      .single();

    let finalImageUrl: string | null | undefined = undefined;
    let shouldDeleteOldImage = false;

    if (removeImage) {
      finalImageUrl = null;
      shouldDeleteOldImage = true;
    } else if (image) {
      finalImageUrl = await uploadItemImage(image);
      shouldDeleteOldImage = true;
    } else if (image_url !== undefined) {
      finalImageUrl = image_url;
      if (image_url !== currentItem?.image_url) {
        shouldDeleteOldImage = true;
      }
    }

    if (shouldDeleteOldImage && currentItem?.image_url) {
      await deleteItemImage(currentItem.image_url).catch(console.error);
    }

    const updatePayload: any = { ...restUpdates };
    if (finalImageUrl !== undefined) {
      updatePayload.image_url = finalImageUrl;
    }

    const { data, error } = await supabaseBrowser
      .from("item")
      .update(updatePayload)
      .eq("id", itemId)
      .select()
      .single();

    if (error) {
      if (image && finalImageUrl && typeof finalImageUrl === "string") {
        await deleteItemImage(finalImageUrl).catch(console.error);
      }
      throw error;
    }

    return data;
  } else {
    const { data, error } = await supabaseBrowser
      .from("item")
      .update(restUpdates)
      .eq("id", itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}

export async function deleteItem(itemId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("item")
    .delete()
    .eq("id", itemId);

  if (error) throw error;
}

export async function toggleItemReservation(itemId: string): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc("toggle_item_reservation", {
    p_item_id: itemId,
  });

  if (error) {
    console.error("Error toggling item reservation:", error);
    throw new Error(error.message || "Failed to toggle reservation");
  }

  return data as Item;
}

export async function toggleItemBought(itemId: string): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc("toggle_item_bought", {
    p_item_id: itemId,
  });

  if (error) {
    console.error("Error toggling item bought status:", error);
    throw new Error(error.message || "Failed to toggle item bought status");
  }

  return data as Item;
}

export async function toggleItemReservationSecret(
  itemId: string,
): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc(
    "toggle_item_reservation_secret",
    {
      p_item_id: itemId,
    },
  );

  if (error) {
    console.error("Error toggling secret item reservation:", error);
    throw new Error(error.message || "Failed to toggle secret reservation");
  }

  return data as Item;
}

export async function toggleItemBoughtSecret(itemId: string): Promise<Item> {
  const { data, error } = await supabaseBrowser.rpc(
    "toggle_item_bought_secret",
    {
      p_item_id: itemId,
    },
  );

  if (error) {
    console.error("Error toggling secret item bought status:", error);
    throw new Error(
      error.message || "Failed to toggle secret item bought status",
    );
  }

  return data as Item;
}

export async function uploadItemImage(file: File): Promise<string> {
  return uploadPublicImage({
    file,
    bucket: ITEM_IMAGE_BUCKET,
    maxBytes: 5 * 1024 * 1024,
    oversizeMessage: "Image size must be less than 5MB",
    uploadErrorMessage: "Failed to upload image",
  });
}

export async function deleteItemImage(imageUrl: string): Promise<void> {
  await deletePublicImage({
    imageUrl,
    bucket: ITEM_IMAGE_BUCKET,
  });
}
