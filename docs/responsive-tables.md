# Responsive listing tables

These rules apply to Admin lists, including Accounts and Invitations.

1. Measure the list container, including the space taken by navigation, side panels and page gutters. A wide browser does not guarantee room for a wide table. Use existing viewport behavior only as the fallback before measurement.
2. Keep the wide table when its columns fit. At narrower widths, first combine secondary information into existing cells. Switch to the existing row-card presentation before the remaining columns would overflow the container. Reuse the shared table/card components and keep actions, permissions and sorting available.
3. Keep search, page controls and the menu on one row. If that row cannot fit on a phone, scroll that toolbar locally. Keep focus outlines inside its scrollport. Long timelines may also scroll locally; names and ordinary content should wrap.
4. Preserve page scrolling and sticky table headers. Do not hide an overflowing table or add a whole-table scroller as a substitute for the intended card layout.
5. For each transition, add browser checks immediately below and at the measured threshold. Include a narrow container inside a desktop viewport, representative long content, keyboard focus, and the wide reference. Assert that the table/cards stay inside their container and the document does not acquire horizontal overflow. Unit tests can cover the width decision, but cannot prove rendered containment.

Widths depend on the actual columns and controls of each list. Do not copy a generic phone breakpoint from another page without checking that its table fits. Record the measured fit and keep browser regressions next to the affected stories.
