"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useStorybook } from "@/lib/store/storybook";
import { PageCanvas } from "@/components/storybook/PageCanvas";
import { EditorToolbar } from "@/components/storybook/EditorToolbar";
import { PhotoUpload } from "@/components/storybook/PhotoUpload";
import { getTheme } from "@/lib/storybook/templates/themes";
import { SIZE_DIMS, type ElementType, type SizePreset, type StoryElement, type StoryPage } from "@/lib/storybook/types";

// ── Pure pointer-math helpers ───────────────────────────────────────────────
const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max);
/** Convert a pixel delta to a percent of the given pixel dimension. */
const pctDelta = (deltaPx: number, dimPx: number) => (dimPx > 0 ? (deltaPx / dimPx) * 100 : 0);

const MIN_SIZE = 5; // minimum element width/height in percent
const MAX_CANVAS_W = 640; // target on-screen canvas width in CSS px

type Corner = "nw" | "ne" | "sw" | "se";

// A drag gesture in flight: what we're doing + the element snapshot at gesture start.
type Drag =
  | { kind: "move"; id: string; startX: number; startY: number; elX: number; elY: number; elW: number; elH: number }
  | { kind: "resize"; id: string; corner: Corner; startX: number; startY: number; elX: number; elY: number; elW: number; elH: number }
  | { kind: "rotate"; id: string; cx: number; cy: number };

