import { supabase } from "@wishlist/backend/supabase/native";
import { File } from "expo-file-system";
import * as React from "react";
import { removeOwnedStorageImage } from "@/lib/storage";

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

export async function uploadPickedImageToBucket(
  image: NativePickedImage,
  {
    bucket,
    pathPrefix,
  }: {
    bucket: string;
    pathPrefix: string;
  },
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

  const { data: uploadData, error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    cacheControl: "3600",
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(uploadData.path);
  return data.publicUrl;
}

export async function uploadPickedImage(
  image: NativePickedImage,
  pathPrefix: "item" | "wishlist",
): Promise<string> {
  return uploadPickedImageToBucket(image, { bucket: IMAGE_BUCKET, pathPrefix });
}

export function useImageUploadField(prefix: "item" | "wishlist") {
  const [pickedImage, setPickedImage] = React.useState<NativePickedImage | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const pendingUploadUrlRef = React.useRef<string | null>(null);

  const reset = React.useCallback(() => {
    setPickedImage(null);
    setError(null);
    setIsUploading(false);
    pendingUploadUrlRef.current = null;
  }, []);

  const onPick = React.useCallback((image: NativePickedImage) => {
    setPickedImage(image);
    setError(null);
  }, []);

  const onClear = React.useCallback(() => {
    setPickedImage(null);
    setError(null);
  }, []);

  const onError = React.useCallback((message: string | null) => {
    setError(message);
  }, []);

  const resolveImageUrl = React.useCallback(
    async (formUrl: string): Promise<string | null | undefined> => {
      setError(null);
      const existingImageUrl = formUrl.trim() || null;

      if (!pickedImage) return existingImageUrl;

      setIsUploading(true);
      try {
        const uploadedUrl = await uploadPickedImage(pickedImage, prefix);
        pendingUploadUrlRef.current = uploadedUrl;
        return uploadedUrl;
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not save image.");
        return undefined;
      } finally {
        setIsUploading(false);
      }
    },
    [pickedImage, prefix],
  );

  const discardPendingUpload = React.useCallback(async () => {
    // After resolveImageUrl uploads a file, call exactly one of discard or commit.
    const pendingUploadUrl = pendingUploadUrlRef.current;
    pendingUploadUrlRef.current = null;
    await removeOwnedStorageImage(IMAGE_BUCKET, pendingUploadUrl).catch(() => undefined);
  }, []);

  const commitPendingUpload = React.useCallback(async (previousImageUrl?: string | null) => {
    // Commit preserves the new upload and removes the previous image after saving.
    const pendingUploadUrl = pendingUploadUrlRef.current;
    pendingUploadUrlRef.current = null;
    if (!pendingUploadUrl || pendingUploadUrl === previousImageUrl) return;
    await removeOwnedStorageImage(IMAGE_BUCKET, previousImageUrl).catch(() => undefined);
  }, []);

  return React.useMemo(
    () => ({
      pickedImage,
      error,
      isUploading,
      onPick,
      onClear,
      onError,
      reset,
      resolveImageUrl,
      discardPendingUpload,
      commitPendingUpload,
    }),
    [
      commitPendingUpload,
      discardPendingUpload,
      error,
      isUploading,
      onClear,
      onError,
      onPick,
      pickedImage,
      reset,
      resolveImageUrl,
    ],
  );
}
