import "../generated/theme.css";

import { applyTheme, clearTheme } from "../features/theme-selection";
import { createWebExtensionSettingsStore } from "../platforms/webextension/settings-storage";
import type { ExtensionSettings } from "../shared/settings";
import { STUUDIUM_REGISTRATION_EMBED_MATCHES } from "../shared/sites";

type EmbedGlobal = typeof globalThis & {
  __sidRegistrationEmbedCleanup?: () => void;
};

export default defineContentScript({
  matches: [...STUUDIUM_REGISTRATION_EMBED_MATCHES],
  allFrames: true,
  runAt: "document_start",
  world: "ISOLATED",

  main(ctx) {
    const embedGlobal = globalThis as EmbedGlobal;
    embedGlobal.__sidRegistrationEmbedCleanup?.();
    const root = document.documentElement;
    const settingsStore = createWebExtensionSettingsStore();
    let cleanedUp = false;
    let unsubscribe = (): void => {};
    let settingsChanged = false;

    const clear = (): void => {
      root.removeAttribute("data-sid-enhancement");
      root.removeAttribute("data-sid-registration-embed");
      clearTheme(root);
    };
    const apply = (settings: ExtensionSettings): void => {
      if (cleanedUp) return;
      if (!settings.enhancementEnabled) {
        clear();
        return;
      }
      root.setAttribute("data-sid-registration-embed", "");
      applyTheme(root, settings.theme.themeId);
      root.setAttribute("data-sid-enhancement", "enabled");
    };
    const cleanup = (): void => {
      if (cleanedUp) return;
      cleanedUp = true;
      unsubscribe();
      clear();
      if (embedGlobal.__sidRegistrationEmbedCleanup === cleanup) {
        delete embedGlobal.__sidRegistrationEmbedCleanup;
      }
    };

    embedGlobal.__sidRegistrationEmbedCleanup = cleanup;
    ctx.onInvalidated(cleanup);
    ctx.setInterval(() => undefined, 500);
    unsubscribe = settingsStore.subscribe((settings) => {
      settingsChanged = true;
      apply(settings);
    });
    void settingsStore
      .get()
      .then((settings) => {
        if (!settingsChanged) apply(settings);
      })
      .catch((error: unknown) => {
        console.error("Unable to read registration embed theme settings", error);
      });
  },
});
