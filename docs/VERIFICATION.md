# Verification and handoff

Use the smallest tier that proves the change. Command behavior is defined in
[NPM_COMMANDS.md](NPM_COMMANDS.md), not repeated in agent instructions.

| Change                                   | Checks                                                                                                     |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Documentation or skills                  | Formatting where applicable; check local links; validate changed skill frontmatter                         |
| Canonical theme CSS                      | Regenerate unless the watcher does it; `npm run check:theme`; relevant tests and live UI checks            |
| TypeScript / extension behavior          | Relevant tests, `npm run typecheck`, `npm run lint`                                                        |
| Manifest / entrypoints / build structure | Relevant checks plus `npm run build` and `npm run validate:build`                                          |
| Browser harness                          | Relevant CLI behavior and `npm run test:browser` against a fresh production build                          |
| Broad shared / extension work            | `npm run validate`                                                                                         |
| Shared Android web assets                | Regenerate if changed, `npm run check:mobile:web`, `npm run validate:mobile:web`, normal TypeScript checks |
| Android Kotlin / resources / Gradle      | `npm run validate:android`, APK contents/permissions, exact APK on a device or emulator                    |
| ZIP packaging                            | `npm run package` and archive inspection, only when packaging is requested                                 |

Inspect the complete diff and run `git diff --check` before handoff. Existing
unrelated changes are not permission to overwrite them. Passing automated
checks does not establish live visual or device behavior.

## Browser evidence

The [default browser skill](../.agents/skills/verify-stuudium-extension-ui/SKILL.md)
contains the operating and live-verification procedure. Verify the current
artifact, affected route/state, an unaffected control, relevant responsive
width, and page/extension consoles. Test relevant lifecycle states: initial
load, reload, preference updates, disable/re-enable and cleanup, navigation.
Use synthetic fixtures for states that would otherwise change school data.

If a tool rejects a protected browser surface, report that narrow check as
blocked and ask the user to perform it. Do not bypass the tool's restriction
with another control path. Distinguish site errors from new extension errors;
do not blanket-ignore the console.

## Android evidence

Use the exact debug APK and its bundled `asset-manifest.json`. Verify login and
session persistence without recording credentials, navigation/external links,
settings persistence, startup, back behavior, file boundaries, orientation,
a cross-origin negative control, Logcat and both WebView consoles. Use a
dedicated device/emulator; record its model, Android API and WebView version.
The Samsung S25/Android 16 is the established primary physical target.
Android 8 compatibility needs an API 26 device/emulator with a maintained
WebView; desktop or newer-device checks cannot establish that result.

## User review

After extension UI work, build and validate production and link the absolute
`.output/chrome-mv3/` folder. No extra packaging or snapshot command is needed.
Give brief Load unpacked instructions; see the
[browser guide](BACKGROUND_BROWSER_TESTING.md#user-review).

Report the change and why it was made, automated results, live route/browser/
viewport/states checked, and anything blocked or unverified. State startup-flash
results only when measured. Note permission/security changes, if any. Close
the testing session and stop task-owned watchers before returning control.
