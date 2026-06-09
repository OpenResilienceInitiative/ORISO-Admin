# Parent Task: Statistik-Dashboard an Plattformdaten anbinden

## Ziel

Das Statistik-Dashboard soll aus der Preview in ein produktionsfähiges Admin-Feature überführt werden. Die drei Ebenen `Plattformweit`, `Auf Trägerebene` und `Auf Beratungsstellenebene` sollen jeweils nur die Kennzahlen anzeigen, die für diese Ebene relevant sind. Nutzerinnen und Nutzer sollen ihre bevorzugten Dashboard-Kennzahlen pro Slot speichern können.

## Relevante Codebereiche

- `src/pages/Statistic.tsx`: aktueller Preview-Screen, Karten-Layout, Chart-Rendering und Demo-Daten.
- `src/pages/Statistic/types.ts`: gemeinsames Statistik-Domain-Modell für Karten, Scopes, Perioden, Trends und Charts.
- `src/pages/Statistic/statisticConstants.ts`: auswählbare Perioden, Scope-Reihenfolge und erlaubte Menü-Kennzahlen.
- `src/pages/Statistic/statisticPreferences.ts`: aktuelle lokale Speicherung der gewählten Kennzahlen pro User.
- `src/pages/Statistic/statisticChartUtils.ts`: Achsen- und Donut-Berechnung.
- `src/pages/Statistic/useAnimatedDisplayValue.ts`: Counter-Animation für Zahlen.
- `src/styles/components/statistic.less`: Dashboard-Layout, responsive Verhalten, Menüs, Balken- und Donut-Animationen.
- `src/index.tsx`: Preview-Route `/admin/statistic-preview`, aktuell nur in `import.meta.env.DEV`.

## Architekturvorschlag

1. Datenzugriff als eigene API-Schicht ergänzen, z. B. `src/api/statistic/getDashboardStatistics.ts`.
2. Demo-Daten aus `src/pages/Statistic.tsx` in Fixtures oder Mock-Adapter verschieben.
3. Ein normalisiertes Dashboard-Modell verwenden:
   - `scope`
   - `availableMetrics`
   - `defaultSlots`
   - `selectedSlots`
   - `caseChart`
   - `conversationBreakdown`
4. UI-Komponenten aus der Page extrahieren:
   - `StatisticCard`
   - `PeriodSelect`
   - `CaseChart`
   - `ConversationDonut`
   - `ScopeTabs`
5. User-Präferenzen serverseitig speichern, sobald die API dafür existiert. Bis dahin bleibt `localStorage` der Preview-Fallback.

## Akzeptanzkriterien

- Dashboard lädt reale Kennzahlen pro Scope.
- Verfügbare Kennzahlen unterscheiden sich sinnvoll zwischen Plattform, Träger und Beratungsstelle.
- Top-Karten lassen sich per Drei-Punkte-Menü austauschen.
- Auswahl wird pro Nutzer gespeichert.
- Balkendiagramm zeigt pro Zeitraum korrekte Tageswerte und markiert die angeklickte Säule.
- Donut und große Zahlen animieren leise beim Datenwechsel.
- Mobile Ansicht bleibt scrollbar und ohne Text-/Icon-Überlappungen.
- Alle sichtbaren Texte sind Deutsch und konsistent benannt.

## Offene technische Entscheidungen

- Sollen Periodenauswahl und zuletzt gewählter Balken ebenfalls pro User gespeichert werden?
- Werden Trends serverseitig berechnet oder aus Rohwerten im Frontend abgeleitet?
- Soll die produktive Route die alte Statistik ersetzen oder zunächst parallel hinter einem Feature-Flag laufen?
- Welche Rollen dürfen welche Scope-Ebene sehen?
