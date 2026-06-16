"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, Plus, Trash2, LogIn, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { TopNav } from "@/components/chrome/TopNav";

type Storybook = {
  id: string;
  title: string;
  theme: string;
  coverUrl: string | null;
  status: "draft" | "ready";
  updatedAt: string;
};

/** Short, human-friendly "time ago" for the card footer. */
function shortAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const secs = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function StorybooksPage() {
  const [mounted, setMounted] = useState(false);
  const [signedOut, setSignedOut] = useState(false);
  const [books, setBooks] = useState<Storybook[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/storybooks");
        if (res.status === 401) {
          if (!cancelled) setSignedOut(true);
          return;
        }
        const data = (await res.json()) as { books?: Storybook[] };
        if (!cancelled) setBooks(data.books ?? []);
      } catch {
        if (!cancelled) setBooks([]);
      } finally {
        if (!cancelled) setMounted(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function remove(id: string) {
    if (!window.confirm("Delete this storybook? This can't be undone.")) return;
    const res = await fetch(`/api/storybooks/${id}`, { method: "DELETE" });
    if (res.ok) setBooks((prev) => prev.filter((b) => b.id !== id));
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-on-surface">
      <TopNav />

      <main className="mx-auto max-w-7xl px-6 pb-24 pt-28 md:px-8">
        {/* page heading */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-4 border-b-4 border-primary pb-6">
          <div>
            <span className="inline-block border-2 border-primary bg-tertiary px-3 py-1 text-[0.6rem] font-bold uppercase tracking-widest text-white neo-shadow">
              Keepsakes
            </span>
            <h1 className="mt-4 text-5xl font-extrabold uppercase leading-[0.9] tracking-tighter text-primary md:text-7xl">
              My Storybooks
            </h1>
            <p className="mt-3 max-w-xl text-sm font-medium uppercase tracking-wide text-on-surface-variant">
              Turn your travels into a printable book — design the pages, then order a copy.
            </p>
          </div>
          {!signedOut && (
            <Link
              href="/storybooks/new"
              className="flex items-center gap-2 border-4 border-primary bg-primary-container px-6 py-3 text-sm font-bold uppercase tracking-widest text-primary neo-shadow-hover"
            >
              <Plus className="size-4" strokeWidth={3} /> New Storybook
            </Link>
          )}
        </div>

        {signedOut ? (
          <div className="border-4 border-dashed border-primary bg-surface-container-lowest py-20 text-center">
            <LogIn className="mx-auto size-10 text-primary" strokeWidth={2.5} />
            <p className="mt-4 text-2xl font-bold uppercase tracking-tight">Sign In Required</p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium uppercase tracking-wide text-on-surface-variant">
              Sign in to view your storybooks.
            </p>
            <Link
              href="/login"
              className="mt-6 inline-flex items-center gap-2 border-4 border-primary bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover"
            >
              <LogIn className="size-4" strokeWidth={3} /> Sign In
            </Link>
          </div>
        ) : !mounted ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-72 animate-pulse border-4 border-primary/20 bg-surface-container" />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="border-4 border-dashed border-primary bg-surface-container-lowest py-20 text-center">
            <BookOpen className="mx-auto size-10 text-primary" strokeWidth={2.5} />
            <p className="mt-4 text-2xl font-bold uppercase tracking-tight">No Storybooks Yet</p>
            <p className="mx-auto mt-2 max-w-md text-sm font-medium uppercase tracking-wide text-on-surface-variant">
              Start a new storybook and bring your favourite trip to life on paper.
            </p>
            <Link
              href="/storybooks/new"
              className="mt-6 inline-flex items-center gap-2 border-4 border-primary bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover"
            >
              <Plus className="size-4" strokeWidth={3} /> New Storybook
            </Link>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {books.map((b) => (
              <BookCard key={b.id} book={b} onDelete={() => remove(b.id)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BookCard({ book, onDelete }: { book: Storybook; onDelete: () => void }) {
  return (
    <Link
      href={`/storybooks/${book.id}/edit`}
      className="group flex flex-col overflow-hidden border-4 border-primary bg-surface-container-lowest transition-all hover:neo-shadow"
    >
      <div className="relative">
        {book.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={book.coverUrl}
            alt={book.title}
            className="h-40 w-full border-b-4 border-primary object-cover grayscale transition-all duration-500 group-hover:grayscale-0"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center border-b-4 border-primary bg-primary-container">
            <BookOpen className="size-10 text-primary" strokeWidth={2} />
          </div>
        )}
        <span
          className={cn(
            "absolute left-3 top-3 border-2 border-primary px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest",
            book.status === "ready" ? "bg-primary text-white" : "bg-accent text-primary",
          )}
        >
          {book.status}
        </span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-bold uppercase tracking-tight">{book.title}</h3>
        <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-on-surface-variant">
          {book.theme} · {shortAgo(book.updatedAt)}
        </p>
        <div className="mt-4 flex items-center gap-2">
          <span className="flex flex-1 items-center justify-center gap-2 border-2 border-primary bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-colors group-hover:bg-tertiary">
            Edit <ArrowRight className="size-4" strokeWidth={3} />
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDelete();
            }}
            aria-label="Delete"
            className="border-2 border-primary bg-surface p-2.5 transition-colors hover:bg-secondary hover:text-white"
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      </div>
    </Link>
  );
}
