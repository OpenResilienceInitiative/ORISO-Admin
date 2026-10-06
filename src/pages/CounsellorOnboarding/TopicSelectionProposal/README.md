# Topic selection design preview

Story-only proposal for Admin1137 / parent1026. It is not imported by a production route. All identities, translations and permission cases are explicit fixtures; no HTTP calls, catalogue creation or stored permissions are involved.

Three original PNG assets are copied unchanged from ORISO-Frontend `src/resources/img/registration-md3/icons/`, verified against origin/dev `aa6ab41d1209acfb0c90b9155acce0ed73f9fffe`:

-   `t-01-eltern-und-familie.png` — SHA256 prefix0226923dae6b
-   `t-05-schulden.png` — SHA256 prefix59c4c46b3ca4
-   `t-04-sucht.png` — SHA256 prefix3e612f3a4df4

Their mapping to example IDs101/102/103 is defined explicitly in fixtures.ts. No ID-to-icon production contract currently exists in the onboarding DTO; other choices intentionally show a neutral missing-icon state. Do not convert this fixture mapping or these example translations into a production catalogue. Artwork ownership/reference: existing Admin IconCatalog shared topic family, Figma M3_ORISO node61093-22600.

Public test seam: reviewer searches and selects permitted topics, cancels or applies, removes an unlocked selection, changes language with the dialog open and retains entered names/selected identities. Shared Modal/M3Button/M3Checkbox/FilterChip/MuiFormField are reused; locale is isolated per story. Status fixtures stay visibly a design preview. Product contract, human design approval and actual Dev acceptance remain separate future gates.
