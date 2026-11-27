import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";

/**
 * An image picked for a write made offline. The picker's file lives in a cache the system may
 * clear, so it is copied into the app's documents, where it survives until the write syncs.
 * Until then the copy is what the app shows for the record.
 */
export type QueuedImage = {
  uri: string;
  mimeType: string | null;
  fileName: string | null;
  /** Names the uploaded file, so retrying the upload never stores the image twice. */
  key: string;
};

type PickedImage = { uri: string; mimeType?: string | null; fileName?: string | null };

const QUEUED_IMAGE_DIRECTORY = "offline-images";

function queuedImageDirectory() {
  const directory = new Directory(Paths.document, QUEUED_IMAGE_DIRECTORY);
  directory.create({ intermediates: true, idempotent: true });
  return directory;
}

function getFileExtension(image: PickedImage) {
  const fromName = image.fileName?.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  return image.mimeType?.split("/")[1]?.split("+")[0] ?? "jpg";
}

export async function keepImageForSync(image: PickedImage): Promise<QueuedImage> {
  const key = Crypto.randomUUID();
  const target = new File(queuedImageDirectory(), `${key}.${getFileExtension(image)}`);
  await new File(image.uri).copy(target);

  return {
    uri: target.uri,
    mimeType: image.mimeType ?? null,
    fileName: image.fileName ?? target.name,
    key,
  };
}
