import { supabase } from "@wishlist/backend/supabase/native";
import { onlineManager } from "@tanstack/react-query";
import { File } from "expo-file-system";
import * as React from "react";
import { keepImageForSync, type QueuedImage } from "@/lib/offline-images";
import { removeOwnedStorageImage } from "@/lib/storage";

export type NativePickedImage = {
  uri: string;
  mimeType?: string | null;
  fileName?: string | null;
};

const IMAGE_BUCKET = "items";
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;

const UPLOAD_TARGETS = {
  item: { bucket: IMAGE_BUCKET, pathPrefix: "item" },
  wishlist: { bucket: IMAGE_BUCKET, pathPrefix: "wishlist" },
  avatar: { bucket: "avatars", pathPrefix: "avatar" },
  bug: { bucket: "bug-screenshots", pathPrefix: "bug" },
  secretSanta: { bucket: IMAGE_BUCKET, pathPrefix: "secret-santa" },
} as const;

export type ImageUploadTarget = keyof typeof UPLOAD_TARGETS;

export function getImageUploadBucket(target: ImageUploadTarget) {
  return UPLOAD_TARGETS[target].bucket;
}

export function getImageExtension(fileName: string | null | undefined, mimeType: string) {
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
    objectKey,
  }: {
    bucket: string;
    pathPrefix: string;
    /**
     * Names the file after this key instead of a random one. A second upload under the same
     * key keeps the first file, so a retried offline write never stores the image twice.
     */
    objectKey?: string;
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
  const name = objectKey ?? `${Date.now()}-${randomString}`;
  const path = `${user.id}/${pathPrefix}-${name}.${extension}`;
  const bytes = await file.arrayBuffer();

  const { error } = await supabase.storage.from(bucket).upload(path, bytes, {
    contentType,
    cacheControl: "3600",
    upsert: false,
  });

  if (error && !(objectKey && isAlreadyStoredError(error))) throw error;

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

function isAlreadyStoredError(error: { message?: string; statusCode?: string }) {
  return error.statusCode === "409" || /already exists/i.test(error.message ?? "");
}

/** Uploads an image saved for an offline write. Safe to repeat: see `objectKey`. */
export function uploadQueuedImage(image: QueuedImage, target: ImageUploadTarget) {
  return uploadPickedImageToBucket(image, { ...UPLOAD_TARGETS[target], objectKey: image.key });
}

type InFlightUpload = { image: NativePickedImage; promise: Promise<string> };

/**
 * Holds the image the user picked and uploads it in the background, starting the moment
 * it is picked rather than when the form is saved. Callers render `pickedImage.uri`
 * straight away, so the new image appears with no spinner and no round trip, and by the
 * time save is pressed the upload has usually already finished.
 *
 * Nothing is applied until `resolveImageUrl` is called from the save handler, so a picked
 * image can still be abandoned by closing the form.
 */
export function useImageUploadField(target: ImageUploadTarget) {
  const { bucket, pathPrefix } = UPLOAD_TARGETS[target];
  const [pickedImage, setPickedImage] = React.useState<NativePickedImage | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const uploadRef = React.useRef<InFlightUpload | null>(null);
  const pendingUploadUrlRef = React.useRef<string | null>(null);

  // The user replaced or dropped this pick, so delete whatever it uploaded once it lands.
  // Fire-and-forget: an orphaned file is not worth blocking or reporting on.
  const abandonUpload = React.useCallback(
    (upload: InFlightUpload | null) => {
      if (!upload) return;
      void upload.promise
        .then((url) => removeOwnedStorageImage(bucket, url))
        .catch(() => undefined);
    },
    [bucket],
  );

  const startUpload = React.useCallback(
    (image: NativePickedImage) => {
      abandonUpload(uploadRef.current);
      const promise = uploadPickedImageToBucket(image, { bucket, pathPrefix });
      // Failures are surfaced by resolveImageUrl, which retries; swallow here so the
      // background attempt never becomes an unhandled rejection.
      void promise.catch(() => undefined);
      uploadRef.current = { image, promise };
    },
    [abandonUpload, bucket, pathPrefix],
  );

  const reset = React.useCallback(() => {
    abandonUpload(uploadRef.current);
    uploadRef.current = null;
    setPickedImage(null);
    setError(null);
    setIsUploading(false);
    pendingUploadUrlRef.current = null;
  }, [abandonUpload]);

  const onPick = React.useCallback(
    (image: NativePickedImage) => {
      if (onlineManager.isOnline()) startUpload(image);
      else uploadRef.current = null;
      setPickedImage(image);
      setError(null);
    },
    [startUpload],
  );

  const onClear = React.useCallback(() => {
    abandonUpload(uploadRef.current);
    uploadRef.current = null;
    setPickedImage(null);
    setError(null);
  }, [abandonUpload]);

  const onError = React.useCallback((message: string | null) => {
    setError(message);
  }, []);

  const resolveImageUrl = React.useCallback(
    async (formUrl: string): Promise<string | null | undefined> => {
      setError(null);
      const existingImageUrl = formUrl.trim() || null;
      const upload = uploadRef.current;

      if (pickedImage && (!onlineManager.isOnline() || !upload)) {
        try {
          return (await keepImageForSync(pickedImage)).uri;
        } catch (keepError) {
          setError(keepError instanceof Error ? keepError.message : "Could not save image.");
          return undefined;
        }
      }
      if (!upload) return existingImageUrl;

      setIsUploading(true);
      try {
        let uploadedUrl: string;
        try {
          uploadedUrl = await upload.promise;
        } catch {
          // The background attempt started long before save, so a stale network failure
          // should not be final. Try once more now that the user is waiting.
          uploadedUrl = await uploadPickedImageToBucket(upload.image, { bucket, pathPrefix });
        }
        pendingUploadUrlRef.current = uploadedUrl;
        return uploadedUrl;
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : "Could not save image.");
        return undefined;
      } finally {
        setIsUploading(false);
      }
    },
    [bucket, pathPrefix, pickedImage],
  );

  const discardPendingUpload = React.useCallback(async () => {
    // After resolveImageUrl uploads a file, call exactly one of discard or commit.
    const pendingUploadUrl = pendingUploadUrlRef.current;
    pendingUploadUrlRef.current = null;
    await removeOwnedStorageImage(bucket, pendingUploadUrl).catch(() => undefined);
  }, [bucket]);

  const commitPendingUpload = React.useCallback(
    async (previousImageUrl?: string | null) => {
      // Commit preserves the new upload and removes the previous image after saving.
      const pendingUploadUrl = pendingUploadUrlRef.current;
      pendingUploadUrlRef.current = null;
      if (!pendingUploadUrl || pendingUploadUrl === previousImageUrl) return;
      await removeOwnedStorageImage(bucket, previousImageUrl).catch(() => undefined);
    },
    [bucket],
  );

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
