# DPIA source fidelity

`dsfa-source.json` is a frozen **test-only** extraction of the artifact explicitly
named by ORISO-Admin #758: `dsfa-page-v2.html` in
`${PROJECT_ORISO_ROOT}/0 - Docs/artifacts/dsfa-2026-08-13/`.

Original SHA-256:
`ce56f8597e9a07d2b344e263e04bdebeaa2a35544420be2b101afa158a70418d`.

The fixture stores unedited `outerHTML` for chapters 1, 2, 5, 6–11, all 19
`EVIDENCE` records and the 13 groups of `CODE` locations. Extraction used a DOM
parser with scripts disabled, and evaluated only the two literal object
initializers. It contains neither the original runtime nor its embedded font.
No production module imports this fixture or reads the original artifact.

The chapter components and evidence registry are the repository-owned source
of the document. The fixture independently prevents accidental omissions and
rewording during the port and makes that check portable to CI. It is not a
second production rendering implementation. Do not regenerate it from the
components to make a failed test pass.

## Deliberate rendering adaptations

-   Source `.dyn` sample cells become typed public master-data values or
    `Nicht hinterlegt`. Identity, address, contacts, DPO, authority, dates and
    all four dated key figures have no source/sample fallback.
-   `.n-kdg`/`.n-dsgvo` and `.p-kdg`/`.p-dsgvo` become conditional React content.
    The two source label toggles in chapter 8 reuse the shell's accessible preset
    switch and update the same state. Source control labels are tested through
    interaction, separately from legal text.
-   Internal notes are conditional. All 19 triggers exist when notes are shown;
    `altsystem` and `tenantsettings` remain at their original internal claims.
-   Native headings, lists and tables retain their content and order. Wide tables
    use labelled keyboard-focusable regions. Decorative SVG placeholders are
    replaced by existing card/measure icons or omitted; verdict words remain.
-   Chapter 5 reuses the existing counselling cards, measures and ADR-020 plan
    box. Its shortened card descriptions are restored from the named artifact.
    Two already accepted `dev` sentences are explicitly retained: the content
    consent sentence (`§ 8 Abs. 1 KDG` / `Art. 9 Abs. 2 lit. a DSGVO`) and the DPIA
    duty sentence (`§ 35 KDG` / `Art. 35 DSGVO`). Text comparison allows exactly
    these two additions, with separate assertions retaining them.
-   Comparisons ignore whitespace introduced by JSX formatting and decorative
    evidence buttons; structural counts, source link pairs, original trigger
    parents and real-browser rendering supplement the text comparisons.

## Source authority and historical claims

The separately numbered, later `dsfa-text/README.md` conflicts with the named
HTML: it excludes protection classes I–III and an unproven audit statement,
whereas the HTML contains both. For this port, the issue-named HTML governs;
neither claim is silently rewritten. The earlier review statement that the
first draft **invented** I–III was refuted by reading the immutable HTML.

The source's external audit statement is specifically about **vodozemac**,
not an audit of ORISO's application or deployment. Evidence records retain
their original verification dates and qualifications. Copying them is not a
new verification of current runtime facts. The result remains an explicitly
qualified draft with DPO approval outstanding.

The issue says 18 evidence dialogs; the original contains 19 buttons, 19 unique
keys and 19 records. All 19 are preserved, plus the separate 13-key CODE map.
The old graph fragment URLs are retained exactly as source links; no claim of
freshly verified graph navigation or live code fetching is made.

## Verification boundary

`masterData.ts` contains synthetic Storybook/test data only. Public adapter
and query tests exercise pending, success, error, null and blank states; the
Playwright script verifies responsive geometry and evidence interactions.
The actual Admin edit → save → public GET → rendered Dev readback still
requires ORISO-Admin #735. The document is intentionally not routed here.
