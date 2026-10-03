"use client";

import { X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";

import { MarkdownField } from "@/components/admin/fields";
import { DropZone } from "@/components/admin/DropZone";
import { prepareImage, uploadToStorage, UploadError } from "@/components/admin/image-upload";
import { useAdminAction } from "@/components/admin/use-action";
import { Labeled, Panel, TextArea, TextInput } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { savePage } from "@/lib/admin/actions/content";
import { publicStorageUrl } from "@/lib/supabase/storage";

type Img = { path: string; alt: string; role: "hero" | "founder" | "story" };
type Page = { slug: "about" | "shipping-returns" | "privacy-policy" | "terms"; title: string; body: string; seoTitle: string; seoDescription: string; images: Img[] };

export function PageEditor({ page }: { page: Page }) {
  const [v, setV] = useState(page);
  const [busy, setBusy] = useState<string | null>(null);
  const save = useAdminAction(savePage);
  const withImages = page.slug === "about";

  const upload = async (file: File, role: Img["role"]) => {
    setBusy(role);
    try {
      const img = await prepareImage(file);
      const path = await uploadToStorage("site-media", `about/${img.hash}.${img.ext}`, img.blob, img.contentType);
      setV((prev) => ({
        ...prev,
        images:
          role === "story"
            ? [...prev.images, { path, alt: "", role }]
            : [{ path, alt: role === "founder" ? "Erayah's founder" : "Erayah jewellery", role }, ...prev.images.filter((i) => i.role !== role)],
      }));
      toast.success("Photo uploaded. Remember to save the page.");
    } catch (e) {
      toast.error(e instanceof UploadError ? e.message : "The upload failed. Please try again.");
    } finally {
      setBusy(null);
    }
  };
  const founder = v.images.find((i) => i.role === "founder");
  const hero = v.images.find((i) => i.role === "hero");
  const story = v.images.filter((i) => i.role === "story");
  const setAlt = (path: string, alt: string) => setV({ ...v, images: v.images.map((i) => (i.path === path ? { ...i, alt } : i)) });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.run(v);
      }}
      className="space-y-6"
    >
      <Panel>
        <div className="space-y-4">
          <Labeled label="Title" htmlFor="title" error={save.fields.title}>
            <TextInput id="title" value={v.title} onChange={(e) => setV({ ...v, title: e.target.value })} maxLength={120} />
          </Labeled>
          {withImages ? (
            <div className="bg-ivory px-4 py-3 text-body-sm text-ink/80">
              <p>
                Each <code>## Heading</code> starts a section. The first three become the story blocks, each beside a story image in order. A heading with
                &ldquo;founder&rdquo; in it becomes the founder section (put the name in bold), and one with &ldquo;craft&rdquo; becomes the craft section.
              </p>
            </div>
          ) : null}
          <Labeled label="Text" htmlFor="body">
            <MarkdownField id="body" rows={18} value={v.body} onChange={(body) => setV({ ...v, body })} />
          </Labeled>
        </div>
      </Panel>

      {withImages ? (
        <Panel title="Photos">
          <div className="mb-6">
            <p className="mb-1.5 text-body-sm">Opening image (wide, under “Heirlooms, reimagined.”)</p>
            {hero ? (
              <div className="space-y-2">
                <div className="relative aspect-[21/9] max-w-2xl overflow-hidden bg-ivory">
                  <Image src={publicStorageUrl("site-media", hero.path)} alt={hero.alt} fill sizes="640px" className="object-cover" />
                </div>
                <TextInput aria-label="Opening image description" value={hero.alt} onChange={(e) => setAlt(hero.path, e.target.value)} maxLength={200} className="max-w-2xl" />
              </div>
            ) : (
              <p className="mb-2 text-caption text-ink/60">Until you add one, the first homepage slide is used.</p>
            )}
            <DropZone className="mt-2 max-w-2xl" compact={Boolean(hero)} accept="image/jpeg,image/png,image/webp,image/avif" busy={busy === "hero"} onFile={(f) => upload(f, "hero")} label={hero ? "Replace" : "Upload opening image"} hint="Landscape" />
          </div>
          <div className="grid gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
            <div>
              <p className="mb-1.5 text-body-sm">Founder photo</p>
              {founder ? (
                <div className="space-y-2">
                  <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
                    <Image src={publicStorageUrl("site-media", founder.path)} alt={founder.alt} fill sizes="220px" className="object-cover" />
                  </div>
                  <TextInput aria-label="Founder photo description" value={founder.alt} onChange={(e) => setAlt(founder.path, e.target.value)} maxLength={200} />
                </div>
              ) : null}
              <DropZone className={founder ? "mt-2" : "aspect-[4/5]"} compact={Boolean(founder)} accept="image/jpeg,image/png,image/webp,image/avif" busy={busy === "founder"} onFile={(f) => upload(f, "founder")} label={founder ? "Replace" : "Upload founder photo"} />
            </div>
            <div>
              <p className="mb-1.5 text-body-sm">Story images</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {story.map((img) => (
                  <div key={img.path} className="space-y-1.5">
                    <div className="relative aspect-square overflow-hidden bg-ivory">
                      <Image src={publicStorageUrl("site-media", img.path)} alt={img.alt} fill sizes="180px" className="object-cover" />
                      <button type="button" aria-label="Remove photo" onClick={() => setV({ ...v, images: v.images.filter((i) => i.path !== img.path) })} className="absolute top-1 right-1 flex size-9 items-center justify-center rounded-full bg-paper/90">
                        <Icon icon={X} size={14} />
                      </button>
                    </div>
                    <TextInput aria-label="Photo description" value={img.alt} onChange={(e) => setAlt(img.path, e.target.value)} maxLength={200} placeholder="Describe the photo" className="h-9 text-body-sm" />
                  </div>
                ))}
                <DropZone className="aspect-square" accept="image/jpeg,image/png,image/webp,image/avif" busy={busy === "story"} onFile={(f) => upload(f, "story")} label="Add a photo" />
              </div>
            </div>
          </div>
          {save.fields.images ? <p className="mt-2 text-caption text-plum">{save.fields.images}</p> : null}
        </Panel>
      ) : null}

      <Panel title="Search engines (optional)">
        <div className="grid gap-4">
          <Labeled label={`SEO title (${v.seoTitle.length}/70)`} htmlFor="seo-title">
            <TextInput id="seo-title" value={v.seoTitle} onChange={(e) => setV({ ...v, seoTitle: e.target.value })} maxLength={70} />
          </Labeled>
          <Labeled label={`SEO description (${v.seoDescription.length}/170)`} htmlFor="seo-description">
            <TextArea id="seo-description" rows={2} value={v.seoDescription} onChange={(e) => setV({ ...v, seoDescription: e.target.value })} maxLength={170} />
          </Labeled>
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-4 border-t border-mist bg-paper-warm/95 px-4 py-3 backdrop-blur sm:mx-0 sm:px-0">
        <Button type="submit" disabled={save.pending}>
          {save.pending ? "Saving…" : "Save page"}
        </Button>
      </div>
    </form>
  );
}
