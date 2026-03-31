import { supabaseBrowser } from "@/lib/supabase-browser";

type BuildStoragePathParams = {
  userId: string;
  file: File;
  extension: string;
  timestamp: number;
  randomString: string;
};

type UploadPublicImageOptions = {
  file: File;
  bucket: string;
  maxBytes: number;
  uploadErrorMessage: string;
  invalidTypeMessage?: string;
  oversizeMessage?: string;
  logLabel?: string;
  buildPath?: (params: BuildStoragePathParams) => string;
};

type DeletePublicImageOptions = {
  imageUrl: string | null | undefined;
  bucket: string;
  logLabel?: string;
};

function buildDefaultStoragePath({
  userId,
  extension,
  timestamp,
  randomString,
}: BuildStoragePathParams): string {
  return `${userId}/${timestamp}-${randomString}.${extension}`;
}

function resolveFileExtension(file: File): string {
  return (file.name.split(".").pop() ?? "png").toLowerCase();
}

export function isSupabasePublicImageUrl(
  url: string | null | undefined,
  bucket: string,
): boolean {
  if (!url) return false;

  return url.includes(`/storage/v1/object/public/${bucket}/`);
}

export function getStoragePathFromPublicUrl(
  url: string | null | undefined,
  bucket: string,
): string | null {
  if (!url || !isSupabasePublicImageUrl(url, bucket)) {
    return null;
  }

  const urlParts = url.split(`/${bucket}/`);
  if (urlParts.length < 2) {
    return null;
  }

  const path = urlParts[1].split("?")[0];
  return path || null;
}

export async function uploadPublicImage({
  file,
  bucket,
  maxBytes,
  uploadErrorMessage,
  invalidTypeMessage = "File must be an image",
  oversizeMessage = "Image size is too large",
  logLabel = "image",
  buildPath,
}: UploadPublicImageOptions): Promise<string> {
  const {
    data: { session },
  } = await supabaseBrowser.auth.getSession();

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  if (file.size > maxBytes) {
    throw new Error(oversizeMessage);
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(invalidTypeMessage);
  }

  const timestamp = Date.now();
  const extension = resolveFileExtension(file);
  const randomString = Math.random().toString(36).slice(2, 15);
  const path = (buildPath ?? buildDefaultStoragePath)({
    userId: session.user.id,
    file,
    extension,
    timestamp,
    randomString,
  });

  const { data, error } = await supabaseBrowser.storage
    .from(bucket)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    console.error(`Error uploading ${logLabel}:`, error);
    throw new Error(error.message || uploadErrorMessage);
  }

  const {
    data: { publicUrl },
  } = supabaseBrowser.storage.from(bucket).getPublicUrl(data.path);

  return publicUrl;
}

export async function deletePublicImage({
  imageUrl,
  bucket,
  logLabel = "image",
}: DeletePublicImageOptions): Promise<void> {
  const path = getStoragePathFromPublicUrl(imageUrl, bucket);

  if (!path) {
    return;
  }

  const { error } = await supabaseBrowser.storage.from(bucket).remove([path]);

  if (error) {
    console.error(`Error deleting ${logLabel}:`, error);
  }
}
