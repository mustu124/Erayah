import type { Metadata } from "next";
import type { ReactNode } from "react";

import { Accordion } from "@/components/ui/Accordion";
import { InstagramGlyph, WhatsAppGlyph } from "@/components/ui/BrandIcons";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Hairline } from "@/components/ui/Hairline";
import { Input } from "@/components/ui/Input";
import { ElephantMark, Tagline, Wordmark } from "@/components/ui/Logo";
import { Pill } from "@/components/ui/Pill";
import { Price } from "@/components/ui/Price";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { currentMonthLabel } from "@/lib/format/date";

import { InteractiveDemos } from "./InteractiveDemos";

export const metadata: Metadata = {
  title: "Styleguide",
  robots: { index: false, follow: false },
};

const COLOURS = [
  ["ink", "#311829", "bg-ink"],
  ["plum", "#600e54", "bg-plum"],
  ["gold", "#b4a07c", "bg-gold"],
  ["ivory", "#f9eee1", "bg-ivory"],
  ["paper", "#ffffff", "bg-paper"],
  ["paper-warm", "#fdf9f4", "bg-paper-warm"],
  ["mist", "#e5e5e5", "bg-mist"],
] as const;

export default async function StyleguidePage() {
  const month = await currentMonthLabel();

  return (
    <div className="mx-auto max-w-5xl space-y-16 px-4 py-12 md:px-6">
      <header>
        <p className="text-label text-ink/60 uppercase">Internal · not linked</p>
        <h1 className="mt-2 font-heading text-h1">Styleguide</h1>
      </header>

      <Block title="Brand">
        <div className="flex flex-wrap items-end gap-10">
          <Wordmark className="h-8 w-auto text-ink" />
          <ElephantMark className="h-16 w-auto text-ink" title="Elephant mark" />
          <Tagline className="h-3 w-auto text-ink" />
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-10 bg-ink p-6 text-ivory">
          <Wordmark className="h-8 w-auto" />
          <ElephantMark className="h-16 w-auto" title="Elephant mark" />
        </div>
      </Block>

      <Block title="Colours">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {COLOURS.map(([name, hex, bg]) => (
            <div key={name}>
              <div className={`h-16 border border-mist ${bg}`} />
              <p className="mt-2 text-body-sm">{name}</p>
              <p className="text-caption text-ink/60">{hex}</p>
            </div>
          ))}
          <div>
            <div className="h-16 bg-gradient-gold" />
            <p className="mt-2 text-body-sm">gradient-gold</p>
            <p className="text-caption text-ink/60">#b4a07c → #e9dcc3</p>
          </div>
        </div>
      </Block>

      <Block title="Type">
        <div className="space-y-3">
          <p className="font-heading text-display">Display 48</p>
          <p className="font-heading text-h1">Heading 1 — Heirlooms, reimagined</p>
          <p className="font-heading text-h2">Heading 2 — New Arrivals</p>
          <p className="font-heading text-h3">Heading 3 — Dahlia Earrings</p>
          <p className="text-body-lg">Body 15 — Handcrafted by traditional artisans.</p>
          <p className="text-body">Body 14 — 22kt gold-plated silver alloy jhumkis with white stone polki.</p>
          <p className="text-body-sm">Body 13 — Comes with a screw-back closure.</p>
          <p className="text-caption">Caption 12 — Delivered in 7–10 working days.</p>
          <p className="text-label uppercase">Label 11 — Shop by category</p>
          <p className="font-heading text-h3">
            Can use italic or <span className="font-script">this to highlight</span>.
          </p>
        </div>
      </Block>

      <Block title="Section header">
        <SectionHeader title="Best Sellers" label={month} />
        <SectionHeader title="New Arrivals" label={month} className="mt-8" />
      </Block>

      <Block title="Buttons">
        <div className="flex flex-wrap items-center gap-4">
          <Button>Add to cart</Button>
          <Button variant="outline">View cart</Button>
          <ButtonLink href="/shop" variant="link">
            Shop All Best Sellers
          </ButtonLink>
          <Button disabled>Sold out</Button>
        </div>
      </Block>

      <Block title="Price and pill">
        <div className="flex flex-wrap items-center gap-6">
          <Price amount={235000} className="text-body" />
          <Price amount={1150000} className="font-heading text-h3" />
          <div className="flex h-24 w-56 items-end justify-center bg-gold/40 pb-3">
            <Pill>Pendants</Pill>
          </div>
        </div>
      </Block>

      <Block title="Form controls">
        <div className="grid max-w-md gap-4">
          <Input placeholder="Full name" aria-label="Full name" />
          <Select aria-label="Sort by" defaultValue="featured">
            <option value="featured">Featured</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest to Oldest</option>
          </Select>
          <Checkbox label="In stock" defaultChecked />
          <Checkbox label="Gifts for Her" />
        </div>
      </Block>

      <Block title="Hairlines">
        <Hairline />
        <Hairline tone="gold" className="mt-6" />
      </Block>

      <Block title="Accordion">
        <div className="max-w-md">
          <Accordion title="Shop" defaultOpen>
            <p className="text-body-sm">Open by default, − icon.</p>
            <Accordion title="Category" size="sm">
              <p className="text-body-sm">Nested, small bold uppercase.</p>
            </Accordion>
          </Accordion>
          <Accordion title="About Erayah">
            <p className="text-body-sm">Closed, + icon.</p>
          </Accordion>
        </div>
      </Block>

      <Block title="Skeleton">
        <div className="grid max-w-md grid-cols-2 gap-4">
          <Skeleton className="aspect-[4/5]" />
          <Skeleton className="aspect-[4/5]" />
        </div>
      </Block>

      <Block title="Brand icons">
        <div className="flex gap-4 text-ink">
          <InstagramGlyph />
          <WhatsAppGlyph />
        </div>
      </Block>

      <InteractiveDemos />
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-6 border-b border-mist pb-2 font-body text-label font-medium text-ink/60 uppercase">{title}</h2>
      {children}
    </section>
  );
}
