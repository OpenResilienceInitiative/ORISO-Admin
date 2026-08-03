# Issue #659 visual evidence

All captures use the production components in local Storybook from this branch.

| Surface               | Before (mobile)            | After (mobile)                | After (desktop)                 |
| --------------------- | -------------------------- | ----------------------------- | ------------------------------- |
| Outlined fields       | `before-fields-mobile.png` | `after-fields-mobile-390.png` | `after-fields-desktop-1440.png` |
| Department legal card | `before-legal-mobile.png`  | `after-legal-mobile-390.png`  | `after-legal-desktop-1440.png`  |

Browser assertions after the fix:

-   320px legal story: page `scrollWidth = clientWidth = 320`; toolbar content remains locally scrollable (`871px` inside `211px`).
-   412px legal story: page `scrollWidth = clientWidth = 412`; toolbar content remains locally scrollable (`871px` inside `298px`).
-   390px outlined-field story: page `scrollWidth = clientWidth = 390`; five field states rendered and no forced `fit-content` legend widths remained.
-   1440px published legal story: page `scrollWidth = clientWidth = 1440`; legal card width is capped at `960px`.
