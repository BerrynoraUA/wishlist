import { uploadPickedImageToBucket, type NativePickedImage } from "@/lib/image-upload";
import { createBugReportsApi } from "@wishlist/backend/api/bug-reports";
import { supabase } from "@wishlist/backend/supabase/native";

const BUG_SCREENSHOTS_BUCKET = "bug-screenshots";

export const { createBugReport, getPublicBugReports } = createBugReportsApi(supabase);

export function uploadBugScreenshot(image: NativePickedImage): Promise<string> {
  return uploadPickedImageToBucket(image, {
    bucket: BUG_SCREENSHOTS_BUCKET,
    pathPrefix: "bug",
  });
}
