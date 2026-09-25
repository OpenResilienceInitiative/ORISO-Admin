// A recognised header row matches columns by name, so an admin may reorder or leave them out.
// Id, role and template stay raw here: only the caller knows the tab's id space and templates.

import type { InviteRole, TopicPermission } from '../inviteModel';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * First-cell labels (lower-cased) that mark a header row. Only a *recognised*
 * label is treated as a header — a first row whose e-mail is merely invalid is
 * data and must surface as a rejection, not be silently dropped.
 */
const RECOGNISED_HEADER_FIRST_CELLS = new Set([
    'email',
    'email address',
    'e-mail',
    'e-mail address',
    'e-mailadresse',
    'e-mail-adresse',
    'emailadresse',
    'mail',
    'empfänger',
    'empfänger e-mail',
    'recipient',
    'recipient email',
    'recipients emails',
]);

export type InviteCsvRejectionReason =
    | 'invalidEmail'
    | 'invalidId'
    /** "Ziel" is neither neu/new nor bestehend/existing. */
    | 'invalidMode'
    /** "bestehend" names a unit by its number — without one there is nothing to invite into. */
    | 'existingWithoutId'
    | 'invalidRole'
    | 'invalidTopicPermission';

/** "Ziel": a NEW unit (created with the invite) or an EXISTING one. */
export type InviteCsvTarget = 'NEW' | 'EXISTING';

type ColumnKey = 'email' | 'firstName' | 'lastName' | 'id' | 'target' | 'role' | 'template' | 'topicPermission';

/** Column order of a header-less file (and of the downloadable example). */
export const INVITE_CSV_COLUMN_ORDER: ColumnKey[] = [
    'email',
    'firstName',
    'lastName',
    'id',
    'target',
    'role',
    'template',
    'topicPermission',
];

/** Recognised header labels per column (lower-cased, trimmed). */
const HEADER_LABELS: Record<Exclude<ColumnKey, 'email'>, string[]> = {
    firstName: ['vorname', 'first name', 'firstname', 'first_name'],
    lastName: ['name', 'nachname', 'last name', 'lastname', 'last_name', 'surname'],
    id: [
        'id',
        'nr',
        'nummer',
        'träger-id',
        'traeger-id',
        'träger id',
        'beratungsstellen-id',
        'beratungsstelle-id',
        'bst-id',
        'tenant id',
        'tenant-id',
        'tenantid',
        'agency id',
        'agency-id',
        'agencyid',
    ],
    target: ['ziel', 'modus', 'mode', 'einheit', 'target', 'allocation mode', 'allocationmode'],
    role: ['rolle', 'role'],
    template: ['vorlage', 'e-mail-vorlage', 'template', 'email template'],
    topicPermission: [
        'themen & fachbereiche',
        'themen und fachbereiche',
        'themen',
        'fachbereiche',
        'themen selbst',
        'topicpermission',
        'topic permission',
        'topic_permission',
    ],
};

const normalize = (value: string) => value.trim().toLowerCase();

const TARGET_VALUES: Record<string, InviteCsvTarget> = {
    neu: 'NEW',
    new: 'NEW',
    anlegen: 'NEW',
    auto: 'NEW',
    bestehend: 'EXISTING',
    vorhanden: 'EXISTING',
    existing: 'EXISTING',
};

const ROLE_VALUES: Record<string, InviteRole> = {
    'berater:in': 'COUNSELLOR',
    'berater*in': 'COUNSELLOR',
    berater_in: 'COUNSELLOR',
    beraterin: 'COUNSELLOR',
    berater: 'COUNSELLOR',
    counsellor: 'COUNSELLOR',
    counselor: 'COUNSELLOR',
    'bst-admin': 'AGENCY_ADMIN',
    'beratungsstellen-admin': 'AGENCY_ADMIN',
    agency_admin: 'AGENCY_ADMIN',
    'agency admin': 'AGENCY_ADMIN',
    'träger-admin': 'TENANT_ADMIN',
    'traeger-admin': 'TENANT_ADMIN',
    tenant_admin: 'TENANT_ADMIN',
    'tenant admin': 'TENANT_ADMIN',
};

/** The backend enum, plain true/false and the German yes/no words a spreadsheet user types. */
const TOPIC_PERMISSION_VALUES: Record<string, TopicPermission> = {
    none: 'NONE',
    select_existing: 'SELECT_EXISTING',
    create: 'CREATE',
    true: 'CREATE',
    false: 'NONE',
    ja: 'CREATE',
    nein: 'NONE',
    yes: 'CREATE',
    no: 'NONE',
    '1': 'CREATE',
    '0': 'NONE',
};

