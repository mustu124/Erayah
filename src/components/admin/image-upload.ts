"use client";

import { createClient } from "@/lib/supabase/client";

// Photos are prepared in the browser before upload: resized to at most
// 2400px on the long side, converted to WebP (JPEG where the browser can't
// encode WebP, e.g. Safari), given a tiny blurred placeholder, and named by
// content hash so the CDN can cache them forever.

export type PreparedImage = {
  blob: Blob;
  ext: "webp" | "jpg";
  contentType: string;
  width: number;
  height: number;
  blurDataUrl: string;
  hash: string;
};

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"];
export const VIDEO_TYPES = ["video/mp4", "video/webm"];
const MAX_IMAGE_BYTES = 40 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export class UploadError extends Error {}

async function sha8(blob: Blob) {
  const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return [...new Uint8Array(digest)].slice(0, 4).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

export async function prepareImage(file: File, maxSize = 2400): Promise<PreparedImage> {
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new UploadError("Please upload a JPEG, PNG or WebP photo. (iPhone HEIC photos: export as JPEG first.)");
  }
  if (file.size > MAX_IMAGE_BYTES) throw new UploadError("That photo is over 40 MB. Please use a smaller one.");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => {
    throw new UploadError("This photo couldn't be read. Please try another file.");
  });
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);

  let blob = await toBlob(canvas, "image/webp", 0.86);
  let ext: PreparedImage["ext"] = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await toBlob(canvas, "image/jpeg", 0.88);
    ext = "jpg";
  }
  if (!blob) throw new UploadError("This photo couldn't be converted. Please try another file.");

  // Blur placeholder: 16px wide, same aspect ratio.
  const tiny = document.createElement("canvas");
  tiny.width = 16;
  tiny.height = Math.max(1, Math.round((16 * height) / width));
  tiny.getContext("2d")!.drawImage(bitmap, 0, 0, tiny.width, tiny.height);
  bitmap.close();
  const blurDataUrl = tiny.toDataURL(ext === "webp" ? "image/webp" : "image/jpeg", 0.6);

  return { blob, ext, contentType: blob.type, width, height, blurDataUrl, hash: await sha8(blob) };
}

export async function prepareVideo(file: File) {
  if (!VIDEO_TYPES.includes(file.type)) throw new UploadError("Please upload an MP4 or WebM video.");
  if (file.size > MAX_VIDEO_BYTES) throw new UploadError("Videos must be under 50 MB.");
  return { blob: file as Blob, ext: file.type === "video/webm" ? "webm" : "mp4", contentType: file.type, hash: await sha8(file) };
}

/** Uploads to a storage bucket as the signed-in admin. Returns the stored path. */
export async function uploadToStorage(bucket: "product-images" | "site-media", path: string, blob: Blob, contentType: string) {
  const { error } = await createClient().storage.from(bucket).upload(path, blob, { contentType, cacheControl: "31536000", upsert: true });
  if (error) throw new UploadError(error.message.includes("exceeded") ? "That file is too large." : "The upload failed. Please try again.");
  return path;
}
