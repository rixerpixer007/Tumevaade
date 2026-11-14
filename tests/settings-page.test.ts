// @vitest-environment happy-dom

import { beforeEach, describe, expect, it, vi } from "vitest";

import { mountSettingsPage } from "../src/features/settings-page";
import type { ExtensionSettings, SettingsStore } from "../src/shared/settings";

function createStore(): SettingsStore & { value: ExtensionSettings } {
  return {
    value: {
      enhancementEnabled: true,
      theme: { mode: "manual", themeId: "graphite-blue" },
    },
    get() {
      return Promise.resolve(this.value);
    },
    set(settings) {
      this.value = settings;
      return Promise.resolve();
    },
    subscribe() {
      return () => undefined;
    },
  };
}

describe("shared settings page", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = `
      <head><meta name="color-scheme" content="dark"></head>
      <body aria-busy="true">
        <button class="app-home" type="button" data-return-to-stuudium></button>
        <button class="settings-return" type="button" data-return-to-stuudium></button>
        <button data-category="all" aria-pressed="true"></button>
        <button data-category="appearance" aria-pressed="false"></button>
        <button data-category="updates" aria-pressed="false"></button>
        <input id="settings-search">
        <section data-settings-section="appearance">
          <div data-setting-item data-search-terms="theme">
            <button id="use-original" type="button"></button>
            <div id="theme-options"></div>
          </div>
        </section>
        <section data-settings-section="privacy"></section>
        <section data-settings-section="updates">
          <div data-setting-item data-search-terms="version update">
            <span id="app-version">Laadimine…</span>
          </div>
          <div data-setting-item data-app-updates data-search-terms="android" hidden>
            <button id="check-for-updates" type="button">Kontrolli</button>
            <p id="update-check-status"></p>
          </div>
        </section>
        <p id="status"></p>
        <p class="settings-empty" hidden></p>
      </body>
    `;
  });

  it("renders the shared catalog and persists theme and enable changes", async () => {
    const store = createStore();
    const cleanup = mountSettingsPage({ document, settingsStore: store });
    await Promise.resolve();

    const themeInputs = document.querySelectorAll<HTMLInputElement>('input[name="theme"]');
    expect(themeInputs).toHaveLength(9);
    expect(document.querySelector(".theme-option[title]")).toBeNull();
    expect(themeInputs[1]?.checked).toBe(true);
    expect(themeInputs[1]?.getAttribute("aria-label")).toBe("Sinine");
    expect(document.documentElement.dataset.sidTheme).toBe("graphite-blue");
    expect(document.documentElement.dataset.sidSettingsState).toBe("ready");

    const mint = themeInputs[0];
    if (mint === undefined) throw new Error("Mint theme control is missing");
    mint.checked = true;
    mint.dispatchEvent(new Event("change"));
    await Promise.resolve();
    expect(store.value.theme.themeId).toBe("graphite-mint");

    const original = document.querySelector<HTMLButtonElement>("#use-original");
    if (original === null) throw new Error("Original control missing");
    original.click();
    await Promise.resolve();
    expect(store.value.enhancementEnabled).toBe(false);
    expect(store.value.theme.themeId).toBe("graphite-mint");
    expect(original.textContent).toBe("Originaal on kasutusel");
    expect(original.disabled).toBe(true);
    expect([...themeInputs].every((input) => !input.checked)).toBe(true);
    expect(document.documentElement.dataset.sidTheme).toBe("original");
    expect(document.documentElement.style.colorScheme).toBe("light");
    expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute("content")).toBe(
      "light",
    );

    // Selecting even the remembered theme must enable it again.
    mint.checked = true;
    mint.dispatchEvent(new Event("change"));
    await Promise.resolve();
    expect(store.value.enhancementEnabled).toBe(true);
    expect(original.disabled).toBe(false);
    expect(document.documentElement.dataset.sidTheme).toBe("graphite-mint");
    expect(document.documentElement.style.colorScheme).toBe("dark");
    expect(original.textContent).toBe("Või kasuta Stuudiumi originaali");

    cleanup();
  });

  it.each(["light-mint", "light-blue", "sand", "light-mauve"] as const)(
    "persists %s in the light group and restores its scheme on remount",
    async (themeId) => {
      const store = createStore();
      const cacheTheme = vi.fn();
      let cleanup = mountSettingsPage({ document, settingsStore: store, cacheTheme });
      await Promise.resolve();
      const light = document.querySelector<HTMLInputElement>(`input[value="${themeId}"]`);
      if (light === null) throw new Error("Light theme control missing");
      expect(light.closest("fieldset")?.querySelector("legend")?.textContent).toBe("Heledad");
      expect(document.querySelectorAll('[data-theme-family="dark"] input')).toHaveLength(5);
      expect(document.querySelectorAll('[data-theme-family="light"] input')).toHaveLength(4);
      light.checked = true;
      light.dispatchEvent(new Event("change"));
      await Promise.resolve();
      expect(store.value.theme.themeId).toBe(themeId);
      expect(document.documentElement.dataset.sidTheme).toBe(themeId);
      expect(document.documentElement.style.colorScheme).toBe("light");
      expect(document.querySelector('meta[name="color-scheme"]')?.getAttribute("content")).toBe(
        "light",
      );
      expect(cacheTheme).toHaveBeenLastCalledWith(themeId);
      cleanup();
      cleanup = mountSettingsPage({ document, settingsStore: store });
      await Promise.resolve();
      expect(document.querySelector<HTMLInputElement>(`input[value="${themeId}"]`)?.checked).toBe(
        true,
      );
      expect(document.documentElement.style.colorScheme).toBe("light");
      const dark = document.querySelector<HTMLInputElement>('input[value="graphite-mint"]');
      if (dark === null) throw new Error("Dark Mint control missing");
      dark.checked = true;
      dark.dispatchEvent(new Event("change"));
      await Promise.resolve();
      expect(document.documentElement.style.colorScheme).toBe("dark");
      cleanup();
    },
  );

  it("preserves a disabled saved appearance across remounts and enables a new selection", async () => {
    const store = createStore();
    store.value.enhancementEnabled = false;
    const cacheTheme = vi.fn();
    let cleanup = mountSettingsPage({ document, settingsStore: store, cacheTheme });
    await Promise.resolve();
    expect(document.querySelector("input:checked")).toBeNull();
    expect(store.value.theme.themeId).toBe("graphite-blue");
    expect(document.documentElement.dataset.sidTheme).toBe("original");
    expect(cacheTheme).toHaveBeenLastCalledWith("original");
    cleanup();
    cleanup = mountSettingsPage({ document, settingsStore: store });
    await Promise.resolve();
    expect(document.querySelector("input:checked")).toBeNull();
    const red = document.querySelector<HTMLInputElement>('input[value="obsidian-red"]');
    if (red === null) throw new Error("Red control missing");
    red.checked = true;
    red.dispatchEvent(new Event("change"));
    await Promise.resolve();
    expect(store.value).toEqual({
      enhancementEnabled: true,
      theme: { mode: "manual", themeId: "obsidian-red" },
    });
    cleanup();
    cleanup = mountSettingsPage({ document, settingsStore: store });
    await Promise.resolve();
    expect(document.querySelector<HTMLInputElement>('input[value="obsidian-red"]')?.checked).toBe(
      true,
    );
    cleanup();
  });

  it.each([true, false])(
    "restores the entire previous appearance after a failed save (enabled=%s)",
    async (enabled) => {
      vi.spyOn(console, "error").mockImplementation(() => undefined);
      const store = createStore();
      store.value.enhancementEnabled = enabled;
      store.set = vi.fn().mockRejectedValue(new Error("Storage unavailable"));
      const cleanup = mountSettingsPage({ document, settingsStore: store });
      await Promise.resolve();
      if (enabled) {
        document.querySelector<HTMLButtonElement>("#use-original")?.click();
      } else {
        const mint = document.querySelector<HTMLInputElement>('input[value="graphite-mint"]');
        if (mint === null) throw new Error("Mint control missing");
        mint.checked = true;
        mint.dispatchEvent(new Event("change"));
      }
      await Promise.resolve();
      expect(document.querySelector<HTMLButtonElement>("#use-original")?.disabled).toBe(!enabled);
      expect(document.documentElement.dataset.sidTheme).toBe(
        enabled ? "graphite-blue" : "original",
      );
      expect(document.documentElement.style.colorScheme).toBe(enabled ? "dark" : "light");
      expect(document.querySelector("#status")?.getAttribute("data-state")).toBe("error");
      expect(document.querySelectorAll("input:checked")).toHaveLength(enabled ? 1 : 0);
      cleanup();
    },
  );

  it("returns to Stuudium from both back controls", () => {
    const returnToStuudium = vi.fn();
    const cleanup = mountSettingsPage({
      document,
      settingsStore: createStore(),
      returnToStuudium,
    });

    document.querySelector<HTMLButtonElement>(".app-home")?.click();
    document.querySelector<HTMLButtonElement>(".settings-return")?.click();

    expect(returnToStuudium).toHaveBeenCalledTimes(2);
    cleanup();
  });

  it("shows an unknown version when no platform version reader is available", async () => {
    const cleanup = mountSettingsPage({ document, settingsStore: createStore() });
    await Promise.resolve();

    expect(document.querySelector("#app-version")?.textContent).toBe("Teadmata");
    expect(document.querySelector<HTMLElement>("[data-app-updates]")?.hidden).toBe(true);
    cleanup();
  });

  it("shows the installed extension version without enabling Android update checks", async () => {
    const getCurrentVersion = vi.fn(() => "2.3.4");
    const cleanup = mountSettingsPage({
      document,
      settingsStore: createStore(),
      getCurrentVersion,
    });
    await Promise.resolve();

    expect(getCurrentVersion).toHaveBeenCalledOnce();
    expect(document.querySelector("#app-version")?.textContent).toBe("2.3.4");
    expect(document.querySelector<HTMLElement>("[data-app-updates]")?.hidden).toBe(true);
    cleanup();
  });

  it("keeps Android update checks hidden when filtering browser settings", () => {
    const cleanup = mountSettingsPage({ document, settingsStore: createStore() });
    const search = document.querySelector<HTMLInputElement>("#settings-search");
    if (search === null) throw new Error("Search control is missing");

    for (const query of ["android", "version", ""]) {
      search.value = query;
      search.dispatchEvent(new Event("input"));
      expect(document.querySelector<HTMLElement>("[data-app-updates]")?.hidden).toBe(true);
      expect(document.querySelector<HTMLElement>('[data-settings-section="updates"]')?.hidden).toBe(
        query === "android",
      );
    }
    document.querySelector<HTMLButtonElement>('[data-category="updates"]')?.click();
    expect(document.querySelector<HTMLElement>("[data-app-updates]")?.hidden).toBe(true);
    cleanup();
  });

  it("keeps settings usable when reading the installed version fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const cleanup = mountSettingsPage({
      document,
      settingsStore: createStore(),
      getCurrentVersion: () => {
        throw new Error("Extension context invalidated.");
      },
    });
    await Promise.resolve();

    expect(document.querySelector("#app-version")?.textContent).toBe("Teadmata");
    expect(document.querySelector<HTMLButtonElement>("#use-original")?.disabled).toBe(false);
    cleanup();
  });

  it("shows the native version and runs a manual Android update check", async () => {
    const appUpdates = {
      getCurrentVersion: vi.fn().mockResolvedValue("0.1.0-beta"),
      checkForUpdates: vi.fn().mockResolvedValue("up-to-date" as const),
    };
    const cleanup = mountSettingsPage({
      document,
      settingsStore: createStore(),
      appUpdates,
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(document.querySelector("#app-version")?.textContent).toBe("0.1.0-beta");
    expect(document.querySelector<HTMLElement>("[data-app-updates]")?.hidden).toBe(false);
    document.querySelector<HTMLButtonElement>("#check-for-updates")?.click();
    await Promise.resolve();
    await Promise.resolve();

    expect(appUpdates.checkForUpdates).toHaveBeenCalledOnce();
    expect(document.querySelector("#update-check-status")?.textContent).toBe(
      "Tumevaade on ajakohane.",
    );
    cleanup();
  });
});
