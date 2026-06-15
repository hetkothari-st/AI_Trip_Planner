"use client";

import { ImagePlus, Type, Ticket, Square, Trash2, Download, ShoppingBag } from "lucide-react";
import { THEMES } from "@/lib/storybook/templates/themes";
import type { Storybook, ElementType } from "@/lib/storybook/types";

/**
 * Top toolbar for the storybook editor. Pure presentational: every action is a
 * callback the editor page wires to the `useStorybook` store. Add-element buttons
 * pass the element `type`; the page decides default geometry.
 */
export function EditorToolbar({
  book,
  onAdd,
  onDelete,
  onThemeChange,
  onDownload,
  onOrder,
  selectedId,
}: {
  book: Storybook;
  onAdd: (type: ElementType) => void;
  onDelete: () => void;
  onThemeChange: (id: string) => void;
  onDownload: () => void;
  onOrder: () => void;
  selectedId: string | null;
}) {
  const addBtn =
    "flex items-center gap-1.5 border-2 border-primary bg-surface px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary-container neo-shadow-sm";

  return (
    <div className="flex flex-wrap items-center gap-3 border-b-4 border-primary bg-surface-container-lowest px-4 py-3">
      {/* Add elements */}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={addBtn} onClick={() => onAdd("photo")}>
          <ImagePlus className="size-4" strokeWidth={2.5} /> Photo
        </button>
        <button type="button" className={addBtn} onClick={() => onAdd("text")}>
          <Type className="size-4" strokeWidth={2.5} /> Text
        </button>
        <button type="button" className={addBtn} onClick={() => onAdd("ticket")}>
          <Ticket className="size-4" strokeWidth={2.5} /> Ticket
        </button>
        <button type="button" className={addBtn} onClick={() => onAdd("sticker")}>
          <Square className="size-4" strokeWidth={2.5} /> Sticker
        </button>
      </div>

      <div className="h-6 w-px bg-primary/20" />

      {/* Delete selected */}
      <button
        type="button"
        disabled={!selectedId}
        onClick={onDelete}
        className="flex items-center gap-1.5 border-2 border-primary bg-surface px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-surface disabled:hover:text-primary neo-shadow-sm"
      >
        <Trash2 className="size-4" strokeWidth={2.5} /> Delete
      </button>

      <div className="h-6 w-px bg-primary/20" />

      {/* Theme switcher */}
      <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
        Theme
        <select
          value={book.theme}
          onChange={(e) => onThemeChange(e.target.value)}
          className="border-2 border-primary bg-surface px-2 py-1.5 text-xs font-bold uppercase tracking-wide text-primary outline-none"
        >
          {Object.values(THEMES).map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </label>

      {/* Right-aligned actions */}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          onClick={onDownload}
          className="flex items-center gap-1.5 border-2 border-primary bg-primary-container px-3 py-2 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary hover:text-white neo-shadow-sm"
        >
          <Download className="size-4" strokeWidth={2.5} /> Download PDF
        </button>
        <button
          type="button"
          onClick={onOrder}
          className="flex items-center gap-1.5 border-2 border-primary bg-primary px-3 py-2 text-xs font-bold uppercase tracking-wide text-white transition-colors hover:bg-tertiary neo-shadow-sm"
        >
          <ShoppingBag className="size-4" strokeWidth={2.5} /> Order print
        </button>
      </div>
    </div>
  );
}
