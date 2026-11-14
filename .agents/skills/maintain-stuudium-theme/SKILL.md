---
name: maintain-stuudium-theme
description: Maintain Tumevaade CSS and DOM-dependent appearance, including cascade debugging, responsive styling and visual regressions. Use for theme/presentation changes; skip platform logic or documentation with no rendered effect.
---

# Theme maintenance

Preserve the established design unless the user requests a redesign. Edit the
owning `src/theme/modules/*.css` file, not generated CSS or mobile assets.

Use the [default browser workflow](../verify-stuudium-extension-ui/SKILL.md)
for live inspection and verification. Before editing, establish the element's
real semantic role, DOM contract, native peers, matched competition and computed
winner. A screenshot does not establish selector ownership.

## Cascade and component ownership

The generator gates selectors with zero-specificity
`:where(html[data-sid-enhancement="enabled"])`. Native Stuudium CSS loaded later
can win an equal-specificity/equal-importance tie. Fix the narrow component owner
using stable classes, attributes or route anchors; preserve intentional
`:where(...)` and existing `!important` declarations unless live evidence supports
a change. Do not fix one component through global specificity, layer or reset
rewrites.

Reuse matching `--sid-*` tokens. Keep rules together as base, variants,
interactions and responsive differences. Keep geometry local; only share a rule
when both DOM contracts represent the same component. Audit analogous rules
for the same cause, without silently fixing unrelated defects.

## Verification

Compare before/after at the same route and viewport. Verify the new source
reached the running extension, inspect computed winners, test relevant states,
one unaffected control and the responsive breakpoint. Include preference
cleanup and owned-node duplication checks when relevant. Follow
[VERIFICATION.md](../../../docs/VERIFICATION.md) for automated checks, generated
mobile assets and handoff. Do not claim visual equivalence from static files.

Do not modify school data to demonstrate styling. If a required state cannot be
safely reached, use a fictional fixture or report it as unverified. Keep version
bumps, broader redesigns and release actions outside ordinary CSS fixes unless
requested.
