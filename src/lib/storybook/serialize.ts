import type { Storybook, StoryElement } from "./types";
import { SIZE_DIMS } from "./types";
import { getTheme, type Theme } from "./templates/themes";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Also escape double-quotes so a value can't break out of an HTML attribute.
    .replace(/"/g, "&quot;");
}

function elHtml(e: StoryElement, theme: Theme): string {
  const box = `position:absolute;left:${e.x}%;top:${e.y}%;width:${e.w}%;height:${e.h}%;transform:rotate(${e.rotation}deg);z-index:${e.z};`;
  const p = e.props as Record<string, any>;
  if (e.type === "photo" || e.type === "ticket") {
    if (!p.url) return `<div style="${box}border:2px dashed #bbb"></div>`;
    const fit = p.fit === "contain" ? "contain" : "cover";
    return `<div style="${box}overflow:hidden"><img src="${esc(String(p.url))}" style="width:100%;height:100%;object-fit:${fit}"/></div>`;
  }
  if (e.type === "text") {
    // Omitted colors inherit the theme (text -> ink) so seeded pages match their theme.
    const style = `${box}font-size:${p.size ?? 16}px;color:${esc(String(p.color ?? theme.palette.ink))};text-align:${p.align ?? "left"};`;
    return `<div style="${style}">${esc(String(p.text ?? ""))}</div>`;
  }
  return `<div style="${box}background:${esc(String(p.color ?? theme.palette.accent))}"></div>`;
}

export function bookToHtml(book: Storybook): string {
  const dims = SIZE_DIMS[book.sizePreset];
  const theme = getTheme(book.theme);
  const pages = book.pages
    .map(
      (pg) =>
        `<section class="page" style="position:relative;width:${dims.w}px;height:${dims.h}px;background:${pg.bg || theme.palette.bg};page-break-after:always;overflow:hidden;font-family:${theme.fonts.body}">` +
        pg.elements.map((el) => elHtml(el, theme)).join("") +
        `</section>`,
    )
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}@page{size:${dims.w}px ${dims.h}px;margin:0}</style></head><body>${pages}</body></html>`;
}
