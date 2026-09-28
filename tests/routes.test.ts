import { describe, expect, it } from "vitest";

import { detectStuudiumRoute } from "../src/shared/routes";
import {
  isSignedOutStuudiumAuthenticationDocument,
  isSupportedStuudiumUrl,
  STUUDIUM_AUTH_MATCHES,
} from "../src/shared/sites";

describe("supported Stuudium scope", () => {
  it("accepts only the verified HTTPS TORG origin", () => {
    expect(isSupportedStuudiumUrl("https://torg.ope.ee/s/520")).toBe(true);
    expect(isSupportedStuudiumUrl("http://torg.ope.ee/s/520")).toBe(false);
    expect(isSupportedStuudiumUrl("https://another-school.ope.ee/")).toBe(false);
    expect(isSupportedStuudiumUrl("https://view.officeapps.live.com/")).toBe(false);
  });

  it("classifies representative supported routes", () => {
    expect(detectStuudiumRoute("https://torg.ope.ee/s/520").kind).toBe("dashboard");
    expect(detectStuudiumRoute("https://torg.ope.ee/tera/course").kind).toBe("tera");
    expect(detectStuudiumRoute("https://torg.ope.ee/suhtlus/").kind).toBe("suhtlus");
    expect(detectStuudiumRoute("https://torg.ope.ee/subjects/student/1").kind).toBe("subjects");
  });

  it("identifies signed-out authentication documents before and after URL cleanup", () => {
    const authenticatedRoot = { getAttribute: () => null };
    const signedOutRoot = {
      getAttribute: (name: string) => (name === "data-track-url" ? "/auth" : null),
    };

    expect(STUUDIUM_AUTH_MATCHES).toEqual(["https://torg.ope.ee/auth*"]);
    expect(
      isSignedOutStuudiumAuthenticationDocument(
        authenticatedRoot,
        "https://torg.ope.ee/auth/forgot?lang=et",
      ),
    ).toBe(true);
    expect(isSignedOutStuudiumAuthenticationDocument(signedOutRoot, "https://torg.ope.ee/")).toBe(
      true,
    );
    expect(
      isSignedOutStuudiumAuthenticationDocument(authenticatedRoot, "https://torg.ope.ee/s/520"),
    ).toBe(false);
    expect(
      isSignedOutStuudiumAuthenticationDocument(
        signedOutRoot,
        "https://another-school.ope.ee/auth/",
      ),
    ).toBe(true);
  });
});
