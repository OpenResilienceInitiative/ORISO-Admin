# Parent Task: Statistik-Dashboard an Plattformdaten anbinden

## Ziel

Das Statistik-Dashboard soll aus der Preview in ein produktionsfähiges Admin-Feature überführt werden. Die drei Ebenen `Plattformweit`, `Auf Trägerebene` und `Auf Beratungsstellenebene` sollen jeweils nur die Kennzahlen anzeigen, die für diese Ebene relevant sind. Nutzerinnen und Nutzer sollen ihre bevorzugten Dashboard-Kennzahlen pro Slot speichern können.

## Relevante Codebereiche

-   `src/pages/Statistic.tsx`: aktueller Preview-Screen, Karten-Layout, Chart-Rendering und Demo-Daten.
-   `src/pages/Statistic/types.ts`: gemeinsames Statistik-Domain-Modell für Karten, Scopes, Perioden, Trends und Charts.
-   `src/pages/Statistic/statisticConstants.ts`: auswählbare Perioden, Scope-Reihenfolge und erlaubte Menü-Kennzahlen.
-   `src/pages/Statistic/statisticPreferences.ts`: aktuelle lokale Speicherung der gewählten Kennzahlen pro User.
-   `src/pages/Statistic/statisticChartUtils.ts`: Achsen- und Donut-Berechnung.
-   `src/pages/Statistic/useAnimatedDisplayValue.ts`: Counter-Animation für Zahlen.
-   `src/styles/components/statistic.less`: Dashboard-Layout, responsive Verhalten, Menüs, Balken- und Donut-Animationen.
-   `src/index.tsx`: Preview-Route `/admin/statistic-preview`, aktuell nur in `import.meta.env.DEV`.

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

## Umsetzungstasks

### Daten sammeln

-   Statistik-Events definieren: Anfrage erstellt, Beratungsfall erstellt, Nachricht von ratsuchender Person, Nachricht von beratender Person, Videoanruf gestartet/beendet, Anruf gestartet/beendet, Sprachnachricht erstellt, Gesprächstyp gesetzt, Thema gesetzt.
-   Event-Payloads festlegen: Zeitstempel, Beratungsstellen-ID, Träger-ID, Nutzerrolle, Gesprächstyp, Thema, Kanal, optional anonymisierte Dauer/Status.
-   Bestehende Backend-Events prüfen und nur fehlende Events neu instrumentieren.
-   Aggregationsjob oder materialisierte Statistik-Tabelle einführen, damit das Admin-Dashboard keine Rohdaten über große Zeiträume scannen muss.
-   Datenschutz prüfen: keine Nachrichteninhalte speichern, nur aggregierbare Metadaten.

### API verbinden

-   Endpoint für Dashboard-Kennzahlen ergänzen, z. B. `GET /admin/statistics/dashboard?scope=platform&period=thisWeek`.
-   Endpoint für auswählbare Kennzahlen je Scope ergänzen, damit Plattform, Träger und Beratungsstelle unterschiedliche Optionen erhalten.
-   Endpoint für Balkendiagramm ergänzen: Zeitraum `diese Woche`, `letzte Woche`, `vor zwei Wochen`, `vor drei Wochen`, `vor vier Wochen`.
-   Endpoint für Gesprächstyp-Donut ergänzen: `heute`, `gestern`, `diese Woche`, `gesamt`, `dieses Jahr`, `letztes Jahr`.
-   API-Response mit `src/pages/Statistic/types.ts` abgleichen oder daraus ein geteiltes DTO ableiten.

### Nutzerpräferenzen speichern

-   Backend-Speicherung für gewählte Dashboard-Slots pro Nutzer ergänzen.
-   Frontend-Fallback `localStorage` behalten, falls die API nicht erreichbar ist.
-   Migration von lokalen Preview-Präferenzen auf serverseitige Präferenzen optional prüfen.

### Frontend produktiv schalten

-   Demo-Daten aus der Page entfernen oder in einen Mock-Adapter verschieben.
-   Preview-Route durch echte Statistik-Route oder Feature-Flag ersetzen.
-   Lade-, Fehler- und Empty-States ergänzen.
-   Scope-Rechte an Rollen und Permissions anbinden.
-   Visuelle Regression für Desktop und Mobile ergänzen.

## Akzeptanzkriterien

-   Dashboard lädt reale Kennzahlen pro Scope.
-   Verfügbare Kennzahlen unterscheiden sich sinnvoll zwischen Plattform, Träger und Beratungsstelle.
-   Top-Karten lassen sich per Drei-Punkte-Menü austauschen.
-   Auswahl wird pro Nutzer gespeichert.
-   Balkendiagramm zeigt pro Zeitraum korrekte Tageswerte und markiert die angeklickte Säule.
-   Donut und große Zahlen animieren leise beim Datenwechsel.
-   Mobile Ansicht bleibt scrollbar und ohne Text-/Icon-Überlappungen.
-   Alle sichtbaren Texte sind Deutsch und konsistent benannt.

## Offene technische Entscheidungen

-   Sollen Periodenauswahl und zuletzt gewählter Balken ebenfalls pro User gespeichert werden?
-   Werden Trends serverseitig berechnet oder aus Rohwerten im Frontend abgeleitet?
-   Soll die produktive Route die alte Statistik ersetzen oder zunächst parallel hinter einem Feature-Flag laufen?
-   Welche Rollen dürfen welche Scope-Ebene sehen?