export interface ParsedInviteRow {
    /** 1-based physical line number of the record's first line in the file. */
    line: number;
    email: string;
    firstName: string;
    lastName: string;
    /** Explicit id from the ID column; `undefined` = allocated later. */
    id?: number;
    /** "Ziel"; `undefined` = not given, i.e. a NEW unit. */
    target?: InviteCsvTarget;
    /** "Rolle"; `undefined` = the importing tab's role. */
    role?: InviteRole;
    /** "Vorlage" as written (name or number); the caller resolves it against its templates. */
    template?: string;
    /** "Themen & Fachbereiche"; `undefined` = omitted, the server applies SELECT_EXISTING (Q32). */
    topicPermission?: TopicPermission;
    /** First and/or last name empty — still importable (owner decision), just flagged. */
    missingName: boolean;
}

export interface RejectedInviteRow {
    /** 1-based physical line number, shown to the admin next to the reason. */
    line: number;
    /** Raw cells so the preview can still display what was in the file. */
    cells: string[];
    /** The e-mail and name cells as the header mapped them (the raw cells may be reordered). */
    email?: string;
    firstName?: string;
    lastName?: string;
    reason: InviteCsvRejectionReason;
}

export interface ParseInviteCsvResult {
    rows: ParsedInviteRow[];
    rejected: RejectedInviteRow[];
    delimiter: ',' | ';';
    headerSkipped: boolean;
    /** Header-matched files: the columns that were found (for the preview's hint). */
    columns?: ColumnKey[];
}

const stripBom = (text: string) => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

/**
 * Auto-detects the delimiter per file: whichever of `,` / `;` occurs more often
 * outside quoted sections wins (ties and delimiter-free files fall back to `,`).
 * German spreadsheet exports typically use `;`, RFC 4180 files use `,`.
 */
export const detectInviteCsvDelimiter = (text: string): ',' | ';' => {
    let inQuotes = false;
    let commas = 0;
    let semicolons = 0;
    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (char === '"') {
            if (inQuotes && text[i + 1] === '"') {
                i += 1; // escaped quote inside a quoted cell
            } else {
                inQuotes = !inQuotes;
            }
        } else if (!inQuotes) {
            if (char === ',') commas += 1;
            else if (char === ';') semicolons += 1;
        }
    }
    return semicolons > commas ? ';' : ',';
};

interface CsvRecord {
    line: number;
    cells: string[];
}

/**
 * Minimal RFC-4180-style tokenizer: quoted cells may contain the delimiter,
 * escaped quotes (`""`) and even line breaks; records end on CRLF, LF or a
 * bare CR. Physical line numbers are tracked for the rejection display.
 */
const tokenize = (text: string, delimiter: ',' | ';'): CsvRecord[] => {
    const records: CsvRecord[] = [];
    let cells: string[] = [];
    let cell = '';
    let inQuotes = false;
    let line = 1;
    let recordLine = 1;

    const endCell = () => {
        cells.push(cell);
        cell = '';
    };
    const endRecord = () => {
        endCell();
        records.push({ line: recordLine, cells });
        cells = [];
    };

    for (let i = 0; i < text.length; i += 1) {
        const char = text[i];
        if (inQuotes) {
            if (char === '"') {
                if (text[i + 1] === '"') {
                    cell += '"';
                    i += 1;
                } else {
                    inQuotes = false;
                }
            } else {
                // Count physical lines inside a quoted cell: LF, or a bare CR that
                // is not part of a CRLF pair (old-Mac breaks) — for accurate line nrs.
                if (char === '\n' || (char === '\r' && text[i + 1] !== '\n')) line += 1;
                cell += char;
            }
        } else if (char === '"') {
            inQuotes = true;
        } else if (char === delimiter) {
            endCell();
        } else if (char === '\r' || char === '\n') {
            if (char === '\r' && text[i + 1] === '\n') i += 1;
            endRecord();
            line += 1;
            recordLine = line;
        } else {
            cell += char;
        }
    }
    if (cell !== '' || cells.length > 0) {
        endRecord(); // file without trailing newline
    }
    return records;
};

/**
 * Parses invite CSV content (already read client-side — the file itself is
 * never uploaded). Robustness: BOM strip, `,`/`;` auto-detect, quoted fields,
 * CRLF/LF/CR, trailing/interspersed empty lines, header auto-detect (the first
 * row is skipped only when its first cell is a recognised header label).
 */