export default function StorybookEditorPage() {
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const router = useRouter();

  const book = useStorybook((s) => s.book);
  const setBook = useStorybook((s) => s.setBook);
  const addElement = useStorybook((s) => s.addElement);
  const updateElement = useStorybook((s) => s.updateElement);
  const removeElement = useStorybook((s) => s.removeElement);
  const addPage = useStorybook((s) => s.addPage);
  const removePage = useStorybook((s) => s.removePage);
  const setTheme = useStorybook((s) => s.setTheme);

  const [loadState, setLoadState] = useState<"loading" | "ready" | "notfound">("loading");
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<Drag | null>(null);

  // Live-value mirrors so the window pointer listeners can be registered once
  // and still read the current active page / updater without re-subscribing.
  const activePageRef = useRef<StoryPage | null>(null);
  const updateElementRef = useRef(updateElement);

  // ── Load the book on mount ────────────────────────────────────────────────
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/storybooks/${id}`);
        if (res.status === 401) {
          router.replace("/login");
          return;
        }
        if (res.status === 404 || !res.ok) {
          if (!cancelled) setLoadState("notfound");
          return;
        }
        const data = (await res.json()) as { book?: Parameters<typeof setBook>[0] };
        if (cancelled) return;
        if (!data.book) {
          setLoadState("notfound");
          return;
        }
        setBook(data.book);
        setActivePageId(data.book.pages[0]?.id ?? null);
        setLoadState("ready");
      } catch {
        if (!cancelled) setLoadState("notfound");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, router, setBook]);

  const theme = useMemo(() => getTheme(book?.theme ?? ""), [book?.theme]);
  const sizePreset: SizePreset = book?.sizePreset ?? "square";
  const dims = SIZE_DIMS[sizePreset] ?? SIZE_DIMS.square;
  const scale = MAX_CANVAS_W / dims.w;

  // The page we're editing — fall back to the first page if the active id is stale.
  const activePage: StoryPage | null = useMemo(() => {
    if (!book) return null;
    return book.pages.find((p) => p.id === activePageId) ?? book.pages[0] ?? null;
  }, [book, activePageId]);

  // Keep activePageId valid if pages change underneath us.
  useEffect(() => {
    if (book && activePage && activePage.id !== activePageId) setActivePageId(activePage.id);
  }, [book, activePage, activePageId]);

  const selectedEl = activePage?.elements.find((e) => e.id === selectedId) ?? null;

  // Keep the live-value refs read by the pointer listeners in sync.
  useEffect(() => {
    activePageRef.current = activePage;
  }, [activePage]);
  useEffect(() => {
    updateElementRef.current = updateElement;
  }, [updateElement]);

  // ── Pointer gesture wiring (move / resize / rotate) ───────────────────────
  // Registered ONCE; everything live is read from refs so dragging doesn't churn
  // the listeners (re-registering mid-drag could drop a pointermove).
  useEffect(() => {
    function onMove(e: PointerEvent) {
      const drag = dragRef.current;
      const rect = canvasRef.current?.getBoundingClientRect();
      const pageId = activePageRef.current?.id;
      const updateEl = updateElementRef.current;
      if (!drag || !rect || !pageId) return;

      if (drag.kind === "move") {
        const dxPct = pctDelta(e.clientX - drag.startX, rect.width);
        const dyPct = pctDelta(e.clientY - drag.startY, rect.height);
        updateEl(pageId, drag.id, {
          x: clamp(drag.elX + dxPct, 0, 100 - drag.elW),
          y: clamp(drag.elY + dyPct, 0, 100 - drag.elH),
        });
        return;
      }

      if (drag.kind === "resize") {
        const dxPct = pctDelta(e.clientX - drag.startX, rect.width);
        const dyPct = pctDelta(e.clientY - drag.startY, rect.height);
        let { elX: x, elY: y, elW: w, elH: h } = drag;

        // West corners move the left edge: x grows, w shrinks (and vice versa).
        if (drag.corner === "nw" || drag.corner === "sw") {
          const nx = clamp(drag.elX + dxPct, 0, drag.elX + drag.elW - MIN_SIZE);
          w = drag.elW + (drag.elX - nx);
          x = nx;
        } else {
          w = clamp(drag.elW + dxPct, MIN_SIZE, 100 - drag.elX);
        }
        // North corners move the top edge similarly.
        if (drag.corner === "nw" || drag.corner === "ne") {
          const ny = clamp(drag.elY + dyPct, 0, drag.elY + drag.elH - MIN_SIZE);
          h = drag.elH + (drag.elY - ny);
          y = ny;
        } else {
          h = clamp(drag.elH + dyPct, MIN_SIZE, 100 - drag.elY);
        }
        updateEl(pageId, drag.id, { x, y, w, h });
        return;
      }

      if (drag.kind === "rotate") {
        const angle = (Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx) * 180) / Math.PI;
        // Handle sits above the element, so add 90° to make "up" = 0°.
        updateEl(pageId, drag.id, { rotation: Math.round(angle + 90) });
        return;
      }
    }

    function onUp() {
      dragRef.current = null;
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  // ── Delete key removes the selected element (unless editing text) ──────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return;
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId && activePage) {
        e.preventDefault();
        removeElement(activePage.id, selectedId);
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingId, selectedId, activePage, removeElement]);

  // ── Toolbar handlers ──────────────────────────────────────────────────────
  const handleAdd = useCallback(
    (type: ElementType) => {
      if (!activePage) return;
      const base = { type, x: 30, y: 30, w: 30, h: type === "text" ? 10 : 20 };
      const newId = addElement(activePage.id, base);
      setSelectedId(newId);
    },
    [activePage, addElement],
  );

  const handleDeleteSelected = useCallback(() => {
    if (!activePage || !selectedId) return;
    removeElement(activePage.id, selectedId);
    setSelectedId(null);
  }, [activePage, selectedId, removeElement]);

  const handleDownload = useCallback(() => {
    if (!book) return;
    useStorybook.getState().save();
    window.location.href = `/api/storybooks/${book.id}/pdf`;
  }, [book]);

  const handleOrder = useCallback(() => {
    // TODO: wire OrderModal in Task 17
    window.alert("Physical printing coming soon");
  }, []);

  // ── Page-strip handlers ───────────────────────────────────────────────────
  const handleAddPage = useCallback(() => {
    addPage();
    const pages = useStorybook.getState().book?.pages;
    const last = pages?.[pages.length - 1];
    if (last) setActivePageId(last.id);
    setSelectedId(null);
  }, [addPage]);

  const handleRemovePage = useCallback(
    (pageId: string) => {
      if (!book || book.pages.length <= 1) return; // never delete the last page
      removePage(pageId);
      if (pageId === activePage?.id) {
        const remaining = book.pages.filter((p) => p.id !== pageId);
        setActivePageId(remaining[0]?.id ?? null);
      }
      setSelectedId(null);
    },
    [book, removePage, activePage],
  );

  // ── Loading / error states ────────────────────────────────────────────────
  if (loadState === "notfound") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
        <p className="text-3xl font-extrabold uppercase tracking-tight text-primary">Storybook not found</p>
        <p className="max-w-md text-sm font-medium uppercase tracking-wide text-on-surface-variant">
          This book doesn&apos;t exist or you don&apos;t have access to it.
        </p>
        <Link
          href="/storybooks"
          className="inline-flex items-center gap-2 border-4 border-primary bg-primary px-6 py-3 text-sm font-bold uppercase tracking-widest text-white neo-shadow-hover"
        >
          Back to storybooks
        </Link>
      </div>
    );
  }

  if (loadState === "loading" || !book || !activePage) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-on-surface">
      <EditorToolbar
        book={book}
        onAdd={handleAdd}
        onDelete={handleDeleteSelected}
        onThemeChange={setTheme}
        onDownload={handleDownload}
        onOrder={handleOrder}
        selectedId={selectedId}
      />

      <div className="flex min-h-0 flex-1">
        {/* Page thumbnails strip */}
        <aside className="flex w-40 shrink-0 flex-col gap-3 overflow-y-auto border-r-4 border-primary bg-surface-container-lowest p-3">
          {book.pages.map((page, i) => {
            const thumbScale = 80 / dims.w;
            const active = page.id === activePage.id;
            return (
              <div key={page.id} className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setActivePageId(page.id);
                    setSelectedId(null);
                    setEditingId(null);
                  }}
                  className={
                    "block w-full border-2 p-1 text-left transition-colors " +
                    (active ? "border-primary bg-primary-container neo-shadow-sm" : "border-primary/30 bg-surface hover:border-primary")
                  }
                >
                  <div className="pointer-events-none mx-auto overflow-hidden" style={{ width: dims.w * thumbScale, height: dims.h * thumbScale }}>
                    <PageCanvas page={page} theme={theme} sizePreset={sizePreset} scale={thumbScale} />
                  </div>
                  <span className="mt-1 block text-center text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    {i + 1}
                  </span>
                </button>
                {book.pages.length > 1 && (
                  <button
                    type="button"
                    aria-label="Delete page"
                    onClick={() => handleRemovePage(page.id)}
                    className="absolute right-1 top-1 border border-primary bg-surface p-1 text-primary transition-colors hover:bg-secondary hover:text-white"
                  >
                    <Trash2 className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
          <button
            type="button"
            onClick={handleAddPage}
            className="flex items-center justify-center gap-1.5 border-2 border-dashed border-primary bg-surface px-2 py-3 text-xs font-bold uppercase tracking-wide text-primary transition-colors hover:bg-primary-container"
          >
            <Plus className="size-4" strokeWidth={2.5} /> Add page
          </button>
        </aside>

        {/* Canvas area */}
        <main className="flex min-h-0 flex-1 items-center justify-center overflow-auto p-8">
          <div className="relative" style={{ width: dims.w * scale, height: dims.h * scale }}>
            {/* render layer */}
            <div ref={canvasRef} className="border-4 border-primary neo-shadow">
              <PageCanvas page={activePage} theme={theme} sizePreset={sizePreset} scale={scale} />
            </div>

            {/* interaction overlay — same size, on top of the render layer */}
            <div
              className="absolute inset-0"
              onPointerDown={(e) => {
                // pointerdown on empty canvas clears selection
                if (e.target === e.currentTarget) {
                  setSelectedId(null);
                  setEditingId(null);
                }
              }}
            >
              {activePage.elements.map((el) => (
                <ElementOverlay
                  key={el.id}
                  el={el}
                  selected={el.id === selectedId}
                  editing={el.id === editingId}
                  canvasRef={canvasRef}
                  dragRef={dragRef}
                  onSelect={() => setSelectedId(el.id)}
                  onStartEdit={() => setEditingId(el.id)}
                  onCommitText={(text) => {
                    updateElement(activePage.id, el.id, { props: { ...el.props, text } });
                    setEditingId(null);
                  }}
                  onUploaded={(url, publicId) => {
                    const props = el.props as Record<string, unknown>;
                    updateElement(activePage.id, el.id, {
                      props: { ...props, url, publicId, fit: props.fit ?? "cover" },
                    });
                  }}
                  onDelete={() => {
                    removeElement(activePage.id, el.id);
                    setSelectedId(null);
                  }}
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

// ── Per-element overlay: selection box, drag body, handles, text editor ──────
function ElementOverlay({
  el,
  selected,
  editing,
  canvasRef,
  dragRef,
  onSelect,
  onStartEdit,
  onCommitText,
  onUploaded,
  onDelete,
}: {
  el: StoryElement;
  selected: boolean;
  editing: boolean;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  dragRef: React.MutableRefObject<Drag | null>;
  onSelect: () => void;
  onStartEdit: () => void;
  onCommitText: (text: string) => void;
  onUploaded: (url: string, publicId: string) => void;
  onDelete: () => void;
}) {
  const corners: Corner[] = ["nw", "ne", "sw", "se"];
  const cornerPos: Record<Corner, React.CSSProperties> = {
    nw: { left: -5, top: -5, cursor: "nwse-resize" },
    ne: { right: -5, top: -5, cursor: "nesw-resize" },
    sw: { left: -5, bottom: -5, cursor: "nesw-resize" },
    se: { right: -5, bottom: -5, cursor: "nwse-resize" },
  };

  const startMove = (e: React.PointerEvent) => {
    if (editing) return;
    e.stopPropagation();
    onSelect();
    dragRef.current = { kind: "move", id: el.id, startX: e.clientX, startY: e.clientY, elX: el.x, elY: el.y, elW: el.w, elH: el.h };
  };

  const startResize = (corner: Corner) => (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    dragRef.current = {
      kind: "resize",
      id: el.id,
      corner,
      startX: e.clientX,
      startY: e.clientY,
      elX: el.x,
      elY: el.y,
      elW: el.w,
      elH: el.h,
    };
  };

  const startRotate = (e: React.PointerEvent) => {
    e.stopPropagation();
    onSelect();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const cx = rect.left + ((el.x + el.w / 2) / 100) * rect.width;
    const cy = rect.top + ((el.y + el.h / 2) / 100) * rect.height;
    dragRef.current = { kind: "rotate", id: el.id, cx, cy };
  };

  const isText = el.type === "text";
  const text = typeof (el.props as Record<string, unknown>)?.text === "string" ? ((el.props as Record<string, string>).text) : "";

  // Empty photo/ticket slot: media element with no uploaded image yet.
  const isMedia = el.type === "photo" || el.type === "ticket";
  const hasUrl = typeof (el.props as Record<string, unknown>)?.url === "string" && (el.props as Record<string, string>).url.length > 0;
  const isEmptySlot = isMedia && !hasUrl;

  return (
    <div
      style={{
        position: "absolute",
        left: `${el.x}%`,
        top: `${el.y}%`,
        width: `${el.w}%`,
        height: `${el.h}%`,
        transform: `rotate(${el.rotation}deg)`,
        transformOrigin: "center",
        zIndex: el.z,
      }}
    >
      {/* drag body */}
      <div
        onPointerDown={startMove}
        onDoubleClick={(e) => {
          if (isText) {
            e.stopPropagation();
            onSelect();
            onStartEdit();
          }
        }}
        style={{
          position: "absolute",
          inset: 0,
          cursor: editing ? "text" : "move",
          outline: selected ? "2px solid #0055ff" : "1px dashed rgba(0,0,0,0.2)",
          outlineOffset: 0,
          background: "transparent",
        }}
      />

      {/* inline text editor */}
      {editing && isText && (
        <textarea
          autoFocus
          defaultValue={text}
          onPointerDown={(e) => e.stopPropagation()}
          onBlur={(e) => onCommitText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onCommitText((e.target as HTMLTextAreaElement).value);
            }
            if (e.key === "Escape") {
              e.preventDefault();
              onCommitText(text);
            }
          }}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            resize: "none",
            border: "2px solid #0055ff",
            background: "rgba(255,255,255,0.95)",
            padding: 4,
            font: "inherit",
            boxSizing: "border-box",
          }}
        />
      )}

      {/* empty photo/ticket slot: upload control (selected only) */}
      {selected && !editing && isEmptySlot && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <PhotoUpload kind={el.type === "ticket" ? "ticket" : "photo"} onUploaded={onUploaded} />
        </div>
      )}

      {selected && !editing && (
        <>
          {/* resize handles */}
          {corners.map((c) => (
            <div
              key={c}
              onPointerDown={startResize(c)}
              style={{
                position: "absolute",
                width: 10,
                height: 10,
                background: "#fff",
                border: "2px solid #0055ff",
                ...cornerPos[c],
              }}
            />
          ))}

          {/* rotate handle (above the box) */}
          <div
            onPointerDown={startRotate}
            style={{
              position: "absolute",
              left: "50%",
              top: -28,
              width: 12,
              height: 12,
              marginLeft: -6,
              borderRadius: "50%",
              background: "#fff",
              border: "2px solid #0055ff",
              cursor: "grab",
            }}
          />
          {/* connector line to rotate handle */}
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: -16,
              width: 2,
              height: 16,
              marginLeft: -1,
              background: "#0055ff",
              pointerEvents: "none",
            }}
          />

          {/* delete button */}
          <button
            type="button"
            aria-label="Delete element"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={onDelete}
            style={{
              position: "absolute",
              right: -12,
              top: -28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 20,
              height: 20,
              background: "#fff",
              border: "2px solid #0055ff",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <Trash2 className="size-3" />
          </button>
        </>
      )}
    </div>
  );
}
