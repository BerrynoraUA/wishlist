import { supabase } from "@wishlist/backend/supabase/native";
import { File } from "expo-file-system";

export type NativePickedImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

const IMAGE_BUCKET = "items";
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

function getImageExtension(fileName: string | null | undefined, mimeType: string) {
  const fileExtension = fileName?.split(".").pop()?.toLowerCase();

  if (fileExtension && /^[a-z0-9]+$/.test(fileExtension)) {
    return fileExtension;
  }

  return mimeType.split("/")[1]?.split("+")[0] ?? "jpg";
}

export async function uploadPickedImage(
  image: NativePickedImage,
  pathPrefix: "item" | "wishlist",
): Promise<string> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("Not authenticated");

  const file = new File(image.uri);
  const contentType = image.mimeType || file.type || "image/jpeg";

  if (!contentType.startsWith("image/")) {
    throw new Error("File must be an image");
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    throw new Error("Choose an image that is 5 MB or less.");
  }

  const extension = getImageExtension(image.fileName, contentType);
  const randomString = Math.random().toString(36).slice(2, 15);
  const path = `${user.id}/${pathPrefix}-${Date.now()}-${randomString}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { data: uploadData, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(path, bytes, {
      contentType,
      cacheControl: "3600",
      upsert: false,
    });

  if (error) throw error;

  const { data } = supabase.storage.from(IMAGE_BUCKET).getPublicUrl(uploadData.path);
  return data.publicUrl;
}
