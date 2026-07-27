import { normalizeSearchQuery } from "@/lib/wishlists";
import { notifySecretSantaInvites } from "@/lib/create-notification";
import { generateSecretSantaAssignment } from "@/lib/secret-santa-assignment";
import { removeOwnedStorageImage } from "@/lib/storage";
import { supabase } from "@wishlist/backend/supabase/native";
import type {
  CreateSecretSantaEventInput,
  LaunchSecretSantaInput,
  ListSecretSantaEventsParams,
  SecretSantaDetails,
  SecretSantaEvent,
  SecretSantaImageInput,
  SecretSantaListResponse,
  UpdateSecretSantaEventInput,
  VisibleItemsResponse,
} from "@wishlist/backend/types/secret-santa";
import { File } from "expo-file-system";

const SECRET_SANTA_IMAGE_BUCKET = "items";
const MAX_SECRET_SANTA_IMAGE_BYTES = 5 * 1024 * 1024;

async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) throw error;
  return user;
}

function getImageExtension(fileName: string | null | undefined, mimeType: string) {
  const fileExtension = fileName?.split(".").pop()?.toLowerCase();

  if (fileExtension && /^[a-z0-9]+$/.test(fileExtension)) {
    return fileExtension;
  }

  return mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
}

function isNativeImageInput(
  image: SecretSantaImageInput,
): image is Extract<SecretSantaImageInput, { uri: string }> {
  return "uri" in image;
}

