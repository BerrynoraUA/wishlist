import { supabaseBrowser } from "@/lib/supabase-browser";
import {
  CreateSecretSantaEventInput,
  LaunchSecretSantaInput,
  SecretSantaDetails,
  SecretSantaEvent,
  SecretSantaListResponse,
  ListSecretSantaEventsParams,
  UpdateSecretSantaEventInput,
  VisibleItemsResponse,
} from "./types/secret-santa";
import { deletePublicImage, uploadPublicImage } from "@/lib/helpers/storage-image";

const SECRET_SANTA_IMAGE_BUCKET = "items";

async function uploadSecretSantaImage(file: File): Promise<string> {
  return uploadPublicImage({
    file,
    bucket: SECRET_SANTA_IMAGE_BUCKET,
    maxBytes: 5 * 1024 * 1024,
    oversizeMessage: "Image size must be less than 5MB",
    uploadErrorMessage: "Failed to upload image",
    logLabel: "secret santa image",
    buildPath: ({ userId, extension, timestamp, randomString }) =>
      `${userId}/secret-santa-${timestamp}-${randomString}.${extension}`,
  });
}

async function deleteSecretSantaImage(imageUrl: string | null | undefined) {
  await deletePublicImage({
    imageUrl,
    bucket: SECRET_SANTA_IMAGE_BUCKET,
    logLabel: "secret santa image",
  });
}

async function getSecretSantaImageField(eventId: string) {
  const { data, error } = await supabaseBrowser
    .from("secret_santa")
    .select("image_url")
    .eq("id", eventId)
    .maybeSingle();

  if (error) {
    console.error("Error loading Secret Santa image:", error);
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

  const { data, error } = await supabaseBrowser.rpc("create_secret_santa_event", {
    p_name: restInput.name,
    p_event_date: restInput.event_date,
    p_budget: restInput.budget,
    p_currency: restInput.currency,
    p_image_url: finalImageUrl,
    p_invited_user_ids: restInput.invited_user_ids,
  });

  if (error) {
    if (uploadedFile && finalImageUrl) {
      await deleteSecretSantaImage(finalImageUrl).catch(console.error);
    }

    throw error;
  }

  return data as SecretSantaEvent;
}

export async function updateSecretSantaEvent(
  eventId: string,
  updates: UpdateSecretSantaEventInput,
): Promise<SecretSantaEvent> {
  const { image, imageUrl, removeImage, ...restUpdates } = updates;
  const dbUpdates: Record<string, string | number | null> = {};
  const currentFields = await getSecretSantaImageField(eventId);

  if (restUpdates.name !== undefined) dbUpdates.name = restUpdates.name.trim();
  if (restUpdates.budget !== undefined) dbUpdates.budget = restUpdates.budget;
  if (restUpdates.currency !== undefined) dbUpdates.currency = restUpdates.currency;

  let uploadedImageUrl: string | null = null;

  if (image || removeImage || imageUrl !== undefined) {
    const currentImageUrl = currentFields?.image_url ?? null;

    let finalImageUrl: string | null | undefined = undefined;
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
      await deleteSecretSantaImage(currentImageUrl).catch(console.error);
    }
  }

  let data: SecretSantaEvent | null = null;

  if (Object.keys(dbUpdates).length > 0) {
    const { data: updatedData, error } = await supabaseBrowser
      .from("secret_santa")
      .update(dbUpdates)
      .eq("id", eventId)
      .select("id, name, event_date, budget, currency, image_url, owner_id")
      .single();

    if (error) {
      if (uploadedImageUrl) {
        await deleteSecretSantaImage(uploadedImageUrl).catch(console.error);
      }

      throw error;
    }

    data = updatedData as SecretSantaEvent;
  } else {
    const { data: existingData, error } = await supabaseBrowser
      .from("secret_santa")
      .select("id, name, event_date, budget, currency, image_url, owner_id")
      .eq("id", eventId)
      .single();

    if (error) {
      throw error;
    }

    data = existingData as SecretSantaEvent;
  }

  return data;
}

export async function deleteSecretSantaEvent(eventId: string): Promise<void> {
  const currentFields = await getSecretSantaImageField(eventId);

  const { error } = await supabaseBrowser.rpc("delete_secret_santa_event", {
    p_event_id: eventId,
  });

  if (error) {
    throw error;
  }

  if (currentFields?.image_url) {
    await deleteSecretSantaImage(currentFields.image_url).catch(console.error);
  }
}

