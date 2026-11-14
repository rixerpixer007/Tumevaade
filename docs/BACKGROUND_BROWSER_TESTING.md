# Background browser testing

This is the default extension UI workflow for agents. A dedicated headless
Chromium process loads the actual unpacked extension while the user keeps
using their desktop. It uses the locally pinned Playwright CLI through
`npm run browser -- <command>`; no global CLI, MCP connection, personal browser
bridge, or T3 built-in browser extension support is needed.

Agent operation, command examples and troubleshooting live in the
[browser skill](../.agents/skills/verify-stuudium-extension-ui/SKILL.md).
The [command reference](NPM_COMMANDS.md#background-browser-commands) defines the
project scripts. This guide covers human setup and review.

## First setup in a checkout

```sh
npm ci
npx --no-install playwright install --no-shell chromium
npm run dev
```

Keep the watcher running. In a second terminal in the same checkout:

```sh
npm run browser -- open https://torg.ope.ee/
```

The wrapper loads `.output/chrome-mv3-dev/`, requires Vite on localhost:3000,
prints the chosen path, and isolates its session/profile by worktree. Reuse the
existing profile; do not reinstall or log in for every task. A new worktree has
its own profile and may need an initial sign-in.

## Login when needed

Close the testing session before switching to its visible login mode:

```sh
npm run browser -- close
npm run browser -- login
```

Sign in yourself on genuine Stuudium. The agent must not inspect login fields,
capture credentials, export authentication state, or copy another browser's
profile. Once signed in, the agent confirms the authenticated page, closes the
visible session, and reopens the same profile headlessly:

```sh
npm run browser -- close
npm run browser -- open https://torg.ope.ee/
```

The wrapper uses Chromium session restoration so session-only cookies survive
restarts. It can restore previous tabs as well. Only one browser process may
use the profile at a time. Server-side expiry can still require another login.

## User review

Agents iterate and live-test with `npm run dev`, then run:

```sh
npm run build
npm run validate:build
```

The final message links this checkout's absolute `.output/chrome-mv3/` folder.
The user opens `brave://extensions` (or `chrome://extensions`), disables other
Tumevaade instances, enables Developer mode, and chooses **Load unpacked**.
Select `chrome-mv3`, not its parent `.output`. On macOS, **Command+Shift+G** in
the folder picker accepts the full path. Open a fresh Stuudium tab afterward.
No development server is needed for this production build.

To stop reviewing, disable/remove this instance and re-enable the usual one.
A later `npm run build` replaces this folder; reload the extension card and
open a fresh page for that newer version. No copied snapshots or ZIPs are
needed for local review.

## Private files and evidence

Profile, generated config, logs, screenshots and smoke results live under
`.local/browser/`; CLI metadata can also use `.playwright-cli/`. Both are
ignored by Git, linting and formatting. Keep them private. The extension stores
preferences only; the testing browser itself necessarily holds the login and
can access real school data. It is not a read-only account sandbox.

The production-only `npm run test:browser` uses a separate temporary profile
and fictional intercepted pages. It checks extension identity, settings and
content injection, auth/origin exclusions, and preference/session-cookie
persistence. It does not verify the signed-in site or replace live checks.

The visible-login → headless-restart flow and CSS hot reload were verified in
this worktree. New sessions still need artifact and authentication checks.
Physical Android, startup-flash timing and untested routes are separate claims.

Official references: [Playwright CLI](https://github.com/microsoft/playwright-cli),
[extension loading](https://playwright.dev/docs/chrome-extensions).
