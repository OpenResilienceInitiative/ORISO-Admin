# Admin MUI 9 and AntD Inventory

This branch verifies the current `origin/dev` admin modernization baseline before cutting smaller UI follow-up PRs.

## Current baseline

-   React 19.2.7, Vite 8.1.2, Storybook 10.4.6, Cypress 15.18.0, and MUI 9.1.x are already present on `origin/dev`.
-   Storybook uses the Vite builder and exposes `@storybook/addon-mcp`.
-   `src/components/mui/MuiFormField.tsx` is the first shared MUI form adapter. It still wraps AntD `Form.Item`, so validation and existing form state stay compatible while presentation moves to MUI.

## AntD usage that remains

AntD is still a broad dependency across the admin panel and should not be removed globally in one review. The largest remaining groups are:

-   Layout and shell: `src/components/Layout/**`, `src/App.tsx`, `src/index.tsx`, `.storybook/preview.tsx`.
-   Forms and fields: `src/components/Form*`, `src/components/SelectFormField`, `src/components/SliderFormField`, `src/components/TranslatableFormField`, `src/components/ModalForm`.
-   Data display and editing: `src/components/ListingTable`, `src/components/ResizableTable`, `src/components/EditableTable`, status tags, cards, and modals.
-   Admin pages: `src/pages/Tenants`, `src/pages/Agency`, `src/pages/users`, `src/pages/Topics`, `src/pages/Links`, `src/pages/Profile`, `src/pages/Logs`.
-   Legal settings/DPP cards: `DataProcessingAgreementCard`, `DepartmentDataProtectionCard`, and `LegalVersionViewer` still use AntD controls while their stories provide the current regression surface.

## Reviewable migration shape

Recommended next PRs:

1. Migrate shared buttons, alerts, text inputs, password inputs, and simple selects through shared MUI adapters.
2. Move modal/card/table-heavy flows only after story and browser coverage exists for each flow.
3. Keep AntD `Form.Item` compatibility until the page-level forms are migrated, because the current validation and submit behavior depends on it.
4. Replace page-level AntD layout (`Row`, `Col`, `Space`) with MUI layout primitives only where the responsive behavior can be verified in Storybook and app runtime.

## WCAG 2.2 checks to keep with each migration

-   Every interactive control must be a native control or expose the correct role, tab behavior, and Enter/Space/Escape/Arrow handling for its pattern.
-   Focus must remain visible.
-   Controls need stable accessible names, states, and error text wiring.
-   Status cannot rely on color alone.
-   Mobile viewports must not clip labels, table actions, modal buttons, or editor toolbars.
