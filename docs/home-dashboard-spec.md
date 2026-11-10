# Home — the admin start page (ORISO-Admin#1323)

## Problem

After login every admin lands on a settings form. Nothing explains how the panel is organised:

-   where the **legal entities** (Träger, Beratungsstellen) are managed,
-   where **people** get their accounts (invite by email ≠ create directly ≠ first admin of a new Träger),
-   where statistics and logs are,
-   how far the initial setup has got.

On a phone only the menu is visible, so the structure has to be explained even more plainly.

## Principles

1. **Role-scoped, never "everything with greyed-out parts".** Each tile and each checklist step uses the
   same permission helpers as the navigation (`buildAdminNavItems`, `buildAdminNavTree`, `getSettingsTabs`,
   `resolveVisibleLinksTabs`). A Träger admin never reads platform explanations. A Beratungsstellen admin never
   reads Träger topics.
2. **Derived, not stored.** A checklist step is done when the data says so (e.g. "≥ 1 Beratungsstelle exists").
   There is no extra "ticked" state in the backend and nothing for an admin to keep in sync.
3. **Degrade, don't throw.** A fact that fails to load shows as unknown ("–"). The step is then neither done nor
   missing, and the tile still links to its area.
4. **One request per fact, smallest page.** Counts come from list endpoints with `size=1` / `perPage=1`.
   Home must not slow the login down.

## Layout

```
┌───────────────────────────────────────────────┐
│ Guten Tag, <Name>                             │
│ <one line: what this role does here>          │
├───────────────────────────────────────────────┤
│ [Checklist card]  — only while steps are open │
│  ✓ Träger anlegen               → Träger      │
│  ○ Beratungsstelle anlegen      → …           │
│  ○ Beratende einladen           → Einladen    │
├───────────────────────────────────────────────┤
│ Areas (tiles, 2–3 columns desktop, 1 mobile)  │
│ ┌ Organisation ┐ ┌ Einladen ┐ ┌ Konten ┐      │
│ │ what · fact  │ │ … · 3 offen│ │ …      │      │
│ └──────────────┘ └──────────┘ └────────┘      │
│ ┌ Einstellungen: grouped overview ┐ ┌ Statistik┐│
└───────────────────────────────────────────────┘
```

Each tile has an icon tile (the same brand-tinted tile as the mobile menu), a title, one explanatory sentence,
an optional live fact and a link.

## Tiles per role

| Tile                              | Platform admin                                            | Träger admin                              | Beratungsstellen admin                       |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------- | -------------------------------------------- |
| **Organisation** (legal entities) | Träger: count → `/admin/tenants`; Beratungsstellen: count | Beratungsstellen: count → `/admin/agency` | Ihre Beratungsstelle(n) → `/admin/agency`    |
| **Einladen** (accounts by email)  | open / needs-action invitations → `/admin/links`          | same, scoped by the server                | same, Beratende only                         |
| **Konten** (edit people)          | count → users                                             | same                                      | same                                         |
| **Einstellungen**                 | groups from `getSettingsTabs` (platform)                  | groups from `getSettingsTabs` (Träger)    | Rechtliches + Funktionszugriff of the agency |
| **Statistik**                     | if `Read Statistic`                                       | if `Read Statistic`                       | if `Read Statistic`                          |
| **Logs**                          | if a log view is readable                                 | same                                      | same                                         |

The settings tile lists the settings tabs this role has, using their real labels. The tabs are grouped:

-   _Aussehen & Inhalte_: Erscheinungsbild, Stammdaten & Mehr, Einführung Ratsuchende
-   _Recht_: Rechtliches
-   _Technik_: Email Server, Globale Konfigurationen, Systemhinweise
-   _Funktionen_: Funktionszugriff (incl. Live-Chat-Links, #1321), App-Einstellungen

## Checklist per role (derived)

| Role                   | Step                    | Done when                                              | Link                      |
| ---------------------- | ----------------------- | ------------------------------------------------------ | ------------------------- |
| Platform admin         | Träger anlegen          | tenants total > 0                                      | `/admin/tenants`          |
|                        | Träger-Admins einladen  | ≥ 1 accepted Träger invitation                         | `/admin/links/tenants`    |
| Träger admin           | Beratungsstelle anlegen | agencies total > 0                                     | `/admin/agency`           |
|                        | Beratende einladen      | ≥ 1 accepted Berater invitation **or** consultants > 0 | `/admin/links/counsellor` |
| Beratungsstellen admin | Beratende einladen      | ≥ 1 accepted Berater invitation **or** consultants > 0 | `/admin/links/counsellor` |

The card hides itself once every step is done. Steps that would need new backend data, such as "SMTP configured"
or "legal texts complete for all agencies", are **out of scope for the MVP** and are listed under follow-ups.

## Navigation

-   New route `/admin/home`. It is the first item in the sidebar and the mobile menu, and the landing page after
    login and for `/admin`.
-   _Links_ is renamed **Einladen** (sidebar, mobile menu, search keywords). The routes stay the same.
-   Mobile bottom bar: **Home · Einstellen · Einladen · Mehr**. When a role lacks a section, the next section in
    sidebar order takes its place, so the bar always has three tabs plus _Mehr_.

## Accessibility

-   Tiles are links with a visible title, never "card click + nested buttons".
-   Checklist: an ordered list. A done step has ✓, a visually hidden "erledigt" and a strikethrough-free muted
    style, so state is never shown by colour alone.
-   Live facts are text, not only badges.

## Follow-ups (not in the MVP)

-   "Last activity" per area (latest log entry, latest invitation) once a cheap "latest" endpoint exists.
-   Checklist steps that need backend facts (SMTP verified, legal texts complete, AVV signed for every Träger).
-   Small illustrations per tile (from the existing `sectionArtwork`).
