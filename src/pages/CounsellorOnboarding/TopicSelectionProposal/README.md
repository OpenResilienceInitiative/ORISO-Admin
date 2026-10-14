# Topic selection design preview

Story-only proposal for Admin1137 / parent1026. It is not imported by a production route. All identities, translations and permission cases are explicit fixtures; no HTTP calls, catalogue creation or stored permissions are involved.

Three original PNG assets are copied unchanged from ORISO-Frontend `src/resources/img/registration-md3/icons/`, verified against origin/dev `aa6ab41d1209acfb0c90b9155acce0ed73f9fffe`:

-   `t-01-eltern-und-familie.png` — SHA256 prefix0226923dae6b
-   `t-05-schulden.png` — SHA256 prefix59c4c46b3ca4
-   `t-04-sucht.png` — SHA256 prefix3e612f3a4df4

Their mapping to example IDs101/102/103 is defined explicitly in fixtures.ts. No ID-to-icon production contract currently exists in the onboarding DTO; other choices intentionally show a neutral missing-icon state. Do not convert this fixture mapping or these example translations into a production catalogue. Artwork ownership/reference: existing Admin IconCatalog shared topic family, Figma M3_ORISO node61093-22600.

Public test seam: reviewer searches and selects permitted topics, cancels or applies, removes an unlocked selection, changes language with the dialog open and retains entered names/selected identities. Shared Modal/M3Button/Checkbox/FilterChip/MuiFormField are reused; locale is isolated per story. Status fixtures stay visibly a design preview. Product contract, human design approval and actual Dev acceptance remain separate future gates.

## Seven-language review revision (7 October 2026)

The supported codes are imported from Admin `src/constants/supportedLanguages.ts`: de, en, fr, ru, tr, uk, ti. This is the same catalogue used by tenant language settings (`appConfig.ts`); the public Admin LanguageSelector still supports de/en, so it is not used as a misleading seven-language control here. A single native MUI select uses the existing shared `muiFieldSx` styling and appears in the page header when closed or the dialog when open. A product integration should inherit the user's global language instead of duplicating this preview control.

New French, Russian, Turkish and Tigrinya topic labels are snapshots of Frontend `src/resources/i18n/<locale>/consultingTypes.json`, with explicit example-ID mapping: 101→10, 102→23, 103→25, 104→22, 105→2, 106→16, 109→13, 110→12, 112→4, 113→20, 114→24, 115→7, 116→18, 117→17, 119→27, 120→19. The existing German/English example labels remain compatible with the original preview.

Ukrainian has no bundled topic catalogue in the inspected Frontend source. All Ukrainian labels, five added UI-copy locales, and the four topics missing from that catalogue (example IDs 107,108,111,118) are explicitly authored review fixtures and require native-speaker review. They are not a backend translation contract. Missing-language fallback is disabled for this isolated instance; all seven copy shapes and topic labels are type checked. These seven scripts are left-to-right, including Tigrinya's Ethiopic script.

The shared Modal's close-button accessible name remains `Close`. Ant Design has no bundled Tigrinya locale, so only its dialog action copy is supplied in a preview-specific locale object; unused library text inherits English. The visible picker controls and topics use the complete local preview resources. No shared Modal, production route, API or locale settings change.

Spacing now separates language control, full-width search, selection summary, scrollable results and footer. The whole labelled topic row activates the existing native Ant Design checkbox; the last choice and required choices are explicitly disabled. Required selections outside selectable centre topics remain in the summary without becoming newly selectable.
