import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

import {
  browserDirectory,
  getExtensionDirectory,
  launchOptions,
  privateDirectory,
  readBuiltManifest,
} from "./browser-config.mjs";

// Keep the deterministic smoke check independent of a running development server.
const extensionDirectory = getExtensionDirectory("production");
const manifest = await readBuiltManifest(extensionDirectory);
await privateDirectory(browserDirectory);
const profile = await mkdtemp(path.join(browserDirectory, "smoke-profile-"));
const output = await privateDirectory(path.join(browserDirectory, "smoke-results"));
await rm(path.join(output, "report.json"), { force: true });
const errors = [];
let context;

async function launch() {
  const browser = await chromium.launchPersistentContext(profile, {
    ...launchOptions(true, extensionDirectory),
    viewport: { width: 1440, height: 900 },
  });
  browser.setDefaultTimeout(10_000);
  browser.on("weberror", (error) => errors.push(error.error().message));
  browser.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // These are synthetic documents: no requests reach Stuudium or a student account.
  await browser.route("https://torg.ope.ee/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><html><head><title>Fictional extension smoke page</title></head><body><main><h1>Fictional smoke page</h1></main></body></html>",
    }),
  );
  await browser.route("https://example.org/**", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Negative control</title><p>Fictional unrelated site</p>",
    }),
  );
  return browser;
}

async function extensionWorker(browser) {
  return browser.serviceWorkers()[0] ?? browser.waitForEvent("serviceworker", { timeout: 15_000 });
}

async function assertTheme(page, theme) {
  await page.waitForFunction(
    (expected) => document.documentElement.getAttribute("data-sid-theme") === expected,
    theme,
  );
}

