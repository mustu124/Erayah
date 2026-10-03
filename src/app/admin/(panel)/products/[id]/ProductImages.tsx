"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { DropZone } from "@/components/admin/DropZone";
import { prepareImage, prepareVideo, uploadToStorage, UploadError } from "@/components/admin/image-upload";
import { DragHandle, Sortable } from "@/components/admin/Sortable";
import { useAdminAction } from "@/components/admin/use-action";
import { inputCls } from "@/components/admin/ui";
import { deleteProductImage, reorderProductImages, saveProductImage, updateImageAlt } from "@/lib/admin/actions/products";
import type { EditableImage, ImageRole } from "@/lib/admin/products";
import { cn } from "@/lib/cn";

const REQUIRED: ImageRole[] = ["worn_closeup", "lifestyle", "product_only", "detail"];
const OPTIONAL: ImageRole[] = ["flat_lay", "video"];

const INFO: Record<ImageRole, { label: string; hint: string; alt: (name: string) => string }> = {
  worn_closeup: { label: "1 · Worn close-up", hint: "On a model, close. Shown on product cards.", alt: (n) => `${n}, worn` },
  lifestyle: { label: "2 · Lifestyle", hint: "A styled scene. Shown when a card is hovered.", alt: (n) => `${n}, styled` },
  product_only: { label: "3 · Product only", hint: "The piece alone on a plain background.", alt: (n) => `${n} on a plain background` },
  detail: { label: "4 · Detail close-up", hint: "Stones, setting or clasp up close.", alt: (n) => `Detail of the ${n}` },
  flat_lay: { label: "Flat lay (optional)", hint: "Arranged and photographed from above.", alt: (n) => `${n}, flat lay` },
  video: { label: "Video (optional)", hint: "Short and silent. MP4 or WebM, under 50 MB.", alt: (n) => `Video of the ${n}` },
};

type Props = { productId: number; slug: string; productName: string; published: boolean; images: EditableImage[] };

export function ProductImages({ productId, slug, productName, published, images }: Props) {
  const [order, setOrder] = useState(images);
  const [busyRole, setBusyRole] = useState<string | null>(null);
  const save = useAdminAction(saveProductImage);
  const remove = useAdminAction(deleteProductImage);
  const reorder = useAdminAction(reorderProductImages);
  const altAction = useAdminAction(updateImageAlt);
  // New photos from the server (after an upload) replace the local order.
  const [source, setSource] = useState(images);
  if (source !== images) {
    setSource(images);
    setOrder(images);
  }

  const present = new Set(order.map((i) => i.role));
  const missing = REQUIRED.filter((r) => !present.has(r));
  const emptySlots = [...REQUIRED, ...OPTIONAL].filter((r) => !present.has(r));

  const upload = async (file: File, role: ImageRole, replace?: EditableImage) => {
    const key = replace ? `replace-${replace.id}` : role;
    setBusyRole(key);
    try {
      const image = role === "video" ? null : await prepareImage(file);
      const prepared = image ?? (await prepareVideo(file));
      const path = `products/${slug}/${role}-${prepared.hash}.${prepared.ext}`;
      await uploadToStorage("product-images", path, prepared.blob, prepared.contentType);
      await save.run({
        productId,
        replaceId: replace?.id ?? null,
        path,
        role,
        alt: replace?.alt || INFO[role].alt(productName),
        width: image?.width ?? null,
        height: image?.height ?? null,
        blurDataUrl: image?.blurDataUrl ?? null,
      });
    } catch (error) {
      toast.error(error instanceof UploadError ? error.message : "The upload failed. Please try again.");
    } finally {
      setBusyRole(null);
    }
  };

  return (
    <div>
      {published && missing.length ? (
        <p role="alert" className="mb-4 border border-plum/40 bg-[#f8ecef] px-4 py-3 text-body-sm text-plum">
          This piece is live without {missing.length === 4 ? "any of the 4 required photos" : `${missing.map((r) => INFO[r].label.replace(/^\d · /, "")).join(", ")}`}. Shoppers see a plain
          placeholder where a photo is missing.
        </p>
      ) : null}

      {order.length ? (
        <>
          <p className="mb-2 text-caption text-ink/60">Drag photos by the grip to change the order on the product page.</p>
          <Sortable
            items={order}
            getId={(i) => i.id}
            layout="grid"
            className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4"
            onReorder={(next) => {
              setOrder(next);
              reorder.run({ productId, ids: next.map((i) => i.id) }, { quiet: true });
            }}
          >
            {(img, handle) => (
              <figure className="border border-mist bg-paper">
                <div className="relative aspect-[4/5] bg-ivory">
                  {img.role === "video" ? (
                    <video src={img.url} muted loop playsInline className="h-full w-full object-cover" />
                  ) : (
                    <Image src={img.url} alt={img.alt} fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" />
                  )}
                  <div className="absolute top-1 left-1 rounded-xs bg-paper/90">
                    <DragHandle handle={handle} label={`Move ${INFO[img.role].label}`} />
                  </div>
                </div>
                <figcaption className="space-y-2 p-2">
                  <p className="text-caption font-medium text-ink">{INFO[img.role].label}</p>
                  <label className="sr-only" htmlFor={`alt-${img.id}`}>
                    Photo description
                  </label>
                  <input
                    id={`alt-${img.id}`}
                    defaultValue={img.alt}
                    maxLength={200}
                    onBlur={(e) => {
                      const alt = e.target.value.trim();
                      if (alt && alt !== img.alt) altAction.run({ id: img.id, alt });
                    }}
                    className={cn(inputCls, "h-9 text-body-sm")}
                    placeholder="Describe the photo"
                  />
                  <DropZone
                    compact
                    accept={img.role === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
                    busy={busyRole === `replace-${img.id}`}
                    onFile={(file) => upload(file, img.role, img)}
                    label="Replace"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (window.confirm("Remove this photo?")) remove.run({ id: img.id });
                    }}
                    className="min-h-9 w-full text-caption text-ink/60 underline decoration-ink/30 underline-offset-4 hover:text-plum"
                  >
                    Remove
                  </button>
                </figcaption>
              </figure>
            )}
          </Sortable>
        </>
      ) : null}

      {emptySlots.length ? (
        <div className={cn("grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4", order.length && "mt-4")}>
          {emptySlots.map((role) => (
            <div key={role} className={cn("flex flex-col", REQUIRED.includes(role) && published && "outline outline-1 outline-plum/40")}>
              <DropZone
                className="aspect-[4/5]"
                accept={role === "video" ? "video/mp4,video/webm" : "image/jpeg,image/png,image/webp,image/avif"}
                busy={busyRole === role}
                onFile={(file) => upload(file, role)}
                label={INFO[role].label}
                hint={INFO[role].hint}
              />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
