export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_IMAGE_UPLOAD_LABEL = "Max 5 MB";
export const MAX_IMAGE_UPLOAD_ERROR_MESSAGE = "Image size must be 5 MB or less";

export function validateImageUploadFile(file: File | null | undefined): string | null {
  if (!file) {
    return null;
  }

  if (!file.type.startsWith("image/")) {
    return "File must be an image";
  }

  if (file.size > MAX_IMAGE_UPLOAD_BYTES) {
    return MAX_IMAGE_UPLOAD_ERROR_MESSAGE;
  }

  return null;
}