export const parseInviteCsv = (text: string): ParseInviteCsvResult => {
    const content = stripBom(text);
    const delimiter = detectInviteCsvDelimiter(content);
    const records = tokenize(content, delimiter).filter((record) => record.cells.some((c) => c.trim() !== ''));

    let headerSkipped = false;
    let dataRecords = records;
    let columnIndex: Partial<Record<ColumnKey, number>> = Object.fromEntries(
        INVITE_CSV_COLUMN_ORDER.map((key, index) => [key, index]),
    );
    if (records.length > 0 && RECOGNISED_HEADER_FIRST_CELLS.has(normalize(records[0].cells[0] ?? ''))) {
        headerSkipped = true;
        dataRecords = records.slice(1);
        // An unrecognised header cell keeps its fixed position, so an old custom ID
        // label ("Träger-Nummer") still reads its 4th column as the ID.
        columnIndex = { email: 0 };
        records[0].cells.forEach((cell, index) => {
            if (index === 0) return;
            const label = normalize(cell);
            const key = (Object.keys(HEADER_LABELS) as Array<Exclude<ColumnKey, 'email'>>).find((candidate) =>
                HEADER_LABELS[candidate].includes(label),
            );
            const resolved = key ?? INVITE_CSV_COLUMN_ORDER[index];
            if (resolved && columnIndex[resolved] == null) columnIndex[resolved] = index;
        });
    }
    const columns = INVITE_CSV_COLUMN_ORDER.filter((key) => columnIndex[key] != null);

    const rows: ParsedInviteRow[] = [];
    const rejected: RejectedInviteRow[] = [];

    dataRecords.forEach((record) => {
        const cell = (key: ColumnKey) => {
            const index = columnIndex[key];
            return index == null ? '' : (record.cells[index] ?? '').trim();
        };
        const reject = (reason: InviteCsvRejectionReason) =>
            rejected.push({
                line: record.line,
                cells: record.cells,
                reason,
                email: cell('email'),
                firstName: cell('firstName'),
                lastName: cell('lastName'),
            });

        const email = cell('email');
        const firstName = cell('firstName');
        const lastName = cell('lastName');
        const idRaw = cell('id');
        const targetRaw = normalize(cell('target'));
        const roleRaw = normalize(cell('role'));
        const template = cell('template');
        const topicRaw = normalize(cell('topicPermission'));

        if (!EMAIL_PATTERN.test(email)) {
            reject('invalidEmail');
            return;
        }
        const id = idRaw === '' ? undefined : Number(idRaw);
        // Positive *safe* integer only: `/^\d+$/` alone accepts huge values that
        // Number() turns into Infinity, which JSON-serialises to null downstream.
        if (idRaw !== '' && !(/^\d+$/.test(idRaw) && Number.isSafeInteger(id) && (id as number) >= 1)) {
            reject('invalidId');
            return;
        }
        const target = targetRaw === '' ? undefined : TARGET_VALUES[targetRaw];
        if (targetRaw !== '' && target == null) {
            reject('invalidMode');
            return;
        }
        if (target === 'EXISTING' && id == null) {
            reject('existingWithoutId');
            return;
        }
        const role = roleRaw === '' ? undefined : ROLE_VALUES[roleRaw];
        if (roleRaw !== '' && role == null) {
            reject('invalidRole');
            return;
        }
        const topicPermission = topicRaw === '' ? undefined : TOPIC_PERMISSION_VALUES[topicRaw];
        if (topicRaw !== '' && topicPermission == null) {
            reject('invalidTopicPermission');
            return;
        }

        rows.push({
            line: record.line,
            email,
            firstName,
            lastName,
            id,
            target,
            role,
            template: template || undefined,
            topicPermission,
            missingName: firstName === '' || lastName === '',
        });
    });

    return { rows, rejected, delimiter, headerSkipped, columns };
};

export interface TenantIdAssignable {
    line: number;
    id?: number;
}

/**
 * Batch continuation of the composer's free-Träger-ID suggestion: rows without
 * an explicit id get consecutive free ids starting at 1, skipping ids already
 * taken (existing tenants + active invites) AND ids claimed by other rows of
 * the same batch — explicit ids anywhere in the file as well as ids assigned
 * to earlier rows. Returns a map keyed by the row's line number.
 */
export const assignBatchTenantIds = (rows: TenantIdAssignable[], takenIds: Iterable<number>): Map<number, number> => {
    const used = new Set(takenIds);
    rows.forEach((row) => {
        if (row.id != null) used.add(row.id);
    });

    const assigned = new Map<number, number>();
    let candidate = 1;
    rows.forEach((row) => {
        if (row.id != null) {
            assigned.set(row.line, row.id);
            return;
        }
        while (used.has(candidate)) candidate += 1;
        assigned.set(row.line, candidate);
        used.add(candidate);
    });
    return assigned;
};
