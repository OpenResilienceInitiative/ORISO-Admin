# Mobile navigation: thumb-reachable FAB menu

Implementation plan for the mobile admin navigation redesign. Every phase is
reviewed against the Figma source before the next one starts — see
[Verification protocol](#verification-protocol).

## 1. Source of truth

File `QfsgojtHQzBjbzU3Im9Cet` (Admin.ORISO), section **Nav Mobile** `1700:42798`,
frame **Admin Nav Mobile** `1683:39455`. Six variants of one component, all
390 × 650:

| #   | Variant              | Node         | What it shows                                  |
| --- | -------------------- | ------------ | ---------------------------------------------- |
| 1   | Menu Open            | `1683:39454` | Destination stack expanded above the bar       |
| 2   | Menu closed          | `1683:39456` | Resting state: active-page FAB + section chips |
| 3   | With Back Button     | `1683:40339` | Extra back FAB between page FAB and chips      |
| 4   | Searchbar Minimal    | `1700:42644` | Collapsed search above the bar                 |
| 5   | Searchbar Expanded   | `1683:41452` | Search field open, add button on the right     |
| 6   | Searchbar Config Row | `1683:41718` | Search + filter split buttons + add button     |

Designer annotations carried over from the section (these are requirements, not
suggestions):

-   **A1** Closed: the FAB shows the icon of the active page. Open: it shows a close icon.
-   **A2** Back button replaces the name: no tenant/entity label next to it, icon only. Behaviour stays as today.
-   **A3** All second-row elements move to the bottom.
-   **A4** The search must not overflow; its menus open **upward**.
-   **A5** The add (`+`) button is exchanged on desktop too — one global change in the admin panel.
-   **A6** All rows are sticky-fixed to the bottom; everything above them scrolls.

## 2. What exists today

On `pre-dev` after #622–#631 the mobile navigation is:

| Piece                        | File                                         | Fate                                                                                  |
| ---------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------- |
| 96px bottom shelf            | `src/components/AppBottomBar/`               | Replaced — the new bar is a transparent row of floating controls, not a surface shelf |
| Segment row                  | `src/components/M3NavigationBar/`            | Replaced by the FAB menu stack                                                        |
| Overflow sheet               | `src/components/MoreMenuSheet/`              | Replaced (open question Q2 for account/logout)                                        |
| Overflow measurement         | `src/hooks/useNavOverflow.hook.ts`           | Dropped — chips scroll horizontally instead of being cut                              |
| Illustrated section cards    | `src/components/SectionCarousel/`            | Open question Q1                                                                      |
| Mobile branch of the tab row | `src/components/Page/index.tsx` (`PageTabs`) | Rewired to feed the bottom chips                                                      |
| Composition                  | `src/components/Layout/AdminBottomNav.tsx`   | Rewritten                                                                             |

Why it is being replaced: today the page-level navigation is split across two
rows at opposite ends of the screen — destinations at the bottom, sections at
the top — and the section row is the one users touch most. The redesign puts
both in the thumb zone and gives the page its full height back.

## 3. Target anatomy (measured from Figma)

All values are from the nodes above. Values marked **(verify)** are derived from
absolute positions across variants and must be confirmed by overlay in phase 0.

### 3.1 The bar row (all states)

-   Sits flush at the bottom of the viewport, inset **6px** on all sides, full width.
-   Order: `[page FAB] 8px [back FAB, conditional] 8px [chip group →]`.
-   The row itself has **no background and no elevation** — the controls float over the page.
-   Content above must reserve the row height: 56 + 2 × 6 = **68px** (matches the
    `68px` spacer frame in variant 2), plus each extra row that is present.

### 3.2 Page FAB (`Active Page Element` / `Close Menu`)

| Property     | Value                                                        | Token                               |
| ------------ | ------------------------------------------------------------ | ----------------------------------- |
| Size         | 56 × 56                                                      | —                                   |
| Radius       | 28                                                           | `corner/extra-large`                |
| Background   | `#410001`                                                    | `M3/sys/light/on-primary-fixed`     |
| Icon glyph   | 20px (inside a 24px mask box)                                | —                                   |
| Icon colour  | `#FFE2DE`                                                    | `M3/sys/light/on-primary-container` |
| Elevation    | `0 1px 3px rgba(0,0,0,.30)`, `0 4px 8px 3px rgba(0,0,0,.15)` | `M3/Elevation Light/3`              |
| Icon, closed | icon of the active destination                               | —                                   |
| Icon, open   | close (`X`)                                                  | —                                   |

Note: variants 3 and 6 render this FAB without the shadow. Treated as a Figma
inconsistency — elevation 3 is applied in every state. **(verify with Frank)**

### 3.3 Back FAB (variant 3 only)

Same box as the page FAB, different colour and no elevation in the source:

| Property    | Value              | Token                     |
| ----------- | ------------------ | ------------------------- |
| Background  | `#A5000A`          | `M3/sys/light/primary`    |
| Icon        | `arrow_back`, 20px | —                         |
| Icon colour | `#FFFFFF`          | `M3/sys/light/on-primary` |

Rendered only when the page has a back target. **No label** (A2).

### 3.4 Section chips (`Active Subheaders`, M3 connected button group)

-   Group: radius 28, `overflow: clip`, gap **2px**, nominal width 370px.
    At 390px viewport the available width is 314px, so the group **scrolls
    horizontally** and bleeds past the right edge by design.
-   Segment: padding `16px 24px`, gap 8, min-width 48 → height **56**.
-   Icon 24px, label M3 title/medium (Inter Medium 16/24, tracking 0.15).

| Segment    | Background                        | Label                                | Radius                          |
| ---------- | --------------------------------- | ------------------------------------ | ------------------------------- |
| Selected   | `#4C555F` (`secondary`)           | `#FFDAD5` (`primary-fixed`)          | 100px (full pill)               |
| Unselected | `#646D78` (`secondary-container`) | `#E7EFFC` (`on-secondary-container`) | 8px                             |
| Last one   | `#646D78`                         | `#E7EFFC`                            | 8 / 28 / 8 / 28, `flex-grow: 1` |

Selection morphs the shape (8px → full pill) — that is the M3 connected-button-group
behaviour, and it is the only selection affordance besides colour.

### 3.5 Destination stack (variant 1)

-   Vertical list **above** the bar, left edge aligned with the FAB (6px inset), gap **4px**.
-   Gap between the last pill and the FAB: **6px** (the bar row's own padding).
-   Item: height 56, radius 28, padding `16px 24px`, gap 8, icon 24, label title/medium.
-   Content is **right-aligned** inside each pill (icon then label, flush right), so
    the pills form a ragged left edge and a straight right edge.

| Item state         | Background | Label / icon |
| ------------------ | ---------- | ------------ |
| Active destination | `#410001`  | `#FFE2DE`    |
| Other destinations | `#FFE2DE`  | `#410001`    |

-   The stack carries one shadow as a block: `0 4px 4px rgba(0,0,0,.15)`, `0 1px 1.5px rgba(0,0,0,.30)`.
-   Figma sample shows 6 destinations (356px tall = 6 × 56 + 5 × 4).

### 3.6 Search rows (variants 4–6)

A second row above the bar, left inset 6px, **12px** above the bar row **(verify)**,
horizontally scrollable, same sticky-to-bottom rule (A6).

| Element             | Spec                                                                                                                                                                                                 |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Collapsed search    | 56 high, radius 28, background `#FCF9F9` (`surface-bright`), inner shadow `inset 4px 4px 8px rgba(0,0,0,.12)`, 48px trailing slot with a 24px search glyph                                           |
| Filter split button | leading: h56, radius 28/4/28/4, 1px border `#C4C7C8` (`outline-variant`), padding `16px 24px`, 24px icon + label `#444748` (`on-surface-variant`); trailing: 56 × 56, radius 4/28/4/28, 26px chevron |
| Add button          | 56 round, background `#4C555F` (`secondary`), 24px `+`, white                                                                                                                                        |
| Expanded search     | field grows to the free width; the add button stays pinned right (A4: never overflow)                                                                                                                |

Menus opened from this row (filter dropdowns, search suggestions) must open
upward — anchor bottom, flip disabled (A4).

## 4. Component plan

| Component                                                               | Kind                      | Notes                                                                                                                           |
| ----------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `M3FabMenu`                                                             | new                       | Page FAB + expanding destination stack; owns open/closed state, focus trap, Esc, outside-click                                  |
| `M3ConnectedButtonGroup`                                                | new                       | The chip group. Audit `SegmentedTabs` / `AdminSegmentedTabs` / `PillGroup` first and extend one of them if the shape morph fits |
| `AdminBottomBar`                                                        | rewrite of `AppBottomBar` | Row composition: FAB, optional back FAB, chips, optional rows above. Layout only — positioning stays with the layout wrapper    |
| `BottomSearchRow`                                                       | new                       | Collapsed / expanded / config-row states, built from the existing `GlobalSearch/SplitButton`                                    |
| `AdminBottomNav`                                                        | rewrite                   | Wires destinations, active key, back target and section chips into the bar                                                      |
| `PageTabs` (mobile branch)                                              | change                    | Publishes its tabs to the bar instead of rendering a top row                                                                    |
| `SectionCarousel`, `MoreMenuSheet`, `M3NavigationBar`, `useNavOverflow` | removal candidates        | Only after the replacement is approved (Q1, Q2)                                                                                 |

Data flow follows the pattern already used for the deck-nav rails: the page
**registers** its section tabs and back target in a context, the bar reads them.
No prop drilling through every settings page.

## 5. Phases

Each phase ends with a Storybook story, a screenshot at 390 × 844 next to the
Figma render, and an explicit approval before the next phase starts.

| Phase | Content                                                                                                                                                                                                       | Figma reference                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| P0    | Token + icon audit: confirm `#410001`, `#A5000A`, `#4C555F`, `#646D78`, `#FFE2DE`, `#FFDAD5`, `#E7EFFC`, `#FCF9F9`, `#C4C7C8` exist as M3 variables; confirm the six destination glyphs exist in the icon set | all                                      |
| P1    | `M3FabMenu` — closed, open, active-item states                                                                                                                                                                | `1683:39454`, `1683:39456`               |
| P2    | `M3ConnectedButtonGroup` — selected/unselected/end segment, shape morph, horizontal scroll                                                                                                                    | `1683:39456`                             |
| P3    | `AdminBottomBar` composition incl. back FAB                                                                                                                                                                   | `1683:40339`                             |
| P4    | `BottomSearchRow` — minimal, expanded, config row; upward menus                                                                                                                                               | `1700:42644`, `1683:41452`, `1683:41718` |
| P5    | App wiring: layout wrapper, content bottom inset, `PageTabs` registration, back target                                                                                                                        | —                                        |
| P6    | Removals + tests + a11y (44px targets, focus order, `aria-current`)                                                                                                                                           | —                                        |

## 6. Verification protocol

For every state, in this order:

1. Storybook story at viewport **Phone 390** (`.storybook/preview.tsx` presets).
2. Playwright screenshot of the story canvas at 390px width.
3. `get_screenshot` of the matching Figma node at the same width.
4. Both images posted side by side, with a delta table: element, Figma value,
   built value, verdict. Anything that differs is either fixed or listed as an
   accepted deviation with a reason.
5. Approval before the next phase.

The same states are then re-checked in the running app (`/admin`, Pre-Dev data)
at 390px before the phase counts as done — Storybook proves the component, the
app proves the wiring.

## 7. Open questions

-   **Q1** Do the illustrated section cards (`SectionCarousel`, #629) disappear
    entirely in favour of the chip group, or do they stay for top-level sections?
-   **Q2** Where do _Konto_ and _Abmelden_ live now that `MoreMenuSheet` goes away —
    as two extra pills at the bottom of the destination stack, or somewhere else?
-   **Q3** Does tapping the page FAB open the destination stack (and the chips stay
    visible underneath), or does the stack replace the chips while open?
-   **Q4** A5 says the add button changes on desktop too. Is that in scope here, or
    a separate module?
-   **Q5** Scope: Admin only, or does the App layer (`ORISO-Frontend`) get the same
    pattern?
