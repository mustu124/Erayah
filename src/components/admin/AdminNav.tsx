"use client";

import { LogOut, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/ui/Logo";
import type { AdminRole } from "@/lib/admin/auth";
import { signOut } from "@/lib/admin/session-actions";
import { cn } from "@/lib/cn";

import { NewOrderBadge } from "./NewOrderBadge";

type Item = { href: string; label: string; owner?: boolean };

export const ADMIN_NAV: Item[] = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/merchandising", label: "Merchandising", owner: true },
  { href: "/admin/homepage", label: "Homepage", owner: true },
  { href: "/admin/promotions", label: "Gift cards", owner: true },
  { href: "/admin/shipping", label: "Shipping", owner: true },
  { href: "/admin/content", label: "Content", owner: true },
  { href: "/admin/settings", label: "Settings", owner: true },
];

function Links({ role, unread, onNavigate }: { role: AdminRole; unread: number; onNavigate?: () => void }) {
  const path = usePathname();
  return (
    <ul className="space-y-0.5">
      {ADMIN_NAV.filter((i) => !i.owner || role === "owner").map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <li key={item.href}>
            <Link
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-11 items-center justify-between rounded-xs px-3 text-body-sm transition-colors duration-200",
                active ? "bg-ink text-ivory" : "text-ink hover:bg-ivory",
              )}
            >
              {item.label}
              {item.href === "/admin/orders" ? <NewOrderBadge /> : null}
              {item.href === "/admin/messages" && unread ? (
                <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-gold px-1.5 text-[11px] leading-5 text-ink tabular-nums" aria-label={`${unread} unread messages`}>
                  {unread}
                </span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function SignOutButton() {
  return (
    <form action={signOut}>
      <button type="submit" className="flex min-h-11 w-full items-center gap-2 rounded-xs px-3 text-body-sm text-ink/70 hover:bg-ivory hover:text-ink">
        <Icon icon={LogOut} size={16} />
        Sign out
      </button>
    </form>
  );
}

/** Sidebar on desktop; a top bar with a slide-down menu on phones. */
export function AdminNav({ role, email, unread }: { role: AdminRole; email: string; unread: number }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="hidden w-60 shrink-0 border-r border-mist bg-paper lg:block">
      <aside className="sticky top-0 flex h-dvh flex-col px-3 py-5">
        <Link href="/admin" className="px-3" aria-label="Admin dashboard">
          <Wordmark className="h-4 w-auto text-ink" />
          <span className="mt-1 block text-label text-gold uppercase">Admin</span>
        </Link>
        <nav aria-label="Admin" className="mt-8 flex-1 overflow-y-auto">
          <Links role={role} unread={unread} />
        </nav>
        <div className="border-t border-mist pt-3">
          <p className="truncate px-3 text-caption text-ink/60" title={email}>
            {email} · {role}
          </p>
          <a href="/" target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center rounded-xs px-3 text-body-sm text-ink/70 hover:bg-ivory hover:text-ink">
            View shop ↗
          </a>
          <SignOutButton />
        </div>
      </aside>
      </div>

      <header className="sticky top-0 z-30 border-b border-mist bg-paper lg:hidden">
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/admin" aria-label="Admin dashboard" className="flex items-center gap-2">
            <Wordmark className="h-3.5 w-auto text-ink" />
            <span className="text-label text-gold uppercase">Admin</span>
          </Link>
          <button type="button" aria-expanded={open} aria-controls="admin-mobile-nav" onClick={() => setOpen((o) => !o)} className="flex size-11 items-center justify-center" aria-label={open ? "Close menu" : "Open menu"}>
            <Icon icon={open ? X : Menu} size={22} />
          </button>
        </div>
        {open ? (
          <nav id="admin-mobile-nav" aria-label="Admin" className="max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-t border-mist px-3 py-3">
            <Links role={role} unread={unread} onNavigate={() => setOpen(false)} />
            <div className="mt-2 border-t border-mist pt-2">
              <SignOutButton />
            </div>
          </nav>
        ) : null}
      </header>
    </>
  );
}
