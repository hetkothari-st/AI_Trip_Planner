"use client";

import { ElementView } from "./ElementView";
import { SIZE_DIMS, type StoryPage, type SizePreset } from "@/lib/storybook/types";
import type { Theme } from "@/lib/storybook/templates/themes";

/**
 * Read-only render of a single storybook page. The outer box is the positioning
 * context: every element is placed absolutely using PERCENT coordinates of the
 * page, so the same layout scales cleanly at any `scale`.
 */
export function PageCanvas({
  page,
  theme,
  sizePreset,
  scale = 1,
}: {
  page: StoryPage;
  theme: Theme;
  sizePreset: SizePreset;
  scale?: number;
}) {
  const dims = SIZE_DIMS[sizePreset] ?? SIZE_DIMS.square;
  const elements = [...(page.elements ?? [])].sort((a, b) => a.z - b.z);

  return (
    <div
      style={{
        position: "relative",
        width: dims.w * scale,
        height: dims.h * scale,
        background: page.bg || theme.palette.paper,
        overflow: "hidden",
        fontFamily: theme.fonts.body,
      }}
    >
      {elements.map((el) => (
        <div
          key={el.id}
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
          <ElementView el={el} theme={theme} />
        </div>
      ))}
    </div>
  );
}
