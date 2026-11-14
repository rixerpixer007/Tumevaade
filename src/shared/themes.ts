export const THEME_ATTRIBUTE = "data-sid-theme";

export interface ThemePreview {
  canvas: string;
  surface: string;
  accent: string;
  text: string;
}

export interface ThemeDefinition {
  id: string;
  name: string;
  shortName: string;
  description: string;
  colorScheme: "dark" | "light";
  preview: ThemePreview;
}

export const THEMES = [
  {
    id: "graphite-mint",
    name: "Grafiit ja münt",
    shortName: "Münt",
    description: "Algupärane grafiiditoonides kujundus mündirohelise aktsendiga.",
    colorScheme: "dark",
    preview: {
      canvas: "#0f1311",
      surface: "#202824",
      accent: "#65d6b1",
      text: "#f2f0e9",
    },
  },
  {
    id: "graphite-blue",
    name: "Grafiit ja sinine",
    shortName: "Sinine",
    description: "Jahedates grafiiditoonides kujundus rahuliku sinise aktsendiga.",
    colorScheme: "dark",
    preview: {
      canvas: "#0c1118",
      surface: "#202b3a",
      accent: "#75a7ff",
      text: "#eef2f8",
    },
  },
  {
    id: "obsidian-red",
    name: "Obsidiaan ja punane",
    shortName: "Punane",
    description: "Peaaegu mustad söetoonid erksa karmiinpunase aktsendiga.",
    colorScheme: "dark",
    preview: {
      canvas: "#0d0d0f",
      surface: "#282429",
      accent: "#ff6b7a",
      text: "#f5f0f2",
    },
  },
  {
    id: "velvet-mauve",
    name: "Samet ja lillakas",
    shortName: "Lillakas",
    description: "Pehme tume mokapalett lavendlililla aktsendiga.",
    colorScheme: "dark",
    preview: {
      canvas: "#11111b",
      surface: "#313244",
      accent: "#cba6f7",
      text: "#cdd6f4",
    },
  },
  {
    id: "midnight-amber",
    name: "Kesköö ja merevaik",
    shortName: "Merevaik",
    description: "Soojad tindimustad toonid rikkaliku merevaigukarva aktsendiga.",
    colorScheme: "dark",
    preview: {
      canvas: "#11100d",
      surface: "#2b261d",
      accent: "#f2b84b",
      text: "#f3ead7",
    },
  },
  {
    id: "light-mint",
    name: "Hele münt",
    shortName: "Hele münt",
    description: "Pehme rohekashall taust, valged kaardid ja sügavrohelised aktsendid.",
    colorScheme: "light",
    preview: {
      canvas: "#edf4ef",
      surface: "#ffffff",
      accent: "#267458",
      text: "#263c32",
    },
  },
  {
    id: "light-blue",
    name: "Hele sinine",
    shortName: "Hele sinine",
    description: "Jahe sinakashall taust, valged kaardid ja sügavsinised aktsendid.",
    colorScheme: "light",
    preview: {
      canvas: "#edf1f8",
      surface: "#ffffff",
      accent: "#315fa3",
      text: "#26354b",
    },
  },
  {
    id: "sand",
    name: "Liiv",
    shortName: "Liiv",
    description: "Soe elevandiluukarva taust, kreemikad kaardid ja pronksikarva aktsendid.",
    colorScheme: "light",
    preview: {
      canvas: "#f5efdf",
      surface: "#fffaf0",
      accent: "#7d592b",
      text: "#493e2d",
    },
  },
  {
    id: "light-mauve",
    name: "Hele lillakas",
    shortName: "Hele lillakas",
    description: "Õrn roosakas-lilla taust, heledad kaardid ja sügavad lillakasroosad aktsendid.",
    colorScheme: "light",
    preview: {
      canvas: "#f6eef5",
      surface: "#fffafd",
      accent: "#864c86",
      text: "#443146",
    },
  },
] as const satisfies readonly ThemeDefinition[];

export type ThemeId = (typeof THEMES)[number]["id"];

export const DEFAULT_THEME_ID: ThemeId = "graphite-mint";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEMES.some((theme) => theme.id === value);
}

export function getTheme(value: ThemeId): (typeof THEMES)[number] {
  const theme = THEMES.find((candidate) => candidate.id === value);
  if (theme === undefined) throw new Error(`Unknown theme: ${value}`);
  return theme;
}
