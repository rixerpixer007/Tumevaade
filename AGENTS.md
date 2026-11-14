# Tumevaade agent guide

## Start

- Inspect `git status --short --branch --untracked-files=all`; preserve work that
  predates the task. Stay in the assigned worktree.
- Read the source relevant to the task. Use [project direction](docs/PROJECT_DIRECTION.md)
  for product/platform decisions and [architecture](docs/ARCHITECTURE.md) for ownership.
- Do not commit, push, publish, change live school data, or expand the supported
  origins unless the user authorizes that action.

## Default browser workflow

For extension UI work, use the dedicated **headless Playwright browser** through
`npm run browser -- <command>`. Do not take over the user's desktop or personal
Brave session. This is a thin wrapper around the standard Playwright CLI, not a
separate browser API or MCP server.

**Read [.agents/skills/verify-stuudium-extension-ui/SKILL.md](.agents/skills/verify-stuudium-extension-ui/SKILL.md)**
when operating the browser or verifying rendered extension behavior. It contains
commands, waits, authentication recovery, hot-reload checks, and shutdown steps.

- Iterate with `npm run dev` and `.output/chrome-mv3-dev/`.
- Reuse this worktree's private testing profile; sign-in is needed only if absent
  or expired. Never copy credentials or profiles between browsers/worktrees.
- Inspect the real DOM and winning styles before a visual fix. Prove the current
  build reached the page before judging it; screenshots alone do not prove freshness.
- Finish UI work with `npm run build` and `npm run validate:build`, then link the
  absolute `.output/chrome-mv3/` folder for the user's **Load unpacked** review.
- Close the testing session and stop a watcher you started when finished.

Setup and human review instructions: [browser guide](docs/BACKGROUND_BROWSER_TESTING.md).
If the user explicitly requests another browser/workflow, follow that request.

## Source and safety boundaries

- Edit theme CSS in `src/theme/modules/`. Never hand-edit `src/generated/`,
  `.output/`, or Android's generated `assets/mobile/` directory.
- Preserve the existing design unless a redesign is requested. Keep shared
  features platform-neutral; browser/native APIs belong in platform adapters.
- Stuudium owns authentication and school data. The extension stores preferences
  only; no analytics, credential handling, remote executable code, or unrestricted
  native bridge. Keep permissions and verified origins narrow.
- Browser profiles, logs, and screenshots are private test artifacts. Do not
  print authentication-bearing attributes, cookies, or request headers; avoid
  full-page DOM dumps and crop screenshots to the component under test.

## Task-specific guidance

Read only the skills relevant to the task:

- Theme CSS/cascade: [maintain-stuudium-theme](.agents/skills/maintain-stuudium-theme/SKILL.md).
- Manifest, browser APIs, lifecycle, store work: [chrome-extensions](.agents/skills/chrome-extensions/SKILL.md).
- New frontend techniques or compatibility decisions: [modern-web-guidance](.agents/skills/modern-web-guidance/SKILL.md).
- Use the global Context7 instructions for current library/API/CLI documentation.

Choose checks from [verification](docs/VERIFICATION.md); command definitions live
in [NPM_COMMANDS.md](docs/NPM_COMMANDS.md). Report what changed, checks and live
states tested, and any remaining limitations. Do not claim browser/device
verification from source inspection or builds alone.
