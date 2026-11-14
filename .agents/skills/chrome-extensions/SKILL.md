---
name: chrome-extensions
description: Maintain this Manifest V3 extension's manifest, permissions, browser APIs, service worker, messaging, storage, lifecycle and build artifacts, or prepare requested store work. Skip pure styling changes inside an established component.
---

# Chromium extension maintenance

Inspect the relevant source, tests and emitted manifest/bundles. Ownership is
in [ARCHITECTURE.md](../../../docs/ARCHITECTURE.md); product/security decisions
are in [PROJECT_DIRECTION.md](../../../docs/PROJECT_DIRECTION.md). Use current
Context7 docs for library APIs and first-party Chrome docs for changing
browser/store rules.

- Keep permissions and verified host access minimal. Bundle executable code;
  do not add remote code or page-to-native/extension capability bridges for convenience.
- Store preferences only. Keep platform APIs behind adapters and bootstrap/
  feature mounting idempotent with explicit cleanup.
- Service workers are ephemeral: persist required preferences rather than
  relying on global variables. Test relevant install/reload, disable/re-enable,
  client navigation and preference-change behavior.
- Validate emitted files, activation scripts, resources and exclusions rather
  than assuming source configuration equals the artifact.

Use the [default browser skill](../verify-stuudium-extension-ui/SKILL.md) for
rendered work, including extension settings. It owns development artifact
identity, browser operation and production review handoff. Select automated
checks from [VERIFICATION.md](../../../docs/VERIFICATION.md).

Enter store work only when requested. Read
[EXTENSION_PUBLISHING.md](../../../docs/EXTENSION_PUBLISHING.md), recheck current
store requirements, and inspect the package. Building or preparing a listing
is not permission to submit/publish. Keep credentials and signing keys outside
the repository and generated artifacts.
