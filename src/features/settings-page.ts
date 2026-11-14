import { applyTheme } from "./theme-selection";
import type { AppUpdates } from "../shared/app-updates";
import { DEFAULT_SETTINGS, type ExtensionSettings, type SettingsStore } from "../shared/settings";
import { getTheme, THEMES, type ThemeId } from "../shared/themes";

const SETTINGS_STATE_ATTRIBUTE = "data-sid-settings-state";

export interface SettingsPageDependencies {
  document: Document;
  settingsStore: SettingsStore;
  cacheTheme?: (themeId: ThemeId | "original") => void;
  returnToStuudium?: () => void;
  appUpdates?: AppUpdates;
  getCurrentVersion?: () => string | Promise<string>;
}

interface SettingsPageElements {
  returnControls: HTMLButtonElement[];
  originalButton: HTMLButtonElement;
  status: HTMLElement;
  searchInput: HTMLInputElement;
  categoryControls: HTMLButtonElement[];
  settingsSections: HTMLElement[];
  emptyState: HTMLElement;
  themeOptions: HTMLElement;
  colorSchemeMeta: HTMLMetaElement;
  appVersion: HTMLElement;
  updateCheckRow: HTMLElement;
  updateCheckButton: HTMLButtonElement;
  updateCheckStatus: HTMLElement;
}

function queryElements(document: Document): SettingsPageElements {
  const returnControls = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-return-to-stuudium]"),
  );
  const originalButton = document.querySelector<HTMLButtonElement>("#use-original");
  const status = document.querySelector<HTMLElement>("#status");
  const searchInput = document.querySelector<HTMLInputElement>("#settings-search");
  const categoryControls = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-category]"),
  );
  const settingsSections = Array.from(
    document.querySelectorAll<HTMLElement>("[data-settings-section]"),
  );
  const emptyState = document.querySelector<HTMLElement>(".settings-empty");
  const themeOptions = document.querySelector<HTMLElement>("#theme-options");
  const colorSchemeMeta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  const appVersion = document.querySelector<HTMLElement>("#app-version");
  const updateCheckRow = document.querySelector<HTMLElement>("[data-app-updates]");
  const updateCheckButton = document.querySelector<HTMLButtonElement>("#check-for-updates");
  const updateCheckStatus = document.querySelector<HTMLElement>("#update-check-status");

  if (
    returnControls.length === 0 ||
    originalButton === null ||
    status === null ||
    searchInput === null ||
    categoryControls.length === 0 ||
    settingsSections.length === 0 ||
    emptyState === null ||
    themeOptions === null ||
    colorSchemeMeta === null ||
    appVersion === null ||
    updateCheckRow === null ||
    updateCheckButton === null ||
    updateCheckStatus === null
  ) {
    throw new Error("Settings page controls are missing");
  }

  return {
    returnControls,
    originalButton,
    status,
    searchInput,
    categoryControls,
    settingsSections,
    emptyState,
    themeOptions,
    colorSchemeMeta,
    appVersion,
    updateCheckRow,
    updateCheckButton,
    updateCheckStatus,
  };
}

