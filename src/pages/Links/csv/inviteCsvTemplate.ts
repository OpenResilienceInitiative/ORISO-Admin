/*
 * The example file behind "CSV-Vorlage herunterladen" (#315 follow-up, #1026):
 * the import reads a fixed column ORDER (or matches the header), and the
 * fastest way to say that is to hand the admin a file that already has it.
 * Built in the browser — an example that has to survive a backend round-trip is
 * one more thing that can be out of date when someone opens it.
 */

/** Header labels in the order the parser reads them (see `INVITE_CSV_COLUMN_ORDER`). */
export interface InviteCsvTemplateLabels {
    email: string;
    firstName: string;
    lastName: string;
    /** Träger-ID on the tenant tab, agency id elsewhere. */
    id: string;
    /** #1026 columns — optional so an older caller still gets the four-column file. */
    target?: string;
    role?: string;
    template?: string;
    topicPermission?: string;
}

/** Sample cell values for the #1026 columns; they depend on the importing tab. */
export interface InviteCsvTemplateSamples {
    /** The tab's role as the file spells it, e.g. "Berater:in". */
    role: string;
    /** `agency`: rows show an EXISTING agency and a topic permission; `tenant`: new Träger only. */
    idKind: 'tenant' | 'agency';
}

/**
 * Semicolon-separated with a BOM: that is what German Excel opens as a table
 * instead of one wide column, and the parser detects `;` on its own. The sample
 * rows show every shape a column takes — an existing unit by number, a new one
 * with an empty number, the template column left empty (= the template chosen
 * in the bar), and the topic permission as enum and as plain true/false.
 */
export const buildInviteCsvTemplate = (labels: InviteCsvTemplateLabels, samples?: InviteCsvTemplateSamples): string => {
    const extended = samples != null && labels.target != null;
    const header = [labels.email, labels.firstName, labels.lastName, labels.id];
    let rows: string[][];
    if (!extended) {
        rows = [
            ['anna.beispiel@traeger.de', 'Anna', 'Beispiel', '42'],
            ['bernd.muster@traeger.de', 'Bernd', 'Muster', ''],
        ];
    } else {
        header.push(labels.target ?? '', labels.role ?? '', labels.template ?? '', labels.topicPermission ?? '');
        rows =
            samples.idKind === 'agency'
                ? [
                      ['anna.beispiel@traeger.de', 'Anna', 'Beispiel', '42', 'bestehend', samples.role, '', 'NONE'],
                      ['bernd.muster@traeger.de', 'Bernd', 'Muster', '', 'neu', samples.role, '', 'SELECT_EXISTING'],
                      ['carla.test@traeger.de', 'Carla', 'Test', '42', 'bestehend', samples.role, '', 'true'],
                  ]
                : [
                      ['anna.beispiel@traeger.de', 'Anna', 'Beispiel', '42', 'neu', samples.role, '', ''],
                      ['bernd.muster@traeger.de', 'Bernd', 'Muster', '', 'neu', samples.role, '', ''],
                  ];
    }
    return `\ufeff${[header, ...rows].map((cells) => cells.join(';')).join('\r\n')}\r\n`;
};

/** Triggers the browser download without touching the DOM the app renders. */
export const downloadInviteCsvTemplate = (
    labels: InviteCsvTemplateLabels,
    fileName: string,
    samples?: InviteCsvTemplateSamples,
) => {
    const blob = new Blob([buildInviteCsvTemplate(labels, samples)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};
