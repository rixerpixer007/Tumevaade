---
name: verify-stuudium-extension-ui
description: Operate the dedicated headless Playwright browser and live-verify Tumevaade extension UI on genuine Stuudium or extension settings pages. Default for rendered extension work, including CSS, DOM interactions, screenshots, hot reload, and lifecycle checks; skip for changes with no browser-visible behavior.
---

# Default Stuudium browser workflow

Use `npm run browser -- <command>` from the assigned checkout. This wrapper
forwards standard Playwright CLI commands and chooses the private worktree
session/profile and unpacked build. It does not start a dev server. No MCP or
desktop mouse/keyboard control is needed. Follow an explicit user request to use
another environment instead.

## Start and authenticate

1. Inspect relevant source and any existing task-owned watcher/session. Reuse
   installed dependencies/browser; setup is in the [browser guide](../../../docs/BACKGROUND_BROWSER_TESTING.md).
2. Start `npm run dev` in a retained terminal session. Wait for WXT's completed
   `.output/chrome-mv3-dev/` build on localhost:3000. Do not kill another task's
   server to claim the port; report the conflict or coordinate with the user.
3. Run `npm run browser -- open https://torg.ope.ee/`. Confirm a genuine signed-in
   document and `data-sid-enhancement="enabled"` before testing themed UI.
   The sign-in page can also have pathname `/`; check `data-track-url="/auth"`
   and password-field presence rather than trusting the URL/title alone.
4. If signed out, use the guide's visible `login` flow and let the user sign in
   on genuine Stuudium. Confirm sign-in before closing; reopen headlessly and
   recheck it. Keep the existing private profile; never copy/export credentials.

## Operate the browser

```sh
npm run browser -- --help
npm run browser -- snapshot '.st-nav-block-main'
npm run browser -- click e12
npm run browser -- eval '() => document.documentElement.getAttribute("data-sid-theme")'
npm run browser -- resize 390 844
npm run browser -- console error
npm run browser -- run-code --filename=.local/browser/check.js
```

`e12` is an example: use a current snapshot reference or a stable selector.
After navigation/hot reload, reacquire locators/worker handles if invalidated.
For details inspect the pinned CLI's help; use current Context7 docs for new
library-specific behavior. Do not invent another project browser API.

A `run-code` file is a function expression, for example:

```js
async page => {
  await page.waitForFunction(() =>
    document.documentElement.getAttribute('data-sid-enhancement') === 'enabled'
  );
  const nav = page.locator('.st-nav-block-main');
  await nav.screenshot({ path: '.local/browser/navigation.png' });
  return { controls: await nav.locator(':scope > .st-nav-item').count() };
}
```

Use locator/condition waits, not arbitrary sleeps. Check command exit status
and returned errors before claiming success. Avoid DOM `outerHTML`, all-attribute
or full-page dumps: signed attributes/URLs can contain authentication material.
Read targeted structure, computed styles and rectangles; crop screenshots to
the component. Do not log cookies, headers, credentials, grades or messages.

## Inspect, edit, prove

- Before editing, inspect the real component DOM, native peers, matched CSS
  competition and computed winners. Use the theme skill for CSS decisions.
- Edit canonical source only. Wait for watcher completion, then verify the
  changed value/selector/DOM marker in the actual page. WXT can update CSS or
  reload scripts automatically; a successful source build alone is insufficient.
- If stale, refresh once, then close/reopen this session with the watcher still
  running. Verify the exact artifact before further debugging. Development and
  production have different IDs/preferences, even though they share login cookies.
- Exercise the relevant default, selected, hover, focus-visible, pressed,
  expanded/collapsed and cleanup states; use a negative control and a relevant
  narrow width. Check item/icon/label rectangles and DOM order for menu work.
- Test reload and relevant preference/navigation lifecycle behavior; check owned
  nodes are not duplicated. Use the settings UI to disable/re-enable when relevant.
- Check page and extension-worker console errors. Distinguish native site errors
  from new extension failures. Report tool restrictions on protected browser
  surfaces; do not bypass them through another control path.
- Do not change attendance, TODOs, messages, reactions, grades or registrations
  to create test states. Use fictional fixtures where safe live interaction is
  unavailable. Narrow width/touch emulation is not physical Android verification.

## Finish

Run the applicable [verification tier](../../../docs/VERIFICATION.md).
`npm run test:browser` is a synthetic **production** check, not a signed-in live
test. Use it when the harness or extension behavior warrants it.

Close only this worktree's session with `npm run browser -- close`, stop the
watcher you started, and confirm its port is free. Do not use global `close-all`
or `kill-all`. Build with `npm run build`, run `npm run validate:build`, and link
the absolute `.output/chrome-mv3/` folder in the final UI handoff. No ZIP or
snapshot command is needed. Report routes, viewport/states, freshness proof,
console results, and anything unverified; source inspection is not live QA.
