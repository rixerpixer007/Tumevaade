import "./preview-themes.css";

// Visual placeholders only: never registered in the theme catalog or settings store.
export function renderPreviewThemes(document: Document): void {
  const appearance = document.querySelector("#theme-options");
  if (appearance === null) return;
  const groups = [
    {
      title: "Heledad",
      themes: [
        {
          name: "Hele sinine",
          canvas: "#edf1f8",
          surface: "#ffffff",
          accent: "#4779c2",
          text: "#26354b",
        },
        { name: "Liiv", canvas: "#f5efdf", surface: "#fffaf0", accent: "#b28638", text: "#493e2d" },
      ],
    },
    {
      title: "Erikujundused",
      themes: [
        {
          name: "Minecraft",
          canvas: "#20291b",
          surface: "#3f4d32",
          accent: "#89b650",
          text: "#eef0d9",
        },
      ],
    },
  ];
  for (const group of groups) {
    const section = document.createElement("div");
    section.className = "theme-preview-category";
    const heading = document.createElement("h3");
    heading.className = "setting-label";
    heading.textContent = group.title;
    const grid = document.createElement("div");
    grid.className = "theme-options";
    for (const theme of group.themes) {
      const card = document.createElement("div");
      card.className = "theme-option theme-option--placeholder";
      if (theme.name === "Minecraft") card.classList.add("theme-option--minecraft");
      const preview = document.createElement("span");
      preview.className = "theme-option__preview";
      preview.setAttribute("aria-hidden", "true");
      for (const [token, value] of Object.entries(theme)) {
        if (token !== "name") preview.style.setProperty(`--theme-preview-${token}`, value);
      }
      for (const part of ["surface", "line", "accent"]) {
        const sample = document.createElement("span");
        sample.className = `theme-option__${part}`;
        preview.append(sample);
      }
      const name = document.createElement("span");
      name.className = "theme-option__name";
      name.textContent = theme.name;
      card.append(preview, name);
      grid.append(card);
    }
    section.append(heading, grid);
    const lightGrid = appearance.querySelector('[data-theme-family="light"] .theme-options');
    if (group.title === "Heledad" && lightGrid !== null) {
      lightGrid.append(...grid.children);
    } else {
      appearance.append(section);
    }
  }
}
