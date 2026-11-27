# ORISO-Admin#1215 — recipient scope for internal group chats: Storybook evidence

Evidence layer: `local-dev` (Storybook dev server, headless Chromium, MSW). Not deployed, not hosted Storybook, not app runtime.
Code commit: `8bbd9256`. Result for every image: axe-core 4 (WCAG 2.0/2.1/2.2 A and AA tags) reports 0 violations on the control or tile shown.

| Image                                       | Surface                                                          | Viewport | Locale |
| ------------------------------------------- | ---------------------------------------------------------------- | -------- | ------ |
| `PlatformDefault-390-de.png`                | Platform admin, served default                                   | 390px    | DE     |
| `BackendFieldMissing-390-de.png`            | Backend without the field: read-only with a note                 | 390px    | DE     |
| `PlatformRequirement-390-de.png`            | Platform admin, scope is a requirement                           | 390px    | DE     |
| `OptionPlatformWide-390-de.png`             | Option Platform-wide                                             | 390px    | DE     |
| `OptionTraegerWide-390-de.png`              | Option Träger-wide                                               | 390px    | DE     |
| `OptionCentreOnly-390-de.png`               | Option counselling centre only                                   | 390px    | DE     |
| `TraegerInheritedRecommendation-390-de.png` | Träger admin, inherited recommendation                           | 390px    | DE     |
| `TraegerLocked-390-de.png`                  | Träger admin, locked by platform requirement                     | 390px    | DE     |
| `SaveFails-390-de.png`                      | Failed save keeps the edit                                       | 390px    | DE     |
| `English-390-en.png`                        | Träger admin, English                                            | 390px    | EN     |
| `EnglishPlatformRequirement-390-en.png`     | Platform admin, English                                          | 390px    | EN     |
| `EnglishTraegerLocked-390-en.png`           | Träger admin locked, English                                     | 390px    | EN     |
| `TileTraegerLocked-390-de.png`              | Real tile, Träger admin, locked                                  | 390px    | DE     |
| `TilePlatformNoBackendField-390-de.png`     | Real tile, platform admin, backend without the field (read-only) | 390px    | DE     |
| `TileTraegerSaveRejected-390-de.png`        | Real tile, Träger admin, server rejects the save                 | 390px    | DE     |
| `PlatformDefault-820-de.png`                | Platform admin, served default                                   | 820px    | DE     |
| `BackendFieldMissing-820-de.png`            | Backend without the field: read-only with a note                 | 820px    | DE     |
| `PlatformRequirement-820-de.png`            | Platform admin, scope is a requirement                           | 820px    | DE     |
| `TraegerLocked-820-de.png`                  | Träger admin, locked by platform requirement                     | 820px    | DE     |
| `SaveFails-820-de.png`                      | Failed save keeps the edit                                       | 820px    | DE     |
| `English-820-en.png`                        | Träger admin, English                                            | 820px    | EN     |
| `EnglishPlatformRequirement-820-en.png`     | Platform admin, English                                          | 820px    | EN     |
| `EnglishTraegerLocked-820-en.png`           | Träger admin locked, English                                     | 820px    | EN     |
| `TileTraegerLocked-820-de.png`              | Real tile, Träger admin, locked                                  | 820px    | DE     |
| `TilePlatformNoBackendField-820-de.png`     | Real tile, platform admin, backend without the field (read-only) | 820px    | DE     |
| `TileTraegerSaveRejected-820-de.png`        | Real tile, Träger admin, server rejects the save                 | 820px    | DE     |
| `PlatformDefault-1440-de.png`               | Platform admin, served default                                   | 1440px   | DE     |
| `BackendFieldMissing-1440-de.png`           | Backend without the field: read-only with a note                 | 1440px   | DE     |
| `PlatformRequirement-1440-de.png`           | Platform admin, scope is a requirement                           | 1440px   | DE     |
| `TraegerLocked-1440-de.png`                 | Träger admin, locked by platform requirement                     | 1440px   | DE     |
| `SaveFails-1440-de.png`                     | Failed save keeps the edit                                       | 1440px   | DE     |
| `English-1440-en.png`                       | Träger admin, English                                            | 1440px   | EN     |
| `EnglishPlatformRequirement-1440-en.png`    | Platform admin, English                                          | 1440px   | EN     |
| `EnglishTraegerLocked-1440-en.png`          | Träger admin locked, English                                     | 1440px   | EN     |
| `TileTraegerLocked-1440-de.png`             | Real tile, Träger admin, locked                                  | 1440px   | DE     |
| `TilePlatformNoBackendField-1440-de.png`    | Real tile, platform admin, backend without the field (read-only) | 1440px   | DE     |
| `TileTraegerSaveRejected-1440-de.png`       | Real tile, Träger admin, server rejects the save                 | 1440px   | DE     |

Widths 390 / 820 / 1440 are browser viewport widths. At 390 and 820 the existing 425px permission card makes the page scroll horizontally (56px / 7px), the same as before this change; the control itself never overflows the card.
