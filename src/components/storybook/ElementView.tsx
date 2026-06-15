"use client";

import { ImagePlus, Ticket } from "lucide-react";
import type { StoryElement } from "@/lib/storybook/types";
import type { Theme } from "@/lib/storybook/templates/themes";

/**
 * Read-only render of a single storybook element. The PARENT is responsible for
 * absolute positioning/sizing; this component simply fills 100% of that slot.
 * Props are read defensively — `el.props` is `Record<string, unknown>` and may
 * contain missing or malformed values, so we coerce and guard everything.
 */
export function ElementView({ el, theme }: { el: StoryElement; theme: Theme }) {
  const p = (el.props ?? {}) as Record<string, any>;

  const fill: React.CSSProperties = { width: "100%", height: "100%" };

  if (el.type === "photo" || el.type === "ticket") {
    const url = typeof p.url === "string" ? p.url : "";
    const fit: "cover" | "contain" = p.fit === "contain" ? "contain" : "cover";
    const isTicket = el.type === "ticket" || theme.frameStyle === "ticket";

    const inner = url ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={typeof p.caption === "string" ? p.caption : ""}
        style={{ ...fill, objectFit: fit, display: "block" }}
      />
    ) : (
      <EmptySlot
        ink={theme.palette.ink}
        label={isTicket ? "Add ticket" : "Add photo"}
        icon={isTicket ? <Ticket size={20} /> : <ImagePlus size={20} />}
      />
    );

    // Boarding-pass style frame: a perforated left edge via a dashed border.
    if (isTicket) {
      return (
        <div
          style={{
            ...fill,
            position: "relative",
            overflow: "hidden",
            borderLeft: `2px dashed ${theme.palette.ink}`,
            background: theme.palette.paper,
            boxSizing: "border-box",
          }}
        >
          {inner}
        </div>
      );
    }

    return <div style={{ ...fill, overflow: "hidden" }}>{inner}</div>;
  }

  if (el.type === "text") {
    const text = typeof p.text === "string" ? p.text : "";
    const size = typeof p.size === "number" && p.size > 0 ? p.size : 16;
    const color = typeof p.color === "string" && p.color ? p.color : theme.palette.ink;
    const align: "left" | "center" | "right" =
      p.align === "center" || p.align === "right" ? p.align : "left";

    if (!text) {
      // Empty text: a faint placeholder so the slot is still discoverable.
      return (
        <div
          style={{
            ...fill,
            display: "flex",
            alignItems: "center",
            justifyContent: align === "center" ? "center" : align === "right" ? "flex-end" : "flex-start",
            fontFamily: theme.fonts.body,
            fontSize: size,
            color: theme.palette.ink,
            opacity: 0.35,
            overflow: "hidden",
          }}
        >
          Text
        </div>
      );
    }

    return (
      <div
        style={{
          ...fill,
          fontFamily: theme.fonts.body,
          fontSize: size,
          color,
          textAlign: align,
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          overflow: "hidden",
        }}
      >
        {text}
      </div>
    );
  }

  if (el.type === "sticker" || el.type === "shape") {
    const color = typeof p.color === "string" && p.color ? p.color : theme.palette.accent;
    return <div style={{ ...fill, background: color }} />;
  }

  return null;
}

function EmptySlot({ ink, label, icon }: { ink: string; label: string; icon: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 4,
        border: `2px dashed ${ink}`,
        color: ink,
        opacity: 0.4,
        boxSizing: "border-box",
        fontSize: 11,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
