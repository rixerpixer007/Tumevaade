import fs from "node:fs";

import { describe, expect, it } from "vitest";

import { buildCriticalTheme, readThemePalettes } from "../scripts/theme-palettes.mjs";
import { DEFAULT_THEME_ID, getTheme, THEMES } from "../src/shared/themes";

const base = fs.readFileSync(
  new URL("../src/theme/modules/01-tokens.css", import.meta.url),
  "utf8",
);
const palettes = fs.readFileSync(
  new URL("../src/theme/modules/02-palettes.css", import.meta.url),
  "utf8",
);
const futureTheme = { ...getTheme("graphite-blue"), id: "future-theme" };

describe("theme pipeline", () => {
  it("accepts a future theme with only a catalog entry and palette, regardless of catalog order", () => {
    const source =
      palettes +
      palettes
        .slice(0, palettes.indexOf(':root[data-sid-theme="obsidian-red"]'))
        .replaceAll("graphite-blue", futureTheme.id);
    const result = readThemePalettes([futureTheme, ...THEMES], DEFAULT_THEME_ID, base, source);
    const critical = buildCriticalTheme(result, DEFAULT_THEME_ID);
    expect(result.find((theme) => theme.id === futureTheme.id)?.tokens["--sid-canvas"]).toBe(
      futureTheme.preview.canvas,
    );
    expect(critical).toContain(`[data-sid-theme="${futureTheme.id}"]`);
    expect(critical.indexOf('[data-sid-theme="future-theme"]')).toBeGreaterThan(
      critical.indexOf(`--sid-canvas: ${getTheme(DEFAULT_THEME_ID).preview.canvas}`),
    );
  });

  it("rejects a catalog entry without a palette", () => {
    expect(() =>
      readThemePalettes([...THEMES, futureTheme], DEFAULT_THEME_ID, base, palettes),
    ).toThrow("Missing palette: future-theme");
  });

  it("rejects palettes absent from the catalog", () => {
    expect(() =>
      readThemePalettes(
        THEMES,
        DEFAULT_THEME_ID,
        base,
        palettes.replace("graphite-blue", "unknown-theme"),
      ),
    ).toThrow("Unknown or duplicate palette: unknown-theme");
  });

  it("rejects preview colors that drift from the actual palette", () => {
    const catalog = THEMES.map((theme) => ({
      ...theme,
      preview: { ...theme.preview, canvas: "#000000" },
    }));
    expect(() => readThemePalettes(catalog, DEFAULT_THEME_ID, base, palettes)).toThrow(
      "preview canvas differs",
    );
  });

  it("rejects light palettes that would inherit a dark color", () => {
    expect(() =>
      readThemePalettes(
        THEMES,
        DEFAULT_THEME_ID,
        base,
        palettes.replace("--sid-text-2: #40584c;", ""),
      ),
    ).toThrow("light-mint must define --sid-text-2");
  });
});
