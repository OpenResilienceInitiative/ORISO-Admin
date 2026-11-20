# Issue 193 verification

Local Storybook (`Organisms/Page/OverflowingSettingsTabs`), Microsoft Edge via
Playwright, 1280 × 800. These screenshots use the real shared Page header with
representative theme settings tabs; they are not captures of the deployed admin.

-   `tabs-start.png`: backward disabled, forward enabled, later tabs clipped.
-   `tabs-end.png`: System notices fully visible, forward disabled, backward enabled.

Browser assertions check scrolling to the end, reversing using Enter on the
backward button, and removal of the desktop tab row at 390 × 844.
Unit coverage checks both Page.Title and Page.Back, scroll limits, resize to fit,
card navigation fallback, and tab navigation priority over a registered card deck.

## Validation results

-   Focused Page/CardDeck suite: 2 files, 10 tests passed.
-   Repository ESLint (`npx eslint . --max-warnings=0`): passed.
-   Changed-file formatting: passed.
-   TypeScript and Vite production build: passed.
-   Post-build host validation: passed using Git Bash explicitly because `bash`
    is not on the Windows PATH.
-   Full unit suite: stopped after more than ten minutes without completing a
    test file. No full-suite result is claimed.

Reproduce the screenshots from the repository root with Storybook running on
port 6193 and Microsoft Edge installed:

```powershell
npm run storybook -- --port 6193 --ci
node docs/pr-evidence/193/capture.cjs
```
