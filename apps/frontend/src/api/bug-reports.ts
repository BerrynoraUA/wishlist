import { createBugReportsApi } from "@wishlist/backend/api/bug-reports";
import { supabaseBrowser } from "@/lib/supabase-browser";
import { uploadPublicImage } from "@/lib/helpers/storage-image";
import { MAX_IMAGE_UPLOAD_BYTES } from "@/lib/image-upload";

const BUG_SCREENSHOTS_BUCKET = "bug-screenshots";

export const { createBugReport, getPublicBugReports } = createBugReportsApi(supabaseBrowser);

export async function uploadBugScreenshot(file: File): Promise<string> {
  return uploadPublicImage({
    file,
    bucket: BUG_SCREENSHOTS_BUCKET,
    maxBytes: MAX_IMAGE_UPLOAD_BYTES,
    oversizeMessage: "Screenshot size must be less than 5MB",
    uploadErrorMessage: "Failed to upload screenshot",
    logLabel: "bug screenshot",
  });
}
