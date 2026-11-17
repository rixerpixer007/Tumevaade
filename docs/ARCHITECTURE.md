# Architecture and source ownership

Tumevaade enhances genuine Stuudium through a Chromium Manifest V3 extension
and a native Kotlin Android WebView app. Both consume the same theme and shared
DOM features. See [project direction](PROJECT_DIRECTION.md) for product boundaries.

| Source                              | Responsibility                                                       |
| ----------------------------------- | -------------------------------------------------------------------- |
| `src/theme/modules/*.css`           | Canonical complete theme, in filename order                          |
| `src/theme/modules/01-tokens.css`   | Default semantic palette                                             |
| `src/theme/modules/02-palettes.css` | Complete attribute-gated palette overrides                           |
| `src/generated/critical.css`        | Generated early surface from canonical palette tokens                |
| `src/shared/`                       | Settings/theme contracts, routes, sites, lifecycle; no platform APIs |
| `src/features/`                     | Reusable DOM features with activation and cleanup                    |
| `src/platforms/webextension/`       | Extension storage/runtime adapters                                   |
| `src/entrypoints/`                  | WXT background, early activation, content and options entrypoints    |
| `src/platforms/webview/`            | Narrow origin-checked native-host adapters                           |
| `src/mobile/entrypoints/`           | Mobile shared-web bundles; outside WXT entrypoint discovery          |
| `apps/android/`                     | Kotlin shell, navigation, preferences, origin policy, native tests   |
| `src/shared/sites.ts`               | Verified Stuudium origins; changes need explicit approval            |
| `wxt.config.ts`                     | Extension manifest and build configuration                           |
| `scripts/` and `tests/`             | Build/validation tooling and automated tests                         |

## Generated artifacts

### Adding a theme

Add its metadata to `src/shared/themes.ts` and its complete semantic palette to
`src/theme/modules/02-palettes.css` (the default palette lives in `01-tokens.css`).
Startup colors are generated from those palette tokens; do not maintain a separate
startup palette. The build rejects missing or unknown palettes, mismatched preview
colors, and incomplete light palettes.
The catalog drives settings and mobile configuration. WXT's `entrypoints:found`
hook also generates early activation entrypoints in `.wxt/theme-activation/`
for both development and production. Each calls the shared activation function
in `src/platforms/webextension/early-activation.ts` with its theme ID.

Separate `activation-<id>.js` output bundles let Chrome apply the selected palette
synchronously at `document_start`, with no asynchronous preference read. Their
names remain stable across upgrades. Do not maintain per-theme entrypoint source
files or filename maps. After changing the catalog, restart the development
watcher so WXT discovers the new entrypoint set.

### Output directories

- `src/generated/theme.css`: activation-gated CSS from canonical modules.
- `src/generated/critical.css`: minimal activation-gated startup colors from the same palettes.
- `.output/chrome-mv3-dev/`: watched development extension.
- `.output/chrome-mv3/`: one-time production extension, used for user review.
- `apps/android/app/src/main/assets/mobile/`: generated mobile bundles and
  `asset-manifest.json`.

Never edit generated artifacts directly. Commands and their regeneration
requirements are maintained in [NPM_COMMANDS.md](NPM_COMMANDS.md).

## Browser tooling

`scripts/browser-cli.mjs` forwards standard Playwright CLI commands while
selecting the worktree's session, private profile, and extension artifact.
`scripts/browser-config.mjs` owns those paths and launch options, including
session-cookie restoration. `scripts/browser-smoke.mjs` uses the Playwright API
for repeatable synthetic checks of the production extension. It never uses the
signed-in profile. There is no custom page API or project MCP server.
