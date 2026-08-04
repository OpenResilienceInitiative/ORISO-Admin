/*
 * The example file behind "CSV-Vorlage herunterladen" (#315 follow-up): the
 * import expects a fixed column ORDER, and the fastest way to say that is to
 * hand the admin a file that already has it. Built in the browser — an example
 * that has to survive a backend round-trip is one more thing that can be out of
 * date when someone opens it.
 */

/** Column order the parser reads (see `parseInviteCsv`); the 4th is optional. */
export interface InviteCsvTemplateLabels {
    email: string;
    firstName: string;
    lastName: string;
    /** Träger-ID on the tenant tab, agency id elsewhere. */
    id: string;
}

/**
 * Semicolon-separated with a BOM: that is what German Excel opens as a table
 * instead of one wide column, and the parser detects `;` on its own. The two
 * sample rows show both shapes the id column takes — a value and empty.
 */
export const buildInviteCsvTemplate = (labels: InviteCsvTemplateLabels): string => {
    const rows = [
        [labels.email, labels.firstName, labels.lastName, labels.id],
        ['anna.beispiel@traeger.de', 'Anna', 'Beispiel', '42'],
        ['bernd.muster@traeger.de', 'Bernd', 'Muster', ''],
    ];
    return `\ufeff${rows.map((cells) => cells.join(';')).join('\r\n')}\r\n`;
};

/** Triggers the browser download without touching the DOM the app renders. */
export const downloadInviteCsvTemplate = (labels: InviteCsvTemplateLabels, fileName: string) => {
    const blob = new Blob([buildInviteCsvTemplate(labels)], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(url);
};
