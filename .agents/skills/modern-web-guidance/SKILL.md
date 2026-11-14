---
name: modern-web-guidance
description: Consult current web guidance before introducing unfamiliar frontend APIs, UI architecture, accessibility patterns, performance techniques or compatibility-sensitive CSS/JavaScript. Skip routine maintenance within established local component patterns.
---

# Modern web guidance

Use this lookup when current platform support or guidance could change the
implementation. For an existing component's ordinary values/selectors/geometry,
inspect the live page and project source instead of doing a broad research pass.

Search for the specific use case, then retrieve only relevant results:

```sh
npx -y modern-web-guidance@latest search "<use case>" --skill-version 2026_08_31-6ba3cecd
npx -y modern-web-guidance@latest retrieve "<guide-id>"
```

If results are weak, use the package's `list` command. Follow any staleness
warning rather than treating the recorded skill version as a permanent target.
Read the full relevant output; redirect to a file if truncated. Use `npx.cmd`
on Windows. Network access may require running outside the sandbox; do not
allowlist unrestricted package execution for convenience.

Adapt guidance to the project's actual supported browser/WebView versions.
Baseline Widely Available is the normal safe default; for newer features,
check support and provide the recommended detection/fallback unless the user
has specified another compatibility policy. Do not add polyfills, dependencies
or unrelated features just because a guide mentions them. Use Context7 for
library-specific API details and first-party sources for platform requirements.
