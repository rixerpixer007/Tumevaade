# Architecture and source ownership

Tumevaade enhances genuine Stuudium through a Chromium Manifest V3 extension
and a native Kotlin Android WebView app. Both consume the same theme and shared
DOM features. See [project direction](PROJECT_DIRECTION.md) for product boundaries.

| Source                              | Responsibility                                                       |
| ----------------------------------- | -------------------------------------------------------------------- |
| `src/theme/modules/*.css`           | Canonical complete theme, in filename order                          |
| `src/theme/modules/01-tokens.css`   | Default semantic palette                                             |
| `src/theme/modules/02-palettes.css` | Complete attribute-gated palette overrides                           |
| `src/theme/critical.css`            | Minimal early surface, not replacement structural CSS                |
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

- `src/generated/theme.css`: activation-gated CSS from canonical modules.
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