try {
  context = await launch();
  const worker = await extensionWorker(context);
  const identity = await worker.evaluate(async () => {
    const manifest = globalThis.chrome.runtime.getManifest();
    const bytes = await (
      await fetch(globalThis.chrome.runtime.getURL(manifest.background.service_worker))
    ).arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", bytes);
    return {
      id: globalThis.chrome.runtime.id,
      version: manifest.version,
      name: manifest.name,
      workerSha256: Array.from(new Uint8Array(digest), (byte) =>
        byte.toString(16).padStart(2, "0"),
      ).join(""),
    };
  });
  assert.equal(identity.name, manifest.name);
  assert.equal(identity.version, manifest.version);
  assert.equal(
    identity.workerSha256,
    createHash("sha256")
      .update(await readFile(path.join(extensionDirectory, manifest.background.service_worker)))
      .digest("hex"),
    "The running extension must match this worktree's exact build",
  );

  const page = context.pages()[0] ?? (await context.newPage());
  await page.goto(`chrome-extension://${identity.id}/${manifest.options_ui.page}`);
  await page.locator('label.theme-option:has(input[value="graphite-blue"])').click();
  await assertTheme(page, "graphite-blue");
  await page.screenshot({ path: path.join(output, "settings-desktop.png"), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, "settings-mobile.png"), fullPage: true });

  await page.goto("https://torg.ope.ee/");
  await page.waitForFunction(() => document.documentElement.dataset.sidEnhancement === "enabled");
  await assertTheme(page, "graphite-blue");
  assert.notEqual(
    await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--sid-accent-strong").trim(),
    ),
    "",
  );
  // Fictional status samples exercise the monochrome palettes without school-data changes.
  const appearance = await context.newPage();
  await appearance.goto(`chrome-extension://${identity.id}/${manifest.options_ui.page}`);
  for (const [themeId, danger] of [
    ["monochrome-dark", "rgb(255, 150, 150)"],
    ["monochrome-light", "rgb(179, 55, 64)"],
  ]) {
    await appearance.locator(`label.theme-option:has(input[value="${themeId}"])`).click();
    await assertTheme(page, themeId);
    await page.reload();
    await assertTheme(page, themeId);
    await page.evaluate(() => {
      document.body.innerHTML = `<main class="page_grades_student">
      <span class="grade_MA">MA</span><span class="grade_2">2</span>
      <span class="grade_param_is_notify"><abbr>!</abbr></span>
      <span class="grade_param_is_no_homework"><abbr>T</abbr></span>
      <span class="grade_AR">AR</span><span class="grade_5">5</span>
      <span class="grade_param_is_late">H</span><p class="message-warning">Notice</p>
    </main><div class="popover absences_popover"><a class="icon close" href="#" aria-label="Close"></a></div>`;
    });
    const colors = await page.evaluate(() => {
      const selectors = [
        ".grade_MA",
        ".grade_2",
        ".grade_param_is_notify abbr",
        ".grade_param_is_no_homework",
        ".grade_param_is_no_homework abbr",
        ".grade_AR",
        ".grade_5",
        ".grade_param_is_late",
        ".message-warning",
      ];
      return selectors.map((selector) => getComputedStyle(document.querySelector(selector)).color);
    });
    const closePaint = await page.locator(".absences_popover .icon.close").evaluate((element) => {
      const style = getComputedStyle(element);
      return { image: style.backgroundImage, filter: style.filter };
    });
    assert.ok(closePaint.image.includes("data:image/svg+xml"));
    assert.equal(closePaint.filter, "none");
    assert.deepEqual(colors.slice(0, 3), Array(3).fill(danger));
    for (const color of colors.slice(3)) {
      const channels = color.match(/\d+/g);
      assert.equal(channels[0], channels[1], `Expected neutral status: ${color}`);
      assert.equal(channels[1], channels[2], `Expected neutral status: ${color}`);
    }
  }
  await appearance.locator('label.theme-option:has(input[value="graphite-blue"])').click();
  await assertTheme(page, "graphite-blue");
  await appearance.close();
  await page.goto("https://torg.ope.ee/auth");
  assert.equal(await page.getAttribute("html", "data-sid-enhancement"), null);
  await page.goto("https://example.org/");
  assert.equal(await page.getAttribute("html", "data-sid-enhancement"), null);
  await context.addCookies([
    {
      name: "fictional-session",
      value: "session-persistence-only",
      url: "https://example.org/",
    },
    {
      name: "fictional-smoke",
      value: "persistence-only",
      url: "https://example.org/",
      expires: Math.floor(Date.now() / 1000) + 3600,
    },
  ]);
  await context.close();
  context = undefined;

  context = await launch();
  const restartedWorker = await extensionWorker(context);
  const settings = await restartedWorker.evaluate(
    async () => (await globalThis.chrome.storage.local.get("preferences")).preferences,
  );
  assert.equal(settings.theme.themeId, "graphite-blue");
  assert.equal(
    (await context.cookies("https://example.org/")).find(
      (cookie) => cookie.name === "fictional-smoke",
    )?.value,
    "persistence-only",
  );
  assert.equal(
    (await context.cookies("https://example.org/")).find(
      (cookie) => cookie.name === "fictional-session",
    )?.value,
    "session-persistence-only",
    "Session-only cookies must survive restarting the testing browser",
  );
  const restartedPage = context.pages()[0] ?? (await context.newPage());
  await restartedPage.goto("https://torg.ope.ee/");
  await assertTheme(restartedPage, "graphite-blue");
  assert.deepEqual(errors, [], "Browser and extension consoles must be free of errors");
  const report = {
    result: "PASS",
    headless: true,
    extension: identity,
    checks: [
      "exact local build",
      "settings interaction",
      "desktop and mobile screenshots",
      "synthetic content injection",
      "auth exclusion",
      "unrelated-origin exclusion",
      "extension preference persistence",
      "fictional cookie persistence",
      "fictional session-only cookie persistence",
      "error consoles",
    ],
    liveStuudium: "NOT TESTED by this synthetic check; use npm run browser for live verification",
  };
  await writeFile(path.join(output, "report.json"), JSON.stringify(report, null, 2) + "\n");
  console.log(JSON.stringify(report, null, 2));
  console.log(`Screenshots and report: ${output}`);
} finally {
  try {
    await context?.close();
  } finally {
    await rm(profile, { recursive: true, force: true });
  }
}
