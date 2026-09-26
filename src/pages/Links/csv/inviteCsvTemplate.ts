// Built in the browser: a server-side example is one more thing that can go stale.

/** Header labels in the order the parser reads them (see `INVITE_CSV_COLUMN_ORDER`). */
export interface InviteCsvTemplateLabels {
    email: string;
    firstName: string;
    lastName: string;
    /** Träger-ID on the tenant tab, agency id elsewhere. */
    id: string;
    /** Optional, so an older caller still gets the four-column file. */
    target?: string;
    role?: string;
    template?: string;
    topicPermission?: string;
    alsoCounsellor?: string;
}

/** Sample cell values; they depend on the importing tab. */
export interface InviteCsvTemplateSamples {
    /** The tab's role as the file spells it, e.g. "Berater:in". */
    role: string;
    /** `agency`: rows show an EXISTING agency and a topic permission; `tenant`: new Träger only. */
    idKind: 'tenant' | 'agency';
}

// Semicolon-separated with a BOM: German Excel opens that as a table, and the parser detects `;`.
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
        header.push(
            labels.target ?? '',
            labels.role ?? '',
            labels.template ?? '',
            labels.topicPermission ?? '',
            labels.alsoCounsellor ?? '',
        );
        // A new Beratungsstelle is founded by its BST-Admin row; counsellor rows with the same number wait for it.
        rows =
            samples.idKind === 'agency'
                ? [
                      ['anna.beispiel@traeger.de', 'Anna', 'Beispiel', '42', 'bestehend', samples.role, '', 'NONE', ''],
                      ['bernd.muster@traeger.de', 'Bernd', 'Muster', '900', 'neu', 'BST-Admin', '', '', 'ja'],
                      ['carla.test@traeger.de', 'Carla', 'Test', '900', 'neu', samples.role, '', 'SELECT_EXISTING', ''],
                      ['dora.probe@traeger.de', 'Dora', 'Probe', '42', 'bestehend', samples.role, '', 'true', ''],
                  ]
                : [
                      ['anna.beispiel@traeger.de', 'Anna', 'Beispiel', '42', 'neu', samples.role, '', '', ''],
                      ['bernd.muster@traeger.de', 'Bernd', 'Muster', '', 'neu', samples.role, '', '', ''],
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
