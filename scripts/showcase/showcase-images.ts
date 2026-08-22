import { PNG } from "pngjs";

import type { ShowcaseStoreAssetSpec } from "./showcase.config.ts";

export interface PngMetadata {
  readonly width: number;
  readonly height: number;
  readonly bitDepth: number;
  readonly colorType: number;
  readonly hasAlpha: boolean;
}

export function readPngMetadata(bytes: Uint8Array): PngMetadata {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.byteLength < 26 || !pngSignature.every((value, index) => bytes[index] === value)) {
    throw new Error("Captured file is not a valid PNG.");
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const colorType = view.getUint8(25);
  return {
    width: view.getUint32(16),
    height: view.getUint32(20),
    bitDepth: view.getUint8(24),
    colorType,
    hasAlpha: colorType === 4 || colorType === 6,
  };
}

/**
 * Both stores reject PNGs with an alpha channel. Simulator and emulator captures
 * carry one, so every file is rewritten as 8-bit, 24-bit RGB before validation.
 */
export function normalizeStorePng(bytes: Uint8Array): Buffer {
  const png = PNG.sync.read(Buffer.from(bytes));
  return PNG.sync.write(png, {
    bitDepth: 8,
    colorType: 2,
    inputColorType: 6,
    inputHasAlpha: true,
  });
}

export function validateStoreAsset(
  spec: ShowcaseStoreAssetSpec,
  bytes: Uint8Array,
  label = "Screenshot",
): PngMetadata {
  const metadata = readPngMetadata(bytes);
  if (metadata.width !== spec.width || metadata.height !== spec.height) {
    throw new Error(
      `${label} is ${metadata.width}×${metadata.height}; ${spec.store} requires ${spec.width}×${spec.height}.`,
    );
  }
  if (metadata.bitDepth !== 8 || metadata.colorType !== 2 || metadata.hasAlpha) {
    throw new Error(
      `${label} must be an 8-bit, 24-bit RGB PNG without alpha (found bit depth ${metadata.bitDepth}, color type ${metadata.colorType}).`,
    );
  }
  if (spec.maximumFileSizeBytes && bytes.byteLength > spec.maximumFileSizeBytes) {
    throw new Error(
      `${label} is ${bytes.byteLength} bytes; ${spec.store} allows at most ${spec.maximumFileSizeBytes} bytes.`,
    );
  }
  if (spec.store === "google-play") {
    const shortestSide = Math.min(metadata.width, metadata.height);
    const longestSide = Math.max(metadata.width, metadata.height);
    if (shortestSide < 320 || longestSide > 3_840 || longestSide > shortestSide * 2) {
      throw new Error(
        `${label} does not meet Google Play's 320–3,840 px bounds and 2:1 maximum aspect ratio.`,
      );
    }
    if (metadata.width * 16 !== metadata.height * 9) {
      throw new Error(`${label} must use Google Play's recommended portrait 9:16 aspect ratio.`);
    }
  }
  return metadata;
}

export function validateStoreAssetCount(
  spec: ShowcaseStoreAssetSpec,
  count: number,
  requireMinimum: boolean,
): void {
  if (count > spec.maximumUploadCount) {
    throw new Error(
      `${spec.directory} contains ${count} screenshots; ${spec.store} allows at most ${spec.maximumUploadCount}.`,
    );
  }
  if (requireMinimum && count < spec.minimumUploadCount) {
    throw new Error(
      `${spec.directory} contains ${count} screenshots; ${spec.store} requires at least ${spec.minimumUploadCount}.`,
    );
  }
}
