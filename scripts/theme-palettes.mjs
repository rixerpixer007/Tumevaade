import postcss from "postcss";

/**
 * Read only the canonical palette rules, keeping component CSS out of theme metadata.
 * Dark palettes may inherit shared semantic defaults; light palettes must own every color.
 * @param {readonly import('../src/shared/themes').ThemeDefinition[]} themes
 * @param {string} defaultThemeId
 * @param {string} baseSource
 * @param {string} paletteSource
 */
export function readThemePalettes(themes, defaultThemeId, baseSource, paletteSource) {
  const ids = themes.map((theme) => theme.id);
  if (new Set(ids).size !== ids.length || !ids.includes(defaultThemeId)) {
    throw new Error("Theme IDs must be unique and include the default theme");
  }
  if (ids.some((id) => !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))) {
    throw new Error("Theme IDs must be safe lowercase names separated by hyphens");
  }
  /** @type {Record<string, string>} */
  const defaults = {};
  postcss.parse(baseSource).walkRules(":root", (rule) => {
    rule.walkDecls(/^--sid-/, (decl) => {
      defaults[decl.prop] = decl.value;
    });
  });
  /** @type {Map<string, Record<string, string>>} */
  const overrides = new Map();
  postcss.parse(paletteSource).walkRules((rule) => {
    const match = /^:root\[data-sid-theme="([a-z0-9-]+)"\]$/.exec(rule.selector);
    if (!match) throw new Error(`Expected a standalone theme palette: ${rule.selector}`);
    const id = match[1];
    if (!ids.includes(id) || id === defaultThemeId || overrides.has(id)) {
      throw new Error(`Unknown or duplicate palette: ${id}`);
    }
    /** @type {Record<string, string>} */
    const tokens = {};
    rule.walkDecls((decl) => {
      if (!decl.prop.startsWith("--sid-") || !(decl.prop in defaults)) {
        throw new Error(`${id} has an unknown palette token: ${decl.prop}`);
      }
      tokens[decl.prop] = decl.value;
    });
    overrides.set(id, tokens);
  });
  return themes.map((theme) => {
    const own = theme.id === defaultThemeId ? defaults : overrides.get(theme.id);
    if (!own) throw new Error(`Missing palette: ${theme.id}`);
    if (theme.colorScheme === "light") {
      for (const key of Object.keys(defaults)) {
        if (!/^--sid-(radius|z-)/.test(key) && !(key in own)) {
          throw new Error(`${theme.id} must define ${key}`);
        }
      }
    }
    const tokens = { ...defaults, ...own };
    if (tokens["--sid-color-scheme"] !== theme.colorScheme) {
      throw new Error(`${theme.id} color scheme differs between catalog and palette`);
    }
    for (const [preview, token] of Object.entries({
      canvas: "--sid-canvas",
      surface: "--sid-surface-3",
      accent: "--sid-accent",
      text: "--sid-text",
    })) {
      // Light previews show cards; dark previews show the raised surface.
      const property =
        preview === "surface" && theme.colorScheme === "light" ? "--sid-surface" : token;
      if (tokens[property] !== theme.preview[preview]) {
        throw new Error(`${theme.id} preview ${preview} differs from ${property}`);
      }
    }
    return { id: theme.id, tokens };
  });
}

/**
 * @param {ReturnType<typeof readThemePalettes>} palettes
 * @param {string} defaultThemeId
 */
export function buildCriticalTheme(palettes, defaultThemeId) {
  const ordered = [...palettes].sort(
    (a, b) => Number(b.id === defaultThemeId) - Number(a.id === defaultThemeId),
  );
  return (
    `/* GENERATED FILE — DO NOT EDIT. Built from the canonical theme palettes. */\n` +
    `:root:where([data-sid-enhancement="enabled"]) {\n` +
    `  color-scheme: var(--sid-color-scheme);\n  background-color: var(--sid-canvas) !important;\n}\n\n` +
    `:root:where([data-sid-enhancement="enabled"]) body {\n` +
    `  background-color: var(--sid-canvas) !important;\n  color: var(--sid-text-2) !important;\n}\n\n` +
    ordered
      .map(({ id, tokens }) => {
        const selector =
          id === defaultThemeId
            ? `:root:where([data-sid-enhancement="enabled"])`
            : `:root:where([data-sid-enhancement="enabled"][data-sid-theme="${id}"])`;
        return (
          `${selector} {\n` +
          ["--sid-color-scheme", "--sid-canvas", "--sid-text-2"]
            .map((key) => `  ${key}: ${tokens[key]};`)
            .join("\n") +
          `\n}`
        );
      })
      .join("\n\n") +
    "\n"
  );
}
