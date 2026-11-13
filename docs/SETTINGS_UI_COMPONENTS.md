# Settings UI components

The extension and Android settings page share
[`src/entrypoints/options/style.css`](../src/entrypoints/options/style.css) and the
existing `--sid-*` tokens. Reuse these components when adding settings rather than
creating a new visual treatment. Generated extension and Android assets must be
rebuilt from these sources.

## Checkbox

The original appearance checkbox is preserved as `.setting-checkbox` and
`.setting-checkbox__box` in the shared stylesheet. It is intentionally not mounted
on the current settings page. Its native checkbox input supplies checked state,
keyboard behavior, and accessibility; the adjacent span draws the custom box.

Copy this markup for a future boolean preference, replacing the IDs, label, and
helper text with that setting's content:

```html
<div class="setting-row" data-setting-item>
  <div class="setting-copy">
    <label for="example-preference">Näidisseade</label>
    <p id="example-preference-description">Seade lühidalt selgitatuna.</p>
  </div>
  <label class="setting-checkbox" for="example-preference">
    <input
      id="example-preference"
      name="example-preference"
      type="checkbox"
      aria-describedby="example-preference-description"
    />
    <span class="setting-checkbox__box" aria-hidden="true"></span>
  </label>
</div>
```

Keep the input immediately before the decorative span, and keep the label's `for`
and description's ID aligned with the input attributes. Do not hide the input with
`display: none`, replace it with a clickable span, or add a duplicate ARIA role.
Use unique IDs when rendering more than one checkbox.

The preserved design includes a 48px label target, a 22px visual box, token-based
unchecked and checked colors, a check mark, hover, pressed and keyboard-focus
states, and dimming with a wait cursor while disabled. Startup and reduced-motion
rules suppress the component's transitions where appropriate.

For a real feature, initialize `input.checked` from its preference and persist its
`change` event through the existing settings store and platform adapters. Disable
the control during a pending save and restore the previous value if saving fails.
The snippet itself does not create a preference or bind to the appearance action.

## Local design preview

The localhost settings preview additionally renders illustrative light and
Minecraft cards from `src/entrypoints/options/preview-themes.ts`. They are visual
placeholders, have no preference values or selection behavior, and are excluded
from production extension and Android web assets. Their presence in a preview
must not be treated as support for those themes.
