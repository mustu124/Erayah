"use client";

import { useId, useState } from "react";

import { MarkdownField } from "@/components/admin/fields";
import { DragHandle, Sortable } from "@/components/admin/Sortable";
import { useAdminAction } from "@/components/admin/use-action";
import { Labeled, TextArea, TextInput, Toggle } from "@/components/admin/ui";
import { Button } from "@/components/ui/Button";
import { deleteFaq, deleteTestimonial, reorderFaqs, reorderTestimonials, saveFaq, saveTestimonial } from "@/lib/admin/actions/content";
import { cn } from "@/lib/cn";

export type Faq = { id: number; question: string; answer: string; group: string; isActive: boolean };
export type Testimonial = { id: number; quote: string; authorName: string; location: string; isActive: boolean };

function useSynced<T>(value: T) {
  const [state, setState] = useState(value);
  const [source, setSource] = useState(value);
  if (source !== value) {
    setSource(value);
    setState(value);
  }
  return [state, setState] as const;
}

export function FaqForm({ faq, groups, onSaved }: { faq?: Faq; groups: string[]; onSaved?: () => void }) {
  const blank = { question: "", answer: "", group: "", isActive: true };
  const [v, setV] = useState(faq ?? { ...blank, id: 0 });
  const save = useAdminAction(saveFaq);
  const remove = useAdminAction(deleteFaq);
  const id = useId();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await save.run({ id: faq?.id ?? null, question: v.question, answer: v.answer, group: v.group, isActive: v.isActive });
        if (r.ok && !faq) {
          setV({ ...blank, id: 0 });
          onSaved?.();
        }
      }}
      className="space-y-3"
    >
      <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Labeled label="Question" htmlFor={`${id}-q`} error={save.fields.question}>
          <TextInput id={`${id}-q`} value={v.question} onChange={(e) => setV({ ...v, question: e.target.value })} maxLength={200} />
        </Labeled>
        <Labeled label="Group" htmlFor={`${id}-g`} hint="e.g. Orders, Payment, Returns">
          <TextInput id={`${id}-g`} list={`${id}-groups`} value={v.group} onChange={(e) => setV({ ...v, group: e.target.value })} maxLength={60} />
          <datalist id={`${id}-groups`}>
            {groups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </Labeled>
      </div>
      <Labeled label="Answer" htmlFor={`${id}-a`} error={save.fields.answer}>
        <MarkdownField id={`${id}-a`} rows={4} value={v.answer} onChange={(answer) => setV({ ...v, answer })} />
      </Labeled>
      <div className="flex flex-wrap items-center gap-3">
        <Toggle checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} label={v.isActive ? "Shown" : "Hidden"} />
        <Button type="submit" disabled={save.pending}>
          {save.pending ? "Saving…" : faq ? "Save" : "Add FAQ"}
        </Button>
        {faq ? (
          <Button variant="link" className="px-3 text-plum" onClick={() => window.confirm("Remove this FAQ?") && remove.run({ id: faq.id })}>
            Remove
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function FaqList({ faqs, groups }: { faqs: Faq[]; groups: string[] }) {
  const [order, setOrder] = useSynced(faqs);
  const reorder = useAdminAction(reorderFaqs);
  return (
    <Sortable
      items={order}
      getId={(f) => f.id}
      className="space-y-2"
      onReorder={(next) => {
        setOrder(next);
        reorder.run({ ids: next.map((f) => f.id) }, { quiet: true });
      }}
    >
      {(f, handle) => (
        <details className={cn("group border border-mist bg-paper", !f.isActive && "opacity-60")}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 pr-3 [&::-webkit-details-marker]:hidden">
            <DragHandle handle={handle} label={`Move “${f.question}”`} />
            <span className="flex-1 text-body-sm">{f.question}</span>
            {f.group ? <span className="hidden rounded-full bg-ivory px-2 text-caption sm:inline">{f.group}</span> : null}
            {f.isActive ? null : <span className="text-caption text-ink/55">hidden</span>}
          </summary>
          <div className="border-t border-mist p-4">
            <FaqForm faq={f} groups={groups} />
          </div>
        </details>
      )}
    </Sortable>
  );
}

export function TestimonialForm({ t }: { t?: Testimonial }) {
  const blank = { quote: "", authorName: "", location: "", isActive: true };
  const [v, setV] = useState(t ?? { ...blank, id: 0 });
  const save = useAdminAction(saveTestimonial);
  const remove = useAdminAction(deleteTestimonial);
  const id = useId();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await save.run({ id: t?.id ?? null, quote: v.quote, authorName: v.authorName, location: v.location, isActive: v.isActive });
        if (r.ok && !t) setV({ ...blank, id: 0 });
      }}
      className="grid gap-3 sm:grid-cols-2"
    >
      <Labeled label="Quote" htmlFor={`${id}-q`} className="sm:col-span-2" error={save.fields.quote}>
        <TextArea id={`${id}-q`} rows={3} value={v.quote} onChange={(e) => setV({ ...v, quote: e.target.value })} maxLength={600} />
      </Labeled>
      <Labeled label="Name" htmlFor={`${id}-n`} error={save.fields.authorName}>
        <TextInput id={`${id}-n`} value={v.authorName} onChange={(e) => setV({ ...v, authorName: e.target.value })} maxLength={80} />
      </Labeled>
      <Labeled label="City (optional)" htmlFor={`${id}-l`}>
        <TextInput id={`${id}-l`} value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} maxLength={80} />
      </Labeled>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Toggle checked={v.isActive} onChange={(isActive) => setV({ ...v, isActive })} label={v.isActive ? "Shown" : "Hidden"} />
        <Button type="submit" disabled={save.pending}>
          {save.pending ? "Saving…" : t ? "Save" : "Add testimonial"}
        </Button>
        {t ? (
          <Button variant="link" className="px-3 text-plum" onClick={() => window.confirm("Remove this testimonial?") && remove.run({ id: t.id })}>
            Remove
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function TestimonialList({ items }: { items: Testimonial[] }) {
  const [order, setOrder] = useSynced(items);
  const reorder = useAdminAction(reorderTestimonials);
  return (
    <Sortable
      items={order}
      getId={(t) => t.id}
      className="space-y-2"
      onReorder={(next) => {
        setOrder(next);
        reorder.run({ ids: next.map((t) => t.id) }, { quiet: true });
      }}
    >
      {(t, handle) => (
        <details className={cn("border border-mist bg-paper", !t.isActive && "opacity-60")}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 pr-3 [&::-webkit-details-marker]:hidden">
            <DragHandle handle={handle} label={`Move testimonial by ${t.authorName}`} />
            <span className="flex-1 truncate text-body-sm">“{t.quote}”</span>
            <span className="text-caption text-ink/60">{t.authorName}</span>
          </summary>
          <div className="border-t border-mist p-4">
            <TestimonialForm t={t} />
          </div>
        </details>
      )}
    </Sortable>
  );
}
