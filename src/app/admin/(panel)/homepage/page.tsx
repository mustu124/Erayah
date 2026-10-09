import type { Metadata } from "next";
import Link from "next/link";

import { PageHeader, Panel } from "@/components/admin/ui";
import { buttonClasses } from "@/components/ui/Button";
import { requireAdminPage } from "@/lib/admin/auth";
import { listCategories } from "@/lib/admin/products";
import { createAdminClient } from "@/lib/supabase/admin";

import { CategoryImage, HomepageText, type Slide, SlideForm, SlideOrder } from "./HomepageForms";

export const metadata: Metadata = { title: "Homepage" };

export default async function HomepageAdminPage() {
  await requireAdminPage("owner");
  const db = createAdminClient();
  const [{ data: slideRows }, categories, { data: settings }] = await Promise.all([
    db.from("hero_slides").select("id, image_desktop_path, image_mobile_path, alt, label, link_url, is_active, sort_order").order("sort_order"),
    listCategories(),
    db.from("site_settings").select("announcement_text, brand_story_text, brand_story_highlight, brand_story_cta_label, brand_story_cta_url").eq("id", 1).single(),
  ]);
  const slides: Slide[] = (slideRows ?? []).map((s) => ({
    id: s.id,
    desktopPath: s.image_desktop_path,
    mobilePath: s.image_mobile_path,
    alt: s.alt,
    label: s.label ?? "",
    linkUrl: s.link_url ?? "",
    isActive: s.is_active,
  }));

  return (
    <>
      <PageHeader
        title="Homepage"
        description="Hero, Shop by Category, New Arrivals, Most Loved and the brand story, in that order."
        actions={
          <a href="/" target="_blank" rel="noopener noreferrer" className={buttonClasses("outline")}>
            Preview ↗
          </a>
        }
      />
      <div className="space-y-6">
        <Panel title="Hero slides">
          {slides.length ? (
            <>
              <p className="mb-3 text-body-sm text-ink/65">Drag to change the order. Changes save at once.</p>
              <SlideOrder slides={slides} />
            </>
          ) : (
            <p className="text-body-sm text-ink/60">No slides yet.</p>
          )}
        </Panel>
        {slides.map((s, i) => (
          <Panel key={s.id} title={`Slide ${String(i + 1).padStart(2, "0")}${s.label ? ` · ${s.label}` : ""}`}>
            <SlideForm slide={s} />
          </Panel>
        ))}
        <Panel title="Add a slide">
          <SlideForm />
        </Panel>

        <Panel title="Shop by Category images">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {categories.map((c) => (
              <CategoryImage key={c.id} categoryId={c.id} name={c.name} path={c.image_path ?? ""} />
            ))}
          </div>
        </Panel>

        <Panel title="New Arrivals and Most Loved">
          <p className="text-body-sm text-ink/75">
            Switch “New Arrival” or “Best Seller” on in a product, then set the order on the merchandising screen.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/admin/merchandising?scope=new-arrivals" className={buttonClasses("outline", "px-4")}>
              Order New Arrivals
            </Link>
            <Link href="/admin/merchandising?scope=best-sellers" className={buttonClasses("outline", "px-4")}>
              Order Most Loved
            </Link>
          </div>
        </Panel>

        <Panel title="Brand story and announcement">
          <HomepageText
            initial={{
              text: settings?.brand_story_text ?? "",
              highlight: settings?.brand_story_highlight ?? "",
              ctaLabel: settings?.brand_story_cta_label ?? "",
              ctaUrl: settings?.brand_story_cta_url ?? "",
              announcement: settings?.announcement_text ?? "",
            }}
          />
        </Panel>
      </div>
    </>
  );
}
