import { supabaseBrowser } from "@/lib/supabase-browser";
import { Item } from "@/types/item";
import { CreateItemParams, UpdateItemParams } from "./types/item";
import { getItems } from "./helpers/item-helper";
import { getSubscriptionStatus } from "./subscription";
import { SubscriptionPlan } from "@/types/subscription";

async function ensureProForPriority(priority: number | null | undefined) {
  if (priority == null) return;

  const status = await getSubscriptionStatus();
  const isPro = status.plan === SubscriptionPlan.Pro && status.isActive === true;

  if (!isPro) {
    throw new Error("Priority is available for Pro subscribers only");
  }
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

      if (image && finalImageUrl && typeof finalImageUrl === 'string') {
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
  const { data, error } = await supabaseBrowser.rpc('toggle_item_reservation', {
    p_item_id: itemId,
  });

  if (error) {
    console.error('Error toggling item reservation:', error);
    throw new Error(error.message || 'Failed to toggle reservation');
  }

  return data as Item;
}


export async function uploadItemImage(file: File): Promise<string> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  if (!session?.user) throw new Error("Not authenticated");

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Image size must be less than 5MB');
  }


  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }


  const fileExt = file.name.split('.').pop();
  const randomString = Math.random().toString(36).substring(2, 15);
  const fileName = `${session.user.id}/${Date.now()}-${randomString}.${fileExt}`;


  const { data, error } = await supabaseBrowser.storage
    .from('items')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image');
  }


  const { data: { publicUrl } } = supabaseBrowser.storage
    .from('items')
    .getPublicUrl(data.path);

  return publicUrl;
}


 
export async function deleteItemImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  if (!imageUrl.includes('/storage/v1/object/public/items/')) {
   
    return;
  }

  const urlParts = imageUrl.split('/items/');
  if (urlParts.length < 2) return;
  
  const path = urlParts[1];

  const { error } = await supabaseBrowser.storage
    .from('items')
    .remove([path]);

  if (error) {
    console.error('Error deleting image:', error);
    
  }
}


export function isSupabaseStorageUrl(url: string | null): boolean {
  if (!url) return false;
  return url.includes('/storage/v1/object/public/items/');
}