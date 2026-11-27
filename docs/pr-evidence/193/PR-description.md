# Fix settings header arrows for overflowing tabs

Refs OpenResilienceInitiative/ORISO-Docs#193

Admins can now use the header arrows to reach settings tabs that extend beyond the screen, including System notices.

-   Scroll the tab row when it overflows; preserve card navigation when all tabs fit.
-   Keep both arrows attached to the same target and disable each at its scroll limit.
-   Update on scrolling, resizing, and tab size changes; reveal the selected tab after navigation.
-   Provide English/German accessible labels and link buttons to their scroll container.

Verification: local Storybook in Edge via Playwright; forward/end-state, keyboard reverse, and mobile checks passed. No deployed environment was changed.

Checks: 10 focused Page/CardDeck tests, ESLint, and formatting passed. TypeScript/Vite build passed; post-build host validation passed via Git Bash (bash is absent from PATH). Full unit run was stopped after over ten minutes without completing a test file; full-suite results are unavailable.

Reviewer test: check Theme settings, Global Settings, and Tenant edit at narrow desktop widths. Scroll both ways, select the last tab, resize, and confirm card arrows still work when tabs fit.

![Start: backward disabled](https://raw.githubusercontent.com/OpenResilienceInitiative/ORISO-Admin/fix/193-settings-header-arrows/docs/pr-evidence/193/tabs-start.png)

![End: System notices visible and forward disabled](https://raw.githubusercontent.com/OpenResilienceInitiative/ORISO-Admin/fix/193-settings-header-arrows/docs/pr-evidence/193/tabs-end.png)
