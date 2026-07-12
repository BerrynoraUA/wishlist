import { getSupabasePublicEnv } from "@wishlist/backend/supabase/shared";

export function getSupabaseStoragePath(
  imageUrl: string | null | undefined,
  bucket: string,
  projectUrl = getSupabasePublicEnv().url,
) {
  if (!imageUrl || !projectUrl) return null;

  try {
    const image = new URL(imageUrl);
    const project = new URL(projectUrl);
    if (image.origin !== project.origin) return null;

    const marker = `/storage/v1/object/public/${bucket}/`;
    if (!image.pathname.startsWith(marker)) return null;
    return decodeURIComponent(image.pathname.slice(marker.length)) || null;
  } catch {
    return null;
  }
}
