import sharp from "sharp";

import { getProduct } from "@/lib/data/product";

// Link previews (Instagram, WhatsApp, Facebook) want a JPEG; product photos are
// WebP. This renders the worn close-up whole, centred on an ivory 1200×630 card.

export const size = { width: 1200, height: 630 };
export const contentType = "image/jpeg";
export const alt = "Erayah jewellery";

const IVORY = { r: 0xf9, g: 0xee, b: 0xe1 };

export default async function OpenGraphImage({ params }: { params: Promise<{ slug: string }> }) {
  const product = await getProduct((await params).slug);
  const image = product?.gallery.find((g) => g.role === "worn_closeup") ?? product?.gallery.find((g) => g.role !== "video");

  let photo: Buffer | null = null;
  if (image) {
    const response = await fetch(image.url);
    if (response.ok) {
      photo = await sharp(Buffer.from(await response.arrayBuffer()))
        .resize({ width: size.width, height: size.height, fit: "contain", background: IVORY })
        .toBuffer();
    }
  }

  const base = photo ? sharp(photo) : sharp({ create: { ...size, channels: 3, background: IVORY } });
  const jpeg = await base
    .flatten({ background: IVORY })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();

  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": contentType, "Cache-Control": "public, max-age=86400, s-maxage=604800" },
  });
}