export async function getSecretSantaDetails(eventId: string): Promise<SecretSantaDetails> {
  const { data, error } = await supabaseBrowser.rpc("get_secret_santa_details", {
    p_event_id: eventId,
  });

  if (error) {
    throw error;
  }

  return data as SecretSantaDetails;
}

export async function listSecretSantaEvents(
  params: ListSecretSantaEventsParams = {},
): Promise<SecretSantaListResponse> {
  const { data, error } = await supabaseBrowser.rpc("list_secret_santa_events", {
    p_search: params.search ?? null,
    p_limit: params.limit ?? 20,
    p_offset: params.offset ?? 0,
  });

  if (error) {
    throw error;
  }

  return data as SecretSantaListResponse;
}

export async function acceptSecretSantaInvite(inviteId: string): Promise<void> {
  const { error } = await supabaseBrowser.rpc("accept_secret_santa_invite", {
    p_invite_id: inviteId,
  });

  if (error) {
    throw error;
  }
}

export async function declineSecretSantaInvite(inviteId: string): Promise<void> {
  const { error } = await supabaseBrowser.rpc("decline_secret_santa_invite", {
    p_invite_id: inviteId,
  });

  if (error) {
    throw error;
  }
}

export async function joinSecretSantaEvent(eventId: string): Promise<void> {
  const {
    data: { user },
  } = await supabaseBrowser.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { error } = await supabaseBrowser
    .from("secret_santa_participants")
    .upsert({ event_id: eventId, user_id: user.id }, { onConflict: "event_id,user_id" });

  if (error) throw error;
}

export async function removeSecretSantaParticipant(eventId: string, userId: string): Promise<void> {
  const { error } = await supabaseBrowser
    .from("secret_santa_participants")
    .delete()
    .eq("event_id", eventId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function removeSecretSantaInvite(inviteId: string): Promise<void> {
  const { error } = await supabaseBrowser.from("secret_santa_invites").delete().eq("id", inviteId);

  if (error) throw error;
}

export function generateSecretSantaAssignment(
  participantIds: string[],
  exclusions: Map<string, Set<string>>,
  maxAttempts = 500,
): Map<string, string> | null {
  const n = participantIds.length;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const available = new Set(participantIds);
    const assignment = new Map<string, string>();
    let valid = true;

    // Process in random order so different attempts explore differently
    const order = [...participantIds].sort(() => Math.random() - 0.5);

    for (const giver of order) {
      const candidates = [...available].filter(
        (r) => r !== giver && !(exclusions.get(giver)?.has(r) ?? false),
      );

      if (candidates.length === 0) {
        valid = false;
        break;
      }

      const receiver = candidates[Math.floor(Math.random() * candidates.length)];
      assignment.set(giver, receiver);
      available.delete(receiver);
    }

    if (valid && assignment.size === n) return assignment;
  }

  return null;
}

export async function launchSecretSanta(input: LaunchSecretSantaInput): Promise<void> {
  const exclusions = new Map<string, Set<string>>();
  for (const ex of input.exclusions) {
    exclusions.set(ex.user_id, new Set(ex.excluded_ids));
  }

  const { data: rows, error: fetchErr } = await supabaseBrowser
    .from("secret_santa_participants")
    .select("id, user_id")
    .eq("event_id", input.event_id);

  if (fetchErr) throw fetchErr;
  if (!rows || rows.length < 2) throw new Error("At least 2 participants are required to launch.");

  const participantIds = rows.map((r) => r.user_id as string);
  const assignment = generateSecretSantaAssignment(participantIds, exclusions);

  if (!assignment) {
    throw new Error(
      "Cannot generate a valid assignment with the current exclusions. Relax some restrictions and try again.",
    );
  }

  for (const row of rows) {
    const receiverId = assignment.get(row.user_id as string);
    if (!receiverId) continue;

    const { error: updateErr } = await supabaseBrowser
      .from("secret_santa_participants")
      .update({ receiver_id: receiverId })
      .eq("id", row.id);

    if (updateErr) throw updateErr;
  }

  const { error: startErr } = await supabaseBrowser
    .from("secret_santa")
    .update({ is_started: true })
    .eq("id", input.event_id);

  if (startErr) throw startErr;
}

export async function getUserVisibleItemsByMaxPrice(
  userId: string,
  maxPrice: number,
  limit = 20,
  offset = 0,
): Promise<VisibleItemsResponse> {
  const { data, error } = await supabaseBrowser.rpc("get_user_visible_items_by_max_price", {
    p_user_id: userId,
    p_max_price: maxPrice,
    p_limit: limit,
    p_offset: offset,
  });

  if (error) throw error;

  return data as VisibleItemsResponse;
}
