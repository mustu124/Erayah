"use client";

import Image from "next/image";
import { useState } from "react";

import { MediaField } from "@/components/admin/MediaField";
import { DragHandle, Sortable } from "@/components/admin/Sortable";
import { useAdminAction } from "@/components/admin/use-action";
import { Labeled, TextArea, TextInput, Toggle } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { deleteHeroSlide, reorderHeroSlides, saveCategoryImage, saveHeroSlide, saveHomepageText } from "@/lib/admin/actions/homepage";
import { publicStorageUrl } from "@/lib/supabase/storage";

export type Slide = { id: number; desktopPath: string; mobilePath: string; alt: string; label: string; linkUrl: string; isActive: boolean };

export function SlideForm({ slide, onDone }: { slide?: Slide; onDone?: () => void }) {
  const [v, setV] = useState<Omit<Slide, "id">>(slide ?? { desktopPath: "", mobilePath: "", alt: "", label: "", linkUrl: "", isActive: true });
  const save = useAdminAction(saveHeroSlide);
  const remove = useAdminAction(deleteHeroSlide);
  const id = slide ? `slide-${slide.id}` : "slide-new";
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await save.run({ id: slide?.id ?? null, ...v });
        if (r.ok && !slide) {
          setV({ desktopPath: "", mobilePath: "", alt: "", label: "", linkUrl: "", isActive: true });
          onDone?.();
        }
      }}
      className="grid gap-4 md:grid-cols-[160px_110px_minmax(0,1fr)]"
    >
      <MediaField folder="hero" value={v.desktopPath} onChange={(p) => setV({ ...v, desktopPath: p })} label="Desktop image" hint="Portrait, at least 1600px tall" aspect="aspect-[4/5]" />
      <MediaField folder="hero" value={v.mobilePath} onChange={(p) => setV({ ...v, mobilePath: p })} label="Mobile image" hint="Portrait" aspect="aspect-[3/4]" />
      <div className="grid content-start gap-3 sm:grid-cols-2">
        <Labeled label="Image description" htmlFor={`${id}-alt`} className="sm:col-span-2">
          <TextInput id={`${id}-alt`} value={v.alt} onChange={(e) => setV({ ...v, alt: e.target.value })} maxLength={200} />
        </Labeled>
        <Labeled label="Pill label" htmlFor={`${id}-label`} hint="e.g. Earrings">
          <TextInput id={`${id}-label`} value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} maxLength={40} />
        </Labeled>
        <Labeled label="Link" htmlFor={`${id}-link`} hint="e.g. /shop/earrings">
          <TextInput id={`${id}-link`} value={v.linkUrl} onChange={(e) => setV({ ...v, linkUrl: e.target.value })} maxLength={300} />
        </Labeled>
        <Toggle checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} label={v.isActive ? "Shown" : "Hidden"} />
        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <Button type="submit" disabled={save.pending}>
            {save.pending ? "Saving…" : slide ? "Save slide" : "Add slide"}
          </Button>
          {slide ? (
            <Button variant="link" className="px-3 text-plum" onClick={() => window.confirm("Remove this slide?") && remove.run({ id: slide.id })}>
              Remove
            </Button>
          ) : null}
        </div>
      </div>
    </form>
  );
}

export function SlideOrder({ slides }: { slides: Slide[] }) {
  const [order, setOrder] = useState(slides);
  const [source, setSource] = useState(slides);
  if (source !== slides) {
    setSource(slides);
    setOrder(slides);
  }
  const reorder = useAdminAction(reorderHeroSlides);
  return (
    <Sortable
      items={order}
      getId={(s) => s.id}
      layout="grid"
      className="grid grid-cols-3 gap-3 sm:grid-cols-5"
      onReorder={(next) => {
        setOrder(next);
        reorder.run({ ids: next.map((s) => s.id) });
      }}
    >
      {(s, handle, i) => (
        <div className={s.isActive ? undefined : "opacity-50"}>
          <div className="relative aspect-[4/5] overflow-hidden bg-ivory">
            <Image src={publicStorageUrl("site-media", s.desktopPath)} alt={s.alt} fill sizes="160px" className="object-cover" />
            <div className="absolute top-1 left-1 rounded-xs bg-paper/90">
              <DragHandle handle={handle} label={`Move slide ${i + 1}`} />
            </div>
          </div>
          <p className="mt-1 truncate text-caption">
            {String(i + 1).padStart(2, "0")} {s.label}
            {s.isActive ? "" : " (hidden)"}
          </p>
        </div>
      )}
    </Sortable>
  );
}

export function CategoryImage({ categoryId, name, path }: { categoryId: number; name: string; path: string }) {
  const save = useAdminAction(saveCategoryImage);
  return <MediaField folder="categories" value={path} onChange={(imagePath) => save.run({ categoryId, imagePath })} label={name} aspect="aspect-square" hint="Square works best" />;
}

type Text = { text: string; highlight: string; ctaLabel: string; ctaUrl: string; announcement: string };

export function HomepageText({ initial }: { initial: Text }) {
  const [v, setV] = useState(initial);
  const save = useAdminAction(saveHomepageText);
  const set = (k: keyof Text) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setV({ ...v, [k]: e.target.value });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save.run(v);
      }}
      className="grid gap-4 sm:grid-cols-2"
    >
      <Labeled label="Announcement bar" htmlFor="announcement" className="sm:col-span-2" hint="One short line at the very top of every page. Leave empty to hide it.">
        <TextInput id="announcement" value={v.announcement} onChange={set("announcement")} maxLength={140} />
      </Labeled>
      <Labeled label="Brand story (2–3 lines)" htmlFor="story" className="sm:col-span-2" error={save.fields.text}>
        <TextArea id="story" rows={3} value={v.text} onChange={set("text")} maxLength={600} />
      </Labeled>
      <Labeled label="Highlighted phrase" htmlFor="highlight" error={save.fields.highlight} hint="Shown in script. Must appear in the story exactly, e.g. Heirlooms, Reimagined">
        <TextInput id="highlight" value={v.highlight} onChange={set("highlight")} maxLength={80} />
      </Labeled>
      <div className="grid grid-cols-2 gap-3">
        <Labeled label="Button label" htmlFor="cta-label">
          <TextInput id="cta-label" value={v.ctaLabel} onChange={set("ctaLabel")} maxLength={30} placeholder="Our Story" />
        </Labeled>
        <Labeled label="Button link" htmlFor="cta-url" error={save.fields.ctaUrl}>
          <TextInput id="cta-url" value={v.ctaUrl} onChange={set("ctaUrl")} maxLength={300} placeholder="/about" />
        </Labeled>
      </div>
      <div className="sm:col-span-2">
        <Button type="submit" disabled={save.pending}>
          {save.pending ? "Saving…" : "Save text"}
        </Button>
      </div>
    </form>
  );
}
