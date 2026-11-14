# Project direction

This document records lasting product decisions. It is not a release-status
ledger or a sequence of permission gates for ordinary maintenance.

## Product

Tumevaade enhances the genuine TORG Stuudium interface while retaining its
structure and behavior. Desktop Chromium and Android are implemented in this
repository. The README links the distribution channels; source configuration,
release metadata, and verification of the exact artifact take precedence over
old milestone descriptions. Do not infer physical-device or published-release
verification from a local build.

Firefox, Safari, and iOS are future targets, not compatibility claims. Keep the
shared core portable without implementing a new target unless requested.
Public iOS distribution needs sustainable Apple signing; private development
signing does not establish a supported public release.

## Shared core, small platform shells

- Use TypeScript features, semantic CSS tokens, settings, route recognition,
  and explicit lifecycle boundaries across platforms.
- Desktop delivery is a WXT Manifest V3 extension. Android uses a native Kotlin
  WebView shell rather than a separate client or cross-platform framework.
- Platform adapters own storage, injection, navigation, and native integration;
  shared features must not import platform APIs.
- Theme selection is manual and remembered. Each dark or light palette owns a
  complete semantic color set; layouts and interaction behavior are shared.
  The current catalog is `src/shared/themes.ts`, not a copied list in guidance.

See [architecture](ARCHITECTURE.md) for source ownership.

## Genuine Stuudium and privacy

Stuudium handles authentication and school data on its own verified HTTPS
origin. Tumevaade is not an authentication proxy, replacement backend/client,
private-API clone, or remotely hosted executable-code layer.

- Keep host access limited to the explicitly verified registry in
  `src/shared/sites.ts`. Do not pre-authorize other schools.
- Store local preferences, not grades, attendance, messages, or credentials.
  Do not add analytics or telemetry by default.
- Leave signed-out authentication documents under Stuudium's control; exclude
  theme/runtime injection there. Cross-origin frames are separate boundaries.
- Keep native bridges narrowly scoped and origin-checked. Do not expose general
  native commands to remote pages; open unrelated mobile destinations externally.

## Rendering

Keep Stuudium's structural CSS. The theme overrides presentation and depends on
native layout/responsiveness; blocking the native styles would create a fragile
frontend fork. A separately hosted PWA cannot replace same-origin injection.

Use the small critical surface and early theme selection to avoid a white
startup flash. Android also coordinates native window/WebView startup colors.
A full replacement stylesheet or UI redesign requires an explicit task and
representative verification, not a broad cleanup disguised as maintenance.

## Releases and compatibility

Chrome Web Store is the desktop distribution channel; Edge Add-ons is optional
and needs its own approval and verification. Android signing, GitLab release
metadata, and update notification code exist. Treat signing keys as external
secrets, preserve application ID/signing continuity, and verify updates on the
exact installed artifact. Do not turn old prototype-phase notes into a ban on
maintaining already implemented release/update code.

Android's configured minimum is not proof that every supported API level has
been tested. Keep device/runtime evidence explicit. The same applies to startup
flash, navigation, file handling, passkeys, and updater behavior.

Building, packaging, publishing, and installing are separate actions. Normal
work ends with a local production review folder; commits, pushes, store/release
submissions, and school-data changes require the user's authorization.