export function mountSettingsPage({
  document,
  settingsStore,
  cacheTheme = () => undefined,
  returnToStuudium = () => undefined,
  appUpdates,
  getCurrentVersion = () => appUpdates?.getCurrentVersion() ?? "Teadmata",
}: SettingsPageDependencies): () => void {
  const elements = queryElements(document);
  let activeCategory = "all";
  let currentSettings: ExtensionSettings = {
    enhancementEnabled: DEFAULT_SETTINGS.enhancementEnabled,
    theme: { ...DEFAULT_SETTINGS.theme },
  };
  let cleanedUp = false;

  function setStatus(message: string, state: "ready" | "saving" | "error" = "ready"): void {
    elements.status.textContent = message;
    elements.status.dataset.state = state;
  }

  function settingsThemeId(settings: ExtensionSettings): ThemeId | "original" {
    return settings.enhancementEnabled ? settings.theme.themeId : "original";
  }

  function applySettingsTheme(settings: ExtensionSettings): void {
    const themeId = settingsThemeId(settings);
    const colorScheme = themeId === "original" ? "light" : getTheme(themeId).colorScheme;
    if (themeId === "original") {
      document.documentElement.setAttribute("data-sid-theme", themeId);
    } else {
      applyTheme(document.documentElement, themeId);
    }
    elements.colorSchemeMeta.content = colorScheme;
    document.documentElement.style.colorScheme = colorScheme;
  }

  function revealSettingsPage(): void {
    // Settle the saved control and palette styles while transitions are disabled.
    document.body.getBoundingClientRect();
    document.documentElement.setAttribute(SETTINGS_STATE_ATTRIBUTE, "ready");
    document.body.setAttribute("aria-busy", "false");
  }

  function setAppearanceControls(): void {
    const { enhancementEnabled, theme } = currentSettings;
    const originalLabel = document.createElement("span");
    originalLabel.className = "appearance-original__label";
    originalLabel.textContent = enhancementEnabled
      ? "Või kasuta Stuudiumi originaali"
      : "Originaal on kasutusel";
    elements.originalButton.replaceChildren(originalLabel);
    elements.originalButton.disabled = !enhancementEnabled;
    elements.themeOptions
      .querySelectorAll<HTMLInputElement>('input[type="radio"]')
      .forEach((control) => {
        control.checked = enhancementEnabled && control.value === theme.themeId;
      });
  }

  function setThemeControlsDisabled(disabled: boolean): void {
    const controls =
      elements.themeOptions.querySelectorAll<HTMLInputElement>('input[type="radio"]');
    controls.forEach((control) => {
      control.disabled = disabled;
    });
  }

  function setSettingsControlsDisabled(disabled: boolean): void {
    elements.originalButton.disabled = disabled || !currentSettings.enhancementEnabled;
    setThemeControlsDisabled(disabled);
  }

  async function saveAppearance(nextSettings: ExtensionSettings): Promise<void> {
    const previousSettings = currentSettings;
    currentSettings = nextSettings;
    setAppearanceControls();
    setSettingsControlsDisabled(true);
    applySettingsTheme(currentSettings);
    setStatus("Salvestamine…", "saving");

    try {
      await settingsStore.set(currentSettings);
      cacheTheme(settingsThemeId(currentSettings));
      setStatus(
        currentSettings.enhancementEnabled
          ? `Valitud on kujundus „${getTheme(currentSettings.theme.themeId).shortName}“.`
          : "Kasutusel on Stuudiumi originaal.",
      );
    } catch (error) {
      console.error("Unable to save appearance preference", error);
      currentSettings = previousSettings;
      applySettingsTheme(previousSettings);
      setStatus("Välimuse eelistust ei õnnestunud salvestada. Proovi uuesti.", "error");
    } finally {
      setAppearanceControls();
      setSettingsControlsDisabled(false);
    }
  }

  function renderThemeOptions(): void {
    const fragment = document.createDocumentFragment();

    const grids = new Map<string, HTMLElement>();
    for (const [family, title] of [
      ["dark", "Tumedad"],
      ["light", "Heledad"],
    ] as const) {
      const themes = THEMES.filter((theme) => theme.colorScheme === family);
      if (themes.length === 0) continue;
      const fieldset = document.createElement("fieldset");
      fieldset.className = "theme-picker";
      fieldset.dataset.themeFamily = family;
      const legend = document.createElement("legend");
      legend.className = "setting-label";
      legend.textContent = title;
      const grid = document.createElement("div");
      grid.className = "theme-options";
      fieldset.append(legend, grid);
      fragment.append(fieldset);
      grids.set(family, grid);
    }

    THEMES.forEach((theme) => {
      const label = document.createElement("label");
      label.className = "theme-option";
      label.title = theme.description;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "theme";
      input.value = theme.id;
      input.setAttribute("aria-label", theme.shortName);

      const preview = document.createElement("span");
      preview.className = "theme-option__preview";
      preview.setAttribute("aria-hidden", "true");
      preview.style.setProperty("--theme-preview-canvas", theme.preview.canvas);
      preview.style.setProperty("--theme-preview-surface", theme.preview.surface);
      preview.style.setProperty("--theme-preview-accent", theme.preview.accent);
      preview.style.setProperty("--theme-preview-text", theme.preview.text);

      const sampleSurface = document.createElement("span");
      sampleSurface.className = "theme-option__surface";
      const sampleLine = document.createElement("span");
      sampleLine.className = "theme-option__line";
      const sampleAccent = document.createElement("span");
      sampleAccent.className = "theme-option__accent";
      const selectedMark = document.createElement("span");
      selectedMark.className = "theme-option__selected";
      selectedMark.textContent = "✓";
      selectedMark.setAttribute("aria-hidden", "true");
      preview.append(sampleSurface, sampleLine, sampleAccent, selectedMark);

      const name = document.createElement("span");
      name.className = "theme-option__name";
      name.textContent = theme.shortName;

      input.addEventListener("change", () => {
        if (!input.checked) return;
        void saveAppearance({
          ...currentSettings,
          enhancementEnabled: true,
          theme: { mode: "manual", themeId: theme.id },
        });
      });

      label.append(input, preview, name);
      grids.get(theme.colorScheme)?.append(label);
    });

    elements.themeOptions.replaceChildren(fragment);
  }

  async function initialize(): Promise<void> {
    try {
      const settings = await settingsStore.get();
      if (cleanedUp) return;
      currentSettings = settings;
      setAppearanceControls();
      applySettingsTheme(settings);
      cacheTheme(settingsThemeId(settings));
      setSettingsControlsDisabled(false);
      setStatus(
        settings.enhancementEnabled
          ? "Tumevaate kujundus on sisse lülitatud."
          : "Tumevaate kujundus on välja lülitatud.",
      );
    } catch (error) {
      if (cleanedUp) return;
      console.error("Unable to read enhancement settings", error);
      setAppearanceControls();
      applySettingsTheme(currentSettings);
      cacheTheme(settingsThemeId(currentSettings));
      setStatus("Salvestatud eelistust ei õnnestunud lugeda.", "error");
    } finally {
      if (!cleanedUp) revealSettingsPage();
    }
  }

  async function initializeAppUpdates(): Promise<void> {
    elements.updateCheckRow.hidden = appUpdates === undefined;
    elements.updateCheckButton.disabled = appUpdates === undefined;

    try {
      const version = await getCurrentVersion();
      if (!cleanedUp) elements.appVersion.textContent = version;
    } catch (error) {
      console.error("Unable to read the installed app version", error);
      if (!cleanedUp) elements.appVersion.textContent = "Teadmata";
    }
  }

  async function checkForUpdates(): Promise<void> {
    if (appUpdates === undefined) return;

    elements.updateCheckButton.disabled = true;
    elements.updateCheckStatus.textContent = "Uuenduste kontrollimine…";

    try {
      const result = await appUpdates.checkForUpdates();
      if (cleanedUp) return;
      elements.updateCheckStatus.textContent =
        result === "update-available"
          ? "Uus versioon on saadaval."
          : result === "up-to-date"
            ? "Tumevaade on ajakohane."
            : "Uuendusi ei õnnestunud kontrollida. Proovi hiljem uuesti.";
    } catch (error) {
      console.error("Unable to check for app updates", error);
      if (!cleanedUp) {
        elements.updateCheckStatus.textContent =
          "Uuendusi ei õnnestunud kontrollida. Proovi hiljem uuesti.";
      }
    } finally {
      if (!cleanedUp) elements.updateCheckButton.disabled = false;
    }
  }

  function filterSettings(): void {
    const query = elements.searchInput.value.trim().toLocaleLowerCase();
    let visibleSections = 0;

    elements.settingsSections.forEach((section) => {
      const matchesCategory =
        activeCategory === "all" || section.dataset.settingsSection === activeCategory;
      const settingItems = Array.from(section.querySelectorAll<HTMLElement>("[data-setting-item]"));
      let hasMatchingItem = false;

      settingItems.forEach((settingItem) => {
        const searchableText = `${settingItem.dataset.searchTerms ?? ""} ${settingItem.textContent}`
          .toLocaleLowerCase()
          .trim();
        const isAvailable = settingItem !== elements.updateCheckRow || appUpdates !== undefined;
        const matchesSearch = isAvailable && (query.length === 0 || searchableText.includes(query));

        settingItem.hidden = !matchesSearch;
        if (matchesSearch) hasMatchingItem = true;
      });

      const sectionSearchText = `${section.dataset.searchTerms ?? ""} ${section.textContent}`
        .toLocaleLowerCase()
        .trim();
      const matchesSearch =
        settingItems.length > 0
          ? hasMatchingItem
          : query.length === 0 || sectionSearchText.includes(query);
      const visible = matchesCategory && matchesSearch;

      section.hidden = !visible;
      if (visible) visibleSections += 1;
    });

    elements.emptyState.hidden = visibleSections > 0;
  }

  const handleOriginalClick = (): void => {
    void saveAppearance({ ...currentSettings, enhancementEnabled: false });
  };
  const handleHomeClick = (): void => {
    returnToStuudium();
  };
  const handleSearchInput = (): void => {
    filterSettings();
  };
  const handleUpdateCheck = (): void => {
    void checkForUpdates();
  };
  const categoryHandlers = elements.categoryControls.map((control) => {
    const handler = (): void => {
      activeCategory = control.dataset.category ?? "all";

      elements.categoryControls.forEach((candidate) => {
        const selected = candidate === control;
        candidate.classList.toggle("is-active", selected);
        candidate.setAttribute("aria-pressed", String(selected));
      });

      filterSettings();
    };
    control.addEventListener("click", handler);
    return { control, handler };
  });

  elements.returnControls.forEach((control) => {
    control.addEventListener("click", handleHomeClick);
  });
  elements.originalButton.addEventListener("click", handleOriginalClick);
  elements.searchInput.addEventListener("input", handleSearchInput);
  elements.updateCheckButton.addEventListener("click", handleUpdateCheck);
  renderThemeOptions();
  setSettingsControlsDisabled(true);
  void initialize();
  void initializeAppUpdates();

  return () => {
    if (cleanedUp) return;
    cleanedUp = true;
    elements.returnControls.forEach((control) => {
      control.removeEventListener("click", handleHomeClick);
    });
    elements.originalButton.removeEventListener("click", handleOriginalClick);
    elements.searchInput.removeEventListener("input", handleSearchInput);
    elements.updateCheckButton.removeEventListener("click", handleUpdateCheck);
    categoryHandlers.forEach(({ control, handler }) => {
      control.removeEventListener("click", handler);
    });
  };
}
