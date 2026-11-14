# Chrome Web Store'i kirje — Tumevaade

> Listing copy and review notes, not a live dashboard or submission-status ledger.
> Reconcile assets, owner fields and policies with the current dashboard before updates.

This file is the copy-and-review source for the Chrome Web Store dashboard. The complete release procedure, account requirements, and rollback guidance are in
[`EXTENSION_PUBLISHING.md`](EXTENSION_PUBLISHING.md).

## Store listing

**Extension name**

Tumevaade

**Short description**

Tumevaade on TORG Stuudiumi mitteametlik brauserilaiendus, mis lisab kohandatava kujunduse

**Detailed description**

Tumevaade on TORGi õpilase loodud mitteametlik brauserilaiendus, mis kohandab päris TORG Stuudiumi välimust ja kasutuskogemust. Vali endale sobiv tume või hele kujundus ning kasuta praktilisi täiustusi otse oma brauseris.

OMADUSED
• Läbimõeldud tume kujundus toetatud TORG Stuudiumi lehtedel.
• Valik tumedate ja heledate kujunduste vahel.
• Teema seaded otse Stuudiumi peamenüüs.
• Meelde jääv valik ja võimalus kogu täiendus välja lülitada.

KASUTAMINE

1. Paigalda laiendus ja ava TORG Stuudium.
2. Kasuta Stuudiumit tavapäraselt; tume kujundus on vaikimisi sisse lülitatud.
3. Kujunduse valimiseks või täiustuse väljalülitamiseks ava laiendus brauseri tööriistaribalt või vali Stuudiumi peamenüüst „Teema seaded”.

PRIVAATSUS
Sinu kooliandmeid ei koguta ega saadeta arendajale. Tumevaade salvestab ainult vajalikud seaded sinu seadmesse. Sisselogimist ja kooliandmeid töötleb päris Stuudium.

ÕIGUSED
• Juurdepääs aadressile torg.ope.ee võimaldab rakendada kujundust ja seadete otseteed ainult toetatud kooli veebilehel.
• Kohalik salvestusruum hoiab sisse- ja väljalülitamise ning valitud kujunduse eelistusi selles seadmes.
• Skripti registreerimine võimaldab salvestatud valiku rakendada toetatud lehe laadimise alguses.

TUGI
https://gitlab.com/rixerpixer007/tumevaade/-/boards#/

**Category**

Productivity — provisional; the owner must confirm the categories currently offered by the dashboard before submission.

**Single purpose**

Kohandada päris TORG Stuudiumi kohalikku välimust ja kasutuskogemust.

**Primary language**

Estonian.

## Graphics and assets

| Asset                  | Required dimensions  | Status   | Planned content                                  |
| ---------------------- | -------------------- | -------- | ------------------------------------------------ |
| Store icon             | 128×128 PNG          | Created  | Approved Tumevaade mark; no Stuudium logo used   |
| Screenshot 1           | 1280×800 or 640×400  | Recheck  | Themed settings page with no student information |
| Screenshot 2           | 1280×800 or 640×400  | Recheck  | Sanitized or demonstration TORG dashboard        |
| Screenshot 3           | 1280×800 or 640×400  | Optional | Sanitized responsive view                        |
| Small promotional tile | 440×280 PNG or JPEG  | Recheck  | Tumevaade name, tagline, graphite, and mint      |
| Marquee image          | 1400×560 PNG or JPEG | Optional | Approved project branding                        |

The extension package contains separate 16×16, 32×32, 48×48, and 128×128 PNG icons generated from the approved dark logo. Every screenshot must avoid names, grades, attendance, messages, schedules, class membership, authentication details, and other student data.

## Permissions justification

| Manifest item           | Type            | Store-facing justification                                                                                                  |
| ----------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `storage`               | Permission      | Saves only the user’s local enabled/disabled and selected-theme preferences so they persist between browser sessions.       |
| `scripting`             | Permission      | Registers or removes the early activation marker so the saved preference is honored from the start of supported page loads. |
| `https://torg.ope.ee/*` | Host permission | Applies the dark appearance and local settings shortcut only to the verified TORG Stuudium website.                         |

No tabs, browsing-history, cookies, downloads, geolocation, identity, or broad all-sites permission is requested.

## Privacy and data use

**Does the extension collect user data?** No.

The extension stores one functional preference object locally on the device:

```json
{
  "preferences": {
    "enhancementEnabled": true,
    "theme": {
      "mode": "manual",
      "themeId": "graphite-mint"
    }
  }
}
```

This preference is not transmitted off-device or shared. The extension does not include analytics, telemetry, advertising, remote executable code, or a developer-operated server.

- [x] Data is not sold to third parties.
- [x] Data is not used for purposes unrelated to the extension’s single purpose.
- [x] Data is not used for creditworthiness or lending purposes.

The code recognizes supported routes and the navigation location used for its settings shortcut, but it does not copy, persist, log, or transmit Stuudium page contents.

## Privacy policy

**Public privacy-policy URL:** `https://gitlab.com/rixerpixer007/tumevaade/-/blob/main/docs/PRIVACY.md`

The published policy must match the source and dashboard answers. It must state what the local preference is, that no school or authentication data is collected or transmitted, how uninstalling removes extension-local storage, and how to contact the maintainer. Verify that the final URL is public and not behind a login before submission.

### Public URL verification

Use the GitLab support and privacy-policy URLs above. Recheck that they are
public and match the publisher dashboard before a submission; editing this
file does not change the listing.

## Distribution

- Initial store: Chrome Web Store.
- Browser family: Chrome and other compatible Chromium-based browsers.
- Independently tested before release: Google Chrome and Brave.
- Visibility: [OWNER REQUIRED — choose public, unlisted, or a tester-only release deliberately.]
- Regions: [OWNER REQUIRED.]
- Optional later channel: Microsoft Edge Add-ons, only after Edge-specific live testing.

## Developer information

- Publisher name: Tumevaade — confirm against the account identity shown by the dashboard.
- Verified contact email: [OWNER REQUIRED]
- Support URL or email: [OWNER REQUIRED]
- Homepage URL: [OWNER REQUIRED]

Never place store credentials, payment information, recovery codes, identity documents, tokens, or signing keys in this file or repository.

## Review checklist

- Check the current icons, listing images, owner fields, support details and
  privacy-policy URL; source files do not establish dashboard approval.
- Only `https://torg.ope.ee/*` is supported; other schools are not pre-authorized.
- Dark and light palettes are implemented; automatic system-following is not.
- Reload the unpacked extension and open a fresh Stuudium page when checking
  a production update. Agent development uses the watched headless workflow.
- Verify the exact production package in Chrome and Brave before making
  compatibility claims. Recheck store policies/dimensions before submission.
- Consult the dashboard for current publication/rejection history; no live
  submission-status history is maintained in this file.
