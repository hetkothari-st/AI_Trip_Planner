"use client";

import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Package, X } from "lucide-react";

interface OrderModalProps {
  storybookId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Stub pricing — flat per-copy price per size. No real fulfillment.
const SIZES = [
  { label: "A4 Hardcover", price: 1499 },
  { label: "Square Softcover", price: 999 },
  { label: "Pocket", price: 599 },
] as const;

type Status = "form" | "submitting" | "success";

export function OrderModal({ storybookId, open, onOpenChange }: OrderModalProps) {
  const [size, setSize] = useState<string>(SIZES[0].label);
  const [qty, setQty] = useState<number>(1);
  const [email, setEmail] = useState<string>("");
  const [status, setStatus] = useState<Status>("form");
  const [error, setError] = useState<string | null>(null);

  // Reset to a fresh form whenever the modal is (re)opened so a second order works.
  useEffect(() => {
    if (open) {
      setSize(SIZES[0].label);
      setQty(1);
      setEmail("");
      setStatus("form");
      setError(null);
    }
  }, [open]);

  const unitPrice = SIZES.find((s) => s.label === size)?.price ?? 0;
  const total = unitPrice * qty;

  const handleSubmit = async () => {
    setError(null);
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      setError("Quantity must be between 1 and 20.");
      return;
    }
    setStatus("submitting");
    try {
      const res = await fetch(`/api/storybooks/${storybookId}/order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, options: { size, qty } }),
      });
      if (res.status === 401) {
        setStatus("form");
        setError("Please sign in.");
        return;
      }
      const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
      if (!res.ok || !data?.ok) {
        setStatus("form");
        setError("Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
    } catch {
      setStatus("form");
      setError("Network error. Please try again.");
    }
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-primary/40 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 border-4 border-primary bg-surface p-6 text-on-surface neo-shadow focus:outline-none">
          <div className="mb-4 flex items-center justify-between gap-4">
            <Dialog.Title className="flex items-center gap-2 text-xl font-extrabold uppercase tracking-tight text-primary">
              <Package className="size-5" strokeWidth={2.5} />
              Order a printed copy
            </Dialog.Title>
            <Dialog.Close
              aria-label="Close"
              className="border-2 border-primary bg-surface p-1 text-primary transition-colors hover:bg-primary hover:text-white"
            >
              <X className="size-4" strokeWidth={2.5} />
            </Dialog.Close>
          </div>

          {status === "success" ? (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex size-14 items-center justify-center border-4 border-primary bg-primary-container text-primary neo-shadow-sm">
                <Check className="size-7" strokeWidth={3} />
              </div>
              <p className="text-sm font-bold uppercase tracking-wide">
                Physical printing is coming soon — you&apos;re on the list.
              </p>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="border-4 border-primary bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <Dialog.Description className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">
                Tell us what you&apos;d like. We&apos;ll record your interest — no payment needed yet.
              </Dialog.Description>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Size</span>
                <select
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="border-2 border-primary bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:neo-shadow-sm"
                >
                  {SIZES.map((s) => (
                    <option key={s.label} value={s.label}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Quantity</span>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={qty}
                  onChange={(e) => {
                    const n = Number(e.target.value);
                    setQty(Number.isNaN(n) ? 1 : Math.min(20, Math.max(1, Math.floor(n))));
                  }}
                  className="border-2 border-primary bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:neo-shadow-sm"
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="border-2 border-primary bg-surface px-3 py-2 text-sm font-medium focus:outline-none focus:neo-shadow-sm"
                />
              </label>

              <div className="flex items-center justify-between border-2 border-primary bg-primary-container px-3 py-2">
                <span className="text-xs font-bold uppercase tracking-widest text-on-surface-variant">Estimate</span>
                <span className="text-lg font-extrabold text-primary">₹{total.toLocaleString("en-IN")}</span>
              </div>

              {error && (
                <p className="border-2 border-secondary bg-surface px-3 py-2 text-xs font-bold uppercase tracking-wide text-secondary">
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleSubmit}
                disabled={status === "submitting"}
                className="border-4 border-primary bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover disabled:cursor-not-allowed disabled:opacity-60"
              >
                {status === "submitting" ? "Placing order…" : "Place order"}
              </button>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
