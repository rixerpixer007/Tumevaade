import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, "..");
const BUILD_DIRECTORY = path.join(PROJECT_ROOT, ".output/chrome-mv3");
const EXPECTED_MATCH = "https://torg.ope.ee/*";
const EXPECTED_AUTH_EXCLUDE_MATCH = "https://torg.ope.ee/auth*";
const EXPECTED_REGISTRATION_EMBED_MATCH = "https://torg.ope.ee/api/embed/registration/*";
const packageMetadata = JSON.parse(
  fs.readFileSync(path.join(PROJECT_ROOT, "package.json"), "utf8"),
);

function walkFiles(directory, base = directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walkFiles(absolutePath, base)
      : [path.relative(base, absolutePath).split(path.sep).join("/")];
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

if (!fs.existsSync(BUILD_DIRECTORY)) {
  throw new Error("The production build is missing; run npm run build first");
}

const manifestPath = path.join(BUILD_DIRECTORY, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const files = walkFiles(BUILD_DIRECTORY).sort();

assert(manifest.manifest_version === 3, "Production manifest must use Manifest V3");
assert(manifest.version === packageMetadata.version, "Manifest and package versions differ");
assert(
  JSON.stringify([...(manifest.permissions ?? [])].sort()) ===
    JSON.stringify(["scripting", "storage"]),
  "Production permissions must contain only scripting and storage",
);
assert(
  JSON.stringify(manifest.host_permissions) === JSON.stringify([EXPECTED_MATCH]),
  "Production host access must be limited to the verified TORG origin",
);
assert(manifest.options_ui?.page === "options.html", "Options page is not registered");
assert(manifest.background?.service_worker !== undefined, "MV3 service worker is missing");
assert(Array.isArray(manifest.content_scripts), "Bootstrap content script is missing");
assert(manifest.content_scripts.length === 2, "Expected bootstrap and registration embed scripts");

const expectedIcons = {
  16: "icons/icon-16.png",
  32: "icons/icon-32.png",
  48: "icons/icon-48.png",
  128: "icons/icon-128.png",
};
assert(
  JSON.stringify(manifest.icons) === JSON.stringify(expectedIcons),
  "Manifest icons do not match the approved Tumevaade icon set",
);
assert(
  JSON.stringify(manifest.action?.default_icon) === JSON.stringify(expectedIcons),
  "Toolbar icons do not match the approved Tumevaade icon set",
);
for (const iconPath of Object.values(expectedIcons)) {
  assert(files.includes(iconPath), `Packaged icon is missing: ${iconPath}`);
  const builtIcon = fs.readFileSync(path.join(BUILD_DIRECTORY, iconPath));
  const sourceIcon = fs.readFileSync(path.join(PROJECT_ROOT, "public", iconPath));
  assert(builtIcon.equals(sourceIcon), `Packaged icon is stale: ${iconPath}`);
}

const bootstrap = manifest.content_scripts.find((script) =>
  script.matches.includes(EXPECTED_MATCH),
);
assert(bootstrap !== undefined, "Bootstrap content script is missing");
assert(
  JSON.stringify(bootstrap.matches) === JSON.stringify([EXPECTED_MATCH]),
  "Bootstrap match pattern is broader than expected",
);
assert(
  JSON.stringify([...(bootstrap.exclude_matches ?? [])].sort()) ===
    JSON.stringify([EXPECTED_AUTH_EXCLUDE_MATCH, EXPECTED_REGISTRATION_EMBED_MATCH].sort()),
  "Bootstrap must exclude authentication documents and dedicated registration embeds",
);
assert(bootstrap.run_at === "document_start", "Bootstrap must run at document_start");
assert(bootstrap.all_frames !== true, "Bootstrap must not run in child frames");
assert(
  bootstrap.world === undefined || bootstrap.world === "ISOLATED",
  "Bootstrap must be isolated",
);
assert(Array.isArray(bootstrap.css) && bootstrap.css.length > 0, "Theme CSS is missing");
assert(Array.isArray(bootstrap.js) && bootstrap.js.length === 1, "Bootstrap JS is missing");
const embed = manifest.content_scripts.find((script) =>
  script.matches.includes(EXPECTED_REGISTRATION_EMBED_MATCH),
);
assert(embed !== undefined, "Registration embed script is missing");
assert(
  JSON.stringify(embed.matches) === JSON.stringify([EXPECTED_REGISTRATION_EMBED_MATCH]),
  "Registration embed script must match only the verified registration endpoint",
);
assert(embed.all_frames === true, "Registration embed script must run in matching child frames");
assert(embed.run_at === "document_start", "Registration embed script must run at document_start");
assert(embed.world === undefined || embed.world === "ISOLATED", "Embed script must be isolated");
assert(Array.isArray(embed.css) && embed.css.length > 0, "Registration embed CSS is missing");
assert(Array.isArray(embed.js) && embed.js.length === 1, "Registration embed JS is missing");
assert(manifest.web_accessible_resources === undefined, "No web-accessible resources are expected");

const optionsHtml = fs.readFileSync(path.join(BUILD_DIRECTORY, "options.html"), "utf8");
assert(
  optionsHtml.includes('data-sid-settings-state="loading"') &&
    optionsHtml.includes('aria-busy="true"') &&
    optionsHtml.includes('data-sid-theme-cache-key="sid-settings-theme"') &&
    optionsHtml.includes('src="/options-startup.js"') &&
    optionsHtml.includes('src="/icons/icon-48.png"'),
  "Options page startup gate is missing",
);
assert(files.includes("options-startup.js"), "Options page startup script is missing");

const optionsStartup = fs.readFileSync(path.join(BUILD_DIRECTORY, "options-startup.js"), "utf8");
assert(
  optionsStartup.includes("localStorage.getItem") && optionsStartup.includes("data-sid-theme"),
  "Options page startup script does not restore the cached palette",
);

for (const file of files) {
  assert(!file.endsWith(".map"), `Source map must not be packaged: ${file}`);
  assert(!file.startsWith("src/"), `Source file must not be packaged: ${file}`);
  assert(!file.includes("node_modules"), `Dependency tree must not be packaged: ${file}`);
  assert(!file.startsWith("docs/"), `Documentation must not be packaged: ${file}`);
  assert(!file.startsWith(".env"), `Environment file must not be packaged: ${file}`);
}

const bundledCss = bootstrap.css
  .map((file) => fs.readFileSync(path.join(BUILD_DIRECTORY, file), "utf8"))
  .join("\n");
assert(
  bundledCss.includes("data-sid-enhancement=enabled]"),
  "Theme CSS is not gated by the extension activation attribute",
);
assert(bundledCss.includes("--sid-canvas:#0f1311"), "Full graphite theme is missing");
for (const [themeId, canvas, accent] of [
  ["graphite-blue", "#0c1118", "#75a7ff"],
  ["obsidian-red", "#0d0d0f", "#ff6b7a"],
  ["velvet-mauve", "#11111b", "#cba6f7"],
  ["midnight-amber", "#11100d", "#f2b84b"],
  ["monochrome-dark", "#101010", "#d6d6d6"],
  ["light-mint", "#edf4ef", "#267458"],
  ["light-blue", "#edf1f8", "#315fa3"],
  ["sand", "#f5efdf", "#7d592b"],
  ["light-mauve", "#f6eef5", "#864c86"],
  ["monochrome-light", "#f0f0f0", "#484848"],
]) {
  assert(
    bundledCss.includes(`data-sid-theme=${themeId}]`) &&
      bundledCss.includes(`--sid-accent:${accent}`) &&
      bundledCss.includes(`--sid-canvas:${canvas}`),
    `${themeId} theme is missing`,
  );
}
assert(
  bundledCss.includes("sid-extension-settings-menu-item"),
  "In-page settings menu styling is missing",
);

const bundledJavaScript = files
  .filter((file) => file.endsWith(".js"))
  .map((file) => fs.readFileSync(path.join(BUILD_DIRECTORY, file), "utf8"))
  .join("\n");
const backgroundJavaScript = fs.readFileSync(
  path.join(BUILD_DIRECTORY, manifest.background.service_worker),
  "utf8",
);
assert(
  bundledJavaScript.includes("data-sid-settings-state") &&
    /setAttribute\([^,]+,[`'"]ready[`'"]\)/.test(bundledJavaScript),
  "Options page does not release its startup gate",
);
assert(
  backgroundJavaScript.includes("excludeMatches") &&
    backgroundJavaScript.includes("/auth*") &&
    bundledJavaScript.includes("data-track-url"),
  "Early activation does not preserve the authentication-page exclusion",
);

for (const activationScript of [
  "activation-graphite-mint.js",
  "activation-graphite-blue.js",
  "activation-obsidian-red.js",
  "activation-velvet-mauve.js",
  "activation-midnight-amber.js",
  "activation-monochrome-dark.js",
  "activation-light-mint.js",
  "activation-light-blue.js",
  "activation-sand.js",
  "activation-light-mauve.js",
  "activation-monochrome-light.js",
]) {
  assert(files.includes(activationScript), `Early theme script is missing: ${activationScript}`);
}

console.log(`Validated Manifest V3 production build with ${files.length} packaged files.`);
