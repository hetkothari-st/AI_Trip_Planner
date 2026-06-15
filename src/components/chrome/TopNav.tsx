"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { AuthButton } from "@/components/auth/AuthButton";

const LINKS = [
  { label: "Plan", href: "/plan" },
  { label: "My Trips", href: "/trips" },
  { label: "Storybooks", href: "/storybooks" },
  { label: "Travel History", href: "/travels" },
] as const;

/**
 * Bauhaus / Neo-Brutalist top navigation bar (AETHER TRAVEL).
 * `search` shows the bordered region-search box used on inner workspace screens.
 */
export function TopNav({ search = false }: { search?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 z-50 flex w-full items-center justify-between border-b border-primary/10 bg-surface/70 px-6 py-4 backdrop-blur-xl md:px-8">
      <Link
        href="/"
        className="text-sm font-bold uppercase tracking-[0.2em] text-primary"
      >
        AETHER TRAVEL
      </Link>

      <div className="hidden items-center gap-10 md:flex">
        {LINKS.map((l) => {
          const active = pathname === l.href || pathname.startsWith(l.href + "/");
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "pb-1 text-sm font-medium uppercase tracking-wide transition-colors",
                active
                  ? "border-b-2 border-primary font-bold text-primary"
                  : "text-on-surface-variant hover:text-primary",
              )}
            >
              {l.label}
            </Link>
          );
        })}
      </div>

      <div className="flex items-center gap-4">
        {search && (
          <div className="hidden items-center gap-2 border-2 border-primary bg-surface-container px-3 py-1.5 md:flex">
            <Search className="size-4 text-primary" />
            <input
              placeholder="SEARCH REGION"
              className="w-32 bg-transparent text-xs font-bold uppercase tracking-wide outline-none placeholder:text-on-surface-variant md:w-44"
            />
          </div>
        )}
        <button
          aria-label="Notifications"
          className="text-primary transition-transform hover:scale-110"
        >
          <Bell className="size-5" />
        </button>
        <AuthButton />
      </div>
    </nav>
  );
}
