"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { DropZone } from "@/components/admin/DropZone";
import { prepareImage, uploadToStorage, UploadError } from "@/components/admin/image-upload";
import { useAdminAction } from "@/components/admin/use-action";
import { Labeled, TextInput, Toggle } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { deleteTile, saveTile } from "@/lib/admin/actions/merch";
import type { MerchTile } from "@/lib/admin/merch";
import { publicStorageUrl } from "@/lib/supabase/storage";

type Props = { categoryId: number | null; tile?: MerchTile; defaultAfter: number; showPosition: boolean; onDone?: () => void };

/** Add or edit a lifestyle tile: image, caption, link, width, visible. */
export function TileForm({ categoryId, tile, defaultAfter, showPosition, onDone }: Props) {
  const [path, setPath] = useState(tile?.imagePath ?? "");
  const [alt, setAlt] = useState(tile?.alt ?? "");
  const [caption, setCaption] = useState(tile?.caption ?? "");
  const [link, setLink] = useState(tile?.linkUrl ?? "");
  const [span, setSpan] = useState<1 | 2>(tile?.span ?? 2);
  const [after, setAfter] = useState(tile?.insertAfter ?? defaultAfter);
  const [active, setActive] = useState(tile?.isActive ?? true);
  const [uploading, setUploading] = useState(false);
  const save = useAdminAction(saveTile);
  const remove = useAdminAction(deleteTile);
  const id = tile ? `tile-${tile.id}` : "tile-new";

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const img = await prepareImage(file);
      setPath(await uploadToStorage("site-media", `tiles/${img.hash}.${img.ext}`, img.blob, img.contentType));
    } catch (e) {
      toast.error(e instanceof UploadError ? e.message : "The upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await save.run({ id: tile?.id ?? null, categoryId, imagePath: path, alt, caption, linkUrl: link, span, insertAfter: after, isActive: active });
        if (r.ok) onDone?.();
      }}
      className="grid gap-4 sm:grid-cols-[200px_minmax(0,1fr)]"
    >
      <div>
        {path ? (
          <div className="relative mb-2 aspect-video overflow-hidden bg-ivory">
            <Image src={publicStorageUrl("site-media", path)} alt="" fill sizes="200px" className="object-cover" />
          </div>
        ) : null}
        <DropZone compact={Boolean(path)} accept="image/jpeg,image/png,image/webp,image/avif" busy={uploading} onFile={upload} label={path ? "Replace image" : "Upload image"} hint="Landscape works best" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Labeled label="Image description" htmlFor={`${id}-alt`} className="sm:col-span-2">
          <TextInput id={`${id}-alt`} value={alt} onChange={(e) => setAlt(e.target.value)} maxLength={200} placeholder="Model wearing Meher Earrings at a wedding" />
        </Labeled>
        <Labeled label="Caption (optional)" htmlFor={`${id}-caption`}>
          <TextInput id={`${id}-caption`} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={120} />
        </Labeled>
        <Labeled label="Link (optional)" htmlFor={`${id}-link`} hint="e.g. /product/meher-earrings">
          <TextInput id={`${id}-link`} value={link} onChange={(e) => setLink(e.target.value)} maxLength={300} />
        </Labeled>
        <fieldset>
          <legend className="mb-1.5 text-body-sm">Width</legend>
          <div className="flex gap-2">
            {([1, 2] as const).map((s) => (
              <label key={s} className={`inline-flex min-h-11 cursor-pointer items-center rounded-xs border px-4 text-body-sm ${span === s ? "border-ink bg-ink text-ivory" : "border-mist"}`}>
                <input type="radio" className="sr-only" checked={span === s} onChange={() => setSpan(s)} />
                {s === 1 ? "1 column" : "2 columns"}
              </label>
            ))}
          </div>
        </fieldset>
        {showPosition ? (
          <Labeled label="Show after product number" htmlFor={`${id}-after`}>
            <TextInput id={`${id}-after`} type="number" min={0} value={after} onChange={(e) => setAfter(Math.max(0, Number(e.target.value) || 0))} />
          </Labeled>
        ) : null}
        <Toggle checked={active} onChange={setActive} label={active ? "Shown" : "Hidden"} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={save.pending || uploading}>
            {save.pending ? "Saving…" : tile ? "Save tile" : "Add tile"}
          </Button>
          {tile ? (
            <Button variant="link" className="px-3 text-plum" disabled={remove.pending} onClick={() => window.confirm("Remove this tile?") && remove.run({ id: tile.id })}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
