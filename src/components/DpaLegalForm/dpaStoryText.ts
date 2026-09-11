const paragraph =
    'Die Vertragsparteien vereinbaren, dass sämtliche personenbezogenen Daten ausschließlich zur Erfüllung ' +
    'des vereinbarten Zwecks verarbeitet werden. Technische und organisatorische Maßnahmen sind nach Art. 32 ' +
    'DSGVO zu treffen, regelmäßig zu prüfen und zu dokumentieren.';

const section = (index: number, title: string) =>
    `<h2>§ ${index} ${title}</h2>${Array.from({ length: 4 }, () => `<p>${paragraph}</p>`).join('')}`;

/** Realistically long, multi-chapter contract documents — the case the chapter chips exist for. */
export const LONG_DPA_HTML = `<h1>Vertragsunterlagen</h1><p>Zwischen dem Plattformbetreiber und Ihrer Organisation werden die folgenden Vertragsunterlagen vereinbart.</p>${[
    'Gegenstand und Dauer',
    'Art und Zweck der Verarbeitung',
    'Kategorien betroffener Personen',
    'Pflichten des Auftragnehmers',
    'Technische und organisatorische Maßnahmen',
    'Unterauftragsverhältnisse',
    'Rechte der betroffenen Personen',
    'Löschung und Rückgabe',
    'Nachweise und Kontrollen',
    'Haftung und Schlussbestimmungen',
]
    .map((title, index) => section(index + 1, title))
    .join('')}`;

/**
 * How many chapter chips {@link LONG_DPA_HTML} must produce — derived from the
 * fixture itself, so adding a section or changing `section()`'s heading level
 * cannot leave a story asserting a stale number.
 */
export const LONG_DPA_CHAPTER_COUNT = (LONG_DPA_HTML.match(/<h[1-6]\b/g) ?? []).length;

/** A short text without headings — the reader must show no empty chapter row. */
export const PLAIN_DPA_HTML = `<p>${paragraph}</p><p>${paragraph}</p>`;

/** Viewport parameters for the 390x844 phone case used across the DPA stories. */
export const PHONE_390 = {
    parameters: {
        viewport: {
            options: {
                phone390: { name: 'Phone 390×844', styles: { width: '390px', height: '844px' } },
            },
        },
    },
    globals: { viewport: { value: 'phone390', isRotated: false } },
};
