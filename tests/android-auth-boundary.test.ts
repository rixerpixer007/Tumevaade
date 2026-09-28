import fs from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

describe("Android authentication boundary", () => {
  const projectRoot = path.resolve(import.meta.dirname, "..");
  const runtimeSource = fs.readFileSync(
    path.join(
      projectRoot,
      "apps/android/app/src/main/java/io/github/rixerpixer007/stuudium/WebViewRuntime.kt",
    ),
    "utf8",
  );

  it("returns before installing Tumevaade assets on signed-out authentication documents", () => {
    const exclusionIndex = runtimeSource.indexOf("if (isSignedOutAuthenticationDocument)");
    const activationIndex = runtimeSource.indexOf(
      'root.setAttribute("data-sid-enhancement", "enabled")',
    );
    const styleInjectionIndex = runtimeSource.indexOf(
      'installStyle("sid-mobile-platform", $platformCss)',
    );

    expect(runtimeSource).toContain('root.getAttribute("data-track-url") === "/auth"');
    expect(runtimeSource).toContain('window.location.pathname.startsWith("/auth")');
    expect(exclusionIndex).toBeGreaterThanOrEqual(0);
    expect(exclusionIndex).toBeLessThan(activationIndex);
    expect(exclusionIndex).toBeLessThan(styleInjectionIndex);
    expect(runtimeSource).not.toContain("data-sid-hide-passkey-login-controls");
  });
});
