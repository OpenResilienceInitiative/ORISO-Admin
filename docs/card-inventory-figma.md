# Admin Card Inventory — Figma → Atomic map

Source: Figma `Admin.ORISO` (`QfsgojtHQzBjbzU3Im9Cet`). 10 card frames pulled 2026-07-19.
Goal: one shared `Card` organism + a small shared atom/molecule set covers all 10.
Every card = **CardHeader (centered icon over Headline Small, Inter 24/32/400) + body slot + CardFooter (top divider + text button(s))**. Only the body differs.

## The 10 cards

| #   | Node     | Card                      | Header icon | Body ingredients                                                                                                            | Footer                               |
| --- | -------- | ------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| 1   | 900-7044 | Case takeover             | rotate      | ToggleRow ×3, SegmentedTabs, Select (clock + value + chevron), PillGroup (languages), TextareaField, warning text           | Config + Enforce text buttons        |
| 2   | 1-34189  | Individuelle Bilder       | image       | ImageUploadField (Logo 512² preview + Favicon 32² w/ pencil badge)                                                          | Bearbeiten                           |
| 3   | 1-34207  | Sprachen                  | globe       | Hint text (bold lead), PillGroup (7 selectable, 1 locked default)                                                           | Bearbeiten                           |
| 4   | 1-34785  | Gebiet & Zusatzfunktionen | house-pin   | Select, PostalCodeRangeRow ×n (von↔bis + delete, error state), OutlinedButton (+), Subsection title, FilterChip group       | Zurück / Registrierung abschließen   |
| 5   | 1-34786  | Themenschwerpunkte        | shield      | FilterChip group (wrap, selected = dark + check)                                                                            | Zurück / Weiter                      |
| 6   | 1-34787  | Infos zur ihrer Person    | shield      | TextField ×5 (empty/filled/clear/error), Select (open, tonal selected item), TextareaField, helper                          | Zurück / Weiter                      |
| 7   | 1-34788  | Avatar & Name             | person      | Subsection title ×2, AvatarPickerGrid, TextField ×2 + helper, ImageUploadField, ToggleRow                                   | Zurück / Weiter                      |
| 8   | 1-34789  | Beraterkonto Daten        | shield      | TextField (email, clear), TextButton row (icons), TextField (username), PasswordField (dotted), OutlinedButton (full, icon) | Abbrechen / Weiter                   |
| 9   | 1-34790  | Stapel Modus              | mail        | TextField (filled+clear), TextField ×3 (optional), OutlinedButton (+), TextareaField                                        | Abbrechen / An Alle versenden        |
| 10  | 1-34805  | Alles geschafft           | smiley      | TextareaField, helper text                                                                                                  | Registrierung beenden (primary text) |

## Derived component inventory (build once, reuse everywhere)

Reuse status vs current `src/components`:

### Atoms

| Atom                                                    | Used by cards        | Status                        |
| ------------------------------------------------------- | -------------------- | ----------------------------- |
| Typography: Headline Small / Title Small / Body / Label | all                  | **new** — pin to Figma vars   |
| TextField (states: empty·filled·clear·error·disabled)   | 6,7,8,9              | align `FloatingLabelInput`    |
| TextareaField                                           | 1,6,9,10             | align `FormTextAreaField`     |
| PasswordField                                           | 8                    | align (TextField + reveal)    |
| Select (value + chevron; open = tonal selected)         | 1,4,7                | align `SelectFormField`       |
| M3Switch                                                | 1,7                  | ✅ `M3Switch`                 |
| M3Checkbox                                              | 1                    | ✅ `M3Checkbox`               |
| FilterChip (selectable, dark + check)                   | 4,5,900              | **new** (PillSelect is close) |
| Pill (language)                                         | 1,3                  | ✅ `PillSelect`               |
| TextButton (M3, red, optional icon)                     | all footers + inline | align `Button`/`EditButton`   |
| OutlinedButton (+ icon)                                 | 4,8,9                | align `Button`                |
| FilledButton (icon) — Hochladen                         | 7                    | align `Button`                |
| IconButton (circular delete)                            | 4                    | **new**                       |
| SegmentedTabs (underline)                               | 1                    | ✅ `AdminSegmentedTabs`       |
| Divider, Icon                                           | all                  | trivial                       |

### Molecules

| Molecule                                      | Used by | Status                  |
| --------------------------------------------- | ------- | ----------------------- |
| CardHeader (icon over Headline Small)         | all     | fold into `Card`        |
| CardFooter (divider + text buttons)           | all     | fold into `Card`        |
| ToggleRow (checkbox/label + switch)           | 1,7     | **new**                 |
| LabeledField (label + input + helper)         | most    | **new** wrapper         |
| PillGroup / ChipGroup (wrap)                  | 3,4,5   | **new**                 |
| PostalCodeRangeRow (von↔bis + delete + error) | 4       | **new**                 |
| AvatarPickerGrid                              | 7       | **new**                 |
| ImageUploadField (preview + upload/badge)     | 2,7     | **new**                 |
| OpenSelect (select + tonal menu)              | 7       | align `SelectFormField` |

### Organism

`Card` = CardHeader + body slot + CardFooter. All 10 frames are instances → `Organisms/Cards/*` stories.

## Conclusion

-   **One `Card` skeleton** serves all 10 — the header/footer never change.
-   **~7 genuinely new pieces**: FilterChip, IconButton, ToggleRow, PillGroup, PostalCodeRangeRow, AvatarPickerGrid, ImageUploadField. Everything else is _align existing atom to Figma_, not rebuild.
-   This is the evidence for "we keep re-drilling instead of reusing": the vocabulary is small, but today it is scattered (`.chatTypeCard`, `CardEditable`, `Card`, ad-hoc field markup) instead of a shared kit.
