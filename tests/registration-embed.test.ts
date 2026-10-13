import { afterEach, describe, expect, it, vi } from "vitest";

import { normalizeSettings, type ExtensionSettings } from "../src/shared/settings";

const store = vi.hoisted(() => ({ get: vi.fn(), subscribe: vi.fn() }));
vi.mock("../src/platforms/webextension/settings-storage", () => ({
  createWebExtensionSettingsStore: () => store,
}));

interface EmbedDefinition {
  main(ctx: { onInvalidated(callback: () => void): void; setInterval: typeof vi.fn }): void;
}

async function mount() {
  const attributes = new Map<string, string>();
  const root = {
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
  };
  vi.stubGlobal("document", { documentElement: root });
  vi.stubGlobal("defineContentScript", (definition: EmbedDefinition) => definition);
  let listener: (settings: ExtensionSettings) => void = () => {};
  const unsubscribe = vi.fn();
  store.subscribe.mockImplementation((callback: typeof listener) => {
    listener = callback;
    return unsubscribe;
  });
  let invalidate = () => {};
  const ctx = {
    onInvalidated: (callback: () => void) => {
      invalidate = callback;
    },
    setInterval: vi.fn(),
  };
  const module = await import("../src/entrypoints/registration-embed.content");
  const definition = module.default as unknown as EmbedDefinition;
  definition.main(ctx);
  return {
    attributes,
    unsubscribe,
    invalidate: () => {
      invalidate();
    },
    change: (settings: ExtensionSettings) => {
      listener(settings);
    },
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
  store.get.mockReset();
  store.subscribe.mockReset();
});

describe("registration embed theme lifecycle", () => {
  it("follows preference changes, disables cleanly, and ignores events after invalidation", async () => {
    store.get.mockResolvedValue(normalizeSettings(undefined));
    const embed = await mount();
    await vi.waitFor(() => {
      expect(embed.attributes.get("data-sid-enhancement")).toBe("enabled");
    });
    embed.change(normalizeSettings({ theme: { mode: "manual", themeId: "graphite-blue" } }));
    expect(embed.attributes.get("data-sid-theme")).toBe("graphite-blue");
    embed.change(normalizeSettings({ enhancementEnabled: false }));
    expect(embed.attributes.size).toBe(0);
    embed.change(normalizeSettings(undefined));
    expect(embed.attributes.get("data-sid-enhancement")).toBe("enabled");
    embed.invalidate();
    embed.invalidate();
    expect(embed.unsubscribe).toHaveBeenCalledTimes(1);
    embed.change(normalizeSettings(undefined));
    expect(embed.attributes.size).toBe(0);
  });

  it("does not overwrite a newer preference event with a delayed initial read", async () => {
    let resolve: (settings: ExtensionSettings) => void = () => {};
    store.get.mockReturnValue(
      new Promise<ExtensionSettings>((done) => {
        resolve = done;
      }),
    );
    const embed = await mount();
    embed.change(normalizeSettings({ enhancementEnabled: false }));
    resolve(normalizeSettings(undefined));
    await Promise.resolve();
    expect(embed.attributes.size).toBe(0);
  });
});
