"use client";

import { useRouter } from "next/navigation";
import { useEffect, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { createClient } from "@/lib/supabase/client";

/** A soft two-note chime made in the browser (no audio file to load). */
function chime() {
  try {
    const ctx = new AudioContext();
    [880, 1318.5].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.65);
    });
  } catch {
    // Audio is blocked until the page has been clicked; the badge still updates.
  }
}

// One Realtime subscription shared by every badge on the page (the sidebar
// and the phone menu both show one), so a new order chimes once.
const store = {
  count: null as number | null,
  listeners: new Set<() => void>(),
  users: 0,
  stop: null as null | (() => void),
  navigate: ((href: string) => void href) as (href: string) => void,
};

function connect() {
  const supabase = createClient();
  let last: number | null = null;
  let live = true;
  const load = async () => {
    const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("status", "placed");
    if (!live || count === null) return;
    if (last !== null && count > last) {
      chime();
      toast.success("New order received", { action: { label: "View", onClick: () => store.navigate("/admin/orders?status=placed") } });
    }
    last = count;
    store.count = count;
    store.listeners.forEach((notify) => notify());
  };
  load();
  const channel = supabase
    .channel(`admin-orders-${Math.random().toString(36).slice(2)}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load())
    // Count again once the connection is live (and after a reconnect), so an
    // order that arrived while it was connecting isn't missed.
    .subscribe((status) => {
      if (status === "SUBSCRIBED") load();
    });
  return () => {
    live = false;
    supabase.removeChannel(channel);
  };
}

function subscribe(notify: () => void) {
  store.listeners.add(notify);
  if (store.users++ === 0) store.stop = connect();
  return () => {
    store.listeners.delete(notify);
    if (--store.users === 0) {
      store.stop?.();
      store.stop = null;
    }
  };
}

/** Orders waiting to be confirmed, kept live with Supabase Realtime; chimes when one arrives. */
export function NewOrderBadge() {
  const router = useRouter();
  useEffect(() => {
    store.navigate = (href) => router.push(href);
  }, [router]);
  const count = useSyncExternalStore(
    subscribe,
    () => store.count,
    () => null,
  );

  if (!count) return null;
  return (
    <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-plum px-1.5 text-[11px] leading-5 text-ivory tabular-nums" aria-label={`${count} new orders to confirm`}>
      {count}
    </span>
  );
}
