# Help pictures for "Gastkonten erlauben" (#1558, #1560)

The explanation of "Gastkonten erlauben" has three slides without pictures yet. "Fälle teilen", "Direkteinladung erlauben" and "Konto der ratsuchenden Person" reuse existing pictures (`caseHandoverHelp`, `directInviteHelp`, `ASKER_HELP`).

## House style (from `src/resources/img/tile-help/permissions/*.webp`)

-   One continuous thin line drawing, dark grey (`#1b1b1c`), stroke about 2 px, no fill, no shading.
-   Exactly one accent element in ORISO red (`#a5000a`), drawn as an outline, never a fill.
-   Transparent background. Landscape, about 800 × 520 px. Exported as WebP.
-   People are adults, neutral, no faces in detail, no text, no logos, no screens with readable UI.
-   Calm, documentary, never cartoonish.

## Prompts

### 1. `guest-temporary.webp` — "Nach der Sitzung löschen"

> Single continuous thin dark-grey line drawing on a transparent background, minimal, no fill, no text. A person sits at a small table with a laptop, finishing a video conversation. Beside the laptop, a small paper card is dissolving into a few loose line fragments, as if being wiped away. Only the dissolving card is drawn in a thin red (#a5000a) outline. Landscape 800×520, calm documentary style.

### 2. `guest-chooses.webp` — "Gast wählt"

> Single continuous thin dark-grey line drawing on a transparent background, minimal, no fill, no text. A person stands in front of two doors side by side, one hand raised, deciding. One door is slightly open, the other closed. Only a small key in the person's hand is drawn in a thin red (#a5000a) outline. Landscape 800×520, calm documentary style.

### 3. `guest-permanent.webp` — "Dauerhaft"

> Single continuous thin dark-grey line drawing on a transparent background, minimal, no fill, no text. A person walks back through an open door into a room with a table and two chairs, carrying a small bag, clearly returning. A key hangs on a hook beside the door; only the key is drawn in a thin red (#a5000a) outline. Landscape 800×520, calm documentary style.

## Wiring once the pictures exist

Put the files in `src/resources/img/tile-help/permissions/` and add `visual: picture(...)` to the three slides of `GUEST_ACCOUNT_HELP` in `src/components/Tenants/AppSettings/PermissionsSettings/tileHelpTopics.ts`.
