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

/** The columns each tab imports: topics and "Berät auch" exist only for agency invites. */
export const inviteCsvColumnsForTab = (tab: 'tenant' | 'counsellor'): Array<keyof InviteCsvTemplateLabels> => {
    const shared: Array<keyof InviteCsvTemplateLabels> = [
        'email',
        'firstName',
        'lastName',
        'id',
        'target',
        'role',
        'template',
    ];
    return tab === 'tenant' ? shared : [...shared, 'topicPermission', 'alsoCounsellor'];
};

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
        header.push(labels.target ?? '', labels.role ?? '', labels.template ?? '');
        // Only the columns the tab takes; a missing label drops its cells too.
        const optional = [labels.topicPermission, labels.alsoCounsellor];
        optional.forEach((label) => label != null && header.push(label));
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
    const width = header.length;
    return `\ufeff${[header, ...rows.map((cells) => cells.slice(0, width))]
        .map((cells) => cells.join(';'))
        .join('\r\n')}\r\n`;
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