async function uploadSecretSantaImage(image: SecretSantaImageInput): Promise<string> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");
  if (!isNativeImageInput(image)) throw new Error("Unsupported image input");

  const file = new File(image.uri);
  const contentType = image.mimeType || file.type || "image/jpeg";

  if (!contentType.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  if (file.size > MAX_SECRET_SANTA_IMAGE_BYTES) {
    throw new Error("Choose an image that is 5 MB or less.");
  }

  const extension = getImageExtension(image.fileName, contentType);
  const randomString = Math.random().toString(36).slice(2, 15);
  const path = `${user.id}/secret-santa-${Date.now()}-${randomString}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { data: uploadData, error } = await supabase.storage
    .from(SECRET_SANTA_IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(SECRET_SANTA_IMAGE_BUCKET).getPublicUrl(uploadData.path);
  return data.publicUrl;
}

async function getSecretSantaImageField(eventId: string) {
  const { data, error } = await supabase
    .from("secret_santa")
    .select("image_url")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data as { image_url?: string | null } | null;
}

export async function createSecretSantaEvent(
  input: CreateSecretSantaEventInput,
): Promise<SecretSantaEvent> {
  const { image, imageUrl, ...restInput } = input;
  let finalImageUrl: string | null = null;
  let uploadedFile = false;

  if (image) {
    finalImageUrl = await uploadSecretSantaImage(image);
    uploadedFile = true;
  } else if (imageUrl) {
    finalImageUrl = imageUrl;
  }

  const { data, error } = await supabase.rpc("create_secret_santa_event", {
    p_name: restInput.name,
    p_event_date: restInput.event_date,
    p_budget: restInput.budget,
    p_currency: restInput.currency,
    p_image_url: finalImageUrl,
    p_invited_user_ids: restInput.invited_user_ids,
  });

  if (error) {
    if (uploadedFile && finalImageUrl) {
      await removeOwnedStorageImage(SECRET_SANTA_IMAGE_BUCKET, finalImageUrl).catch(
        () => undefined,
      );
    }

    throw error;
  }

  const event = data as SecretSantaEvent;
  void notifySecretSantaInvites(event.id, restInput.name, restInput.invited_user_ids ?? []);

  return event;
}

export async function updateSecretSantaEvent(
  eventId: string,
  updates: UpdateSecretSantaEventInput,
): Promise<SecretSantaEvent> {
  const { image, imageUrl, removeImage, ...restUpdates } = updates;
  const dbUpdates: Record<string, string | number | null> = {};
  const currentFields = await getSecretSantaImageField(eventId);

  if (restUpdates.name !== undefined) dbUpdates.name = restUpdates.name.trim();
  if (restUpdates.event_date !== undefined) dbUpdates.event_date = restUpdates.event_date;
  if (restUpdates.budget !== undefined) dbUpdates.budget = restUpdates.budget;
  if (restUpdates.currency !== undefined) dbUpdates.currency = restUpdates.currency;

  let uploadedImageUrl: string | null = null;
  let previousImageUrlToDelete: string | null = null;

  if (image || removeImage || imageUrl !== undefined) {
    const currentImageUrl = currentFields?.image_url ?? null;
    let finalImageUrl: string | null | undefined;
    let shouldDeleteOldImage = false;

    if (removeImage) {
      finalImageUrl = null;
      shouldDeleteOldImage = true;
    } else if (image) {
      uploadedImageUrl = await uploadSecretSantaImage(image);
      finalImageUrl = uploadedImageUrl;
      shouldDeleteOldImage = currentImageUrl !== uploadedImageUrl;
    } else if (imageUrl !== undefined) {
      finalImageUrl = imageUrl;
      shouldDeleteOldImage = imageUrl !== currentImageUrl;
    }

    if (finalImageUrl !== undefined) {
      dbUpdates.image_url = finalImageUrl;
    }

    if (shouldDeleteOldImage && currentImageUrl) {
      previousImageUrlToDelete = currentImageUrl;
    }
  }

  if (Object.keys(dbUpdates).length === 0) {
    const { data, error } = await supabase
      .from("secret_santa")
      .select("id, name, event_date, budget, currency, image_url, owner_id")
      .eq("id", eventId)
      .single();

    if (error) throw error;
    return data as SecretSantaEvent;
  }

  const { data, error } = await supabase
    .from("secret_santa")
    .update(dbUpdates)
    .eq("id", eventId)
    .select("id, name, event_date, budget, currency, image_url, owner_id")
    .single();

  if (error) {
    if (uploadedImageUrl) {
      await removeOwnedStorageImage(SECRET_SANTA_IMAGE_BUCKET, uploadedImageUrl).catch(
        () => undefined,
      );
    }

    throw error;
  }

  if (previousImageUrlToDelete) {
    await removeOwnedStorageImage(SECRET_SANTA_IMAGE_BUCKET, previousImageUrlToDelete).catch(
      () => undefined,
    );
  }

  return data as SecretSantaEvent;
}

export async function deleteSecretSantaEvent(eventId: string): Promise<void> {
  const currentFields = await getSecretSantaImageField(eventId);

  const { error } = await supabase.rpc("delete_secret_santa_event", {
    p_event_id: eventId,
  });

  if (error) throw error;

  if (currentFields?.image_url) {
    await removeOwnedStorageImage(SECRET_SANTA_IMAGE_BUCKET, currentFields.image_url).catch(
      () => undefined,
    );
  }
}

export async function getSecretSantaDetails(eventId: string): Promise<SecretSantaDetails> {
  const { data, error } = await supabase.rpc("get_secret_santa_details", {
    p_event_id: eventId,
  });

  if (error) throw error;

  return data as SecretSantaDetails;
}

export async function listSecretSantaEvents(
  params: ListSecretSantaEventsParams = {},
): Promise<SecretSantaListResponse> {
  const normalizedSearch = normalizeSearchQuery(params.search);

  const { data, error } = await supabase.rpc("list_secret_santa_events", {
    p_search: normalizedSearch || null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  });

  if (error) throw error;

  return data as SecretSantaListResponse;
}

export async function inviteSecretSantaUsers(
  eventId: string,
  eventName: string,
  userIds: string[],
): Promise<void> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const receiverIds = userIds.filter((userId) => userId !== user.id);
  if (receiverIds.length === 0) return;

  // Mirrors what create_secret_santa_event does for invites: upsert the invite
  // rows (re-inviting resets a declined invite) and notify each receiver.
  const { data: invites, error } = await supabase
    .from("secret_santa_invites")
    .upsert(
      receiverIds.map((receiverId) => ({
        event_id: eventId,
        sender_id: user.id,
        receiver_id: receiverId,
        status: 0,
        responded_at: null,
      })),
      { onConflict: "event_id,receiver_id" },
    )
    .select("id, receiver_id");

  if (error) throw error;
  if (!invites || invites.length === 0) return;

  const { error: notificationError } = await supabase.from("notifications").insert(
    invites.map((invite) => ({
      sender_id: user.id,
      receiver_id: invite.receiver_id as string,
      text: `You have been invited to Secret Santa "${eventName}"`,
      icon_type: 0,
      type: 0,
      entity_id: invite.id as string,
      is_read: false,
    })),
  );

  if (notificationError) throw notificationError;
}

export async function acceptSecretSantaInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc("accept_secret_santa_invite", {
    p_invite_id: inviteId,
  });

  if (error) throw error;
}

export async function declineSecretSantaInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc("decline_secret_santa_invite", {
    p_invite_id: inviteId,
  });

  if (error) throw error;
}

export async function joinSecretSantaEvent(eventId: string): Promise<void> {
  const user = await getCurrentUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("secret_santa_participants")
    .upsert({ event_id: eventId, user_id: user.id }, { onConflict: "event_id,user_id" });

  if (error) throw error;
}

export async function removeSecretSantaParticipant(eventId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from("secret_santa_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function removeSecretSantaInvite(inviteId: string): Promise<void> {
  const { error } = await supabase.rpc("remove_secret_santa_invite", {
    p_invite_id: inviteId,
  });

  if (error) throw error;
}

export async function launchSecretSanta(input: LaunchSecretSantaInput): Promise<void> {
  const exclusions = new Map<string, Set<string>>();
  for (const exclusion of input.exclusions) {
    exclusions.set(exclusion.user_id, new Set(exclusion.excluded_ids));
  }

  const { data: rows, error: fetchError } = await supabase
    .from("secret_santa_participants")
    .select("user_id")
    .eq("event_id", input.event_id);

  if (fetchError) throw fetchError;
  if (!rows || rows.length < 2) throw new Error("At least 2 participants are required to launch.");

  const participantIds = rows.map((row) => row.user_id as string);
  const assignment = generateSecretSantaAssignment(participantIds, exclusions);

  if (!assignment) {
    throw new Error(
      "Cannot generate a valid assignment with the current exclusions. Relax some restrictions and try again.",
    );
  }

  const { error } = await supabase.rpc("launch_secret_santa", {
    p_event_id: input.event_id,
    p_assignments: Array.from(assignment, ([user_id, receiver_id]) => ({ user_id, receiver_id })),
  });

  if (error) throw error;
}

export async function getUserVisibleItemsByMaxPrice(
  userId: string,
  maxPrice: number,
  limit = 20,
  offset = 0,
): Promise<VisibleItemsResponse> {
  const { data, error } = await supabase.rpc("get_user_visible_items_by_max_price", {
    p_user_id: userId,
    p_max_price: maxPrice,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  return data as VisibleItemsResponse;
}
