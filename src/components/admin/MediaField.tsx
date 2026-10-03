"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { publicStorageUrl } from "@/lib/supabase/storage";

import { DropZone } from "./DropZone";
import { prepareImage, uploadToStorage, UploadError } from "./image-upload";

type Props = {
  /** Storage path in site-media, or "" for none. */
  value: string;
  onChange: (path: string) => void;
  /** Folder in site-media, e.g. "hero" or "categories". */
  folder: string;
  label: string;
  hint?: string;
  aspect?: string;
};

/** Upload one image to site-media (resized, WebP) and preview it. */
export function MediaField({ value, onChange, folder, label, hint, aspect = "aspect-[4/5]" }: Props) {
  const [busy, setBusy] = useState(false);
  const upload = async (file: File) => {
    setBusy(true);
    try {
      const img = await prepareImage(file);
      onChange(await uploadToStorage("site-media", `${folder}/${img.hash}.${img.ext}`, img.blob, img.contentType));
    } catch (e) {
      toast.error(e instanceof UploadError ? e.message : "The upload failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <p className="mb-1.5 text-body-sm text-ink">{label}</p>
      {value ? (
        <div className={`relative mb-2 overflow-hidden bg-ivory ${aspect}`}>
          <Image src={publicStorageUrl("site-media", value)} alt="" fill sizes="240px" className="object-cover" />
        </div>
      ) : null}
      <DropZone compact={Boolean(value)} className={value ? undefined : aspect} accept="image/jpeg,image/png,image/webp,image/avif" busy={busy} onFile={upload} label={value ? "Replace" : "Upload image"} hint={value ? undefined : hint} />
    </div>
  );
}
