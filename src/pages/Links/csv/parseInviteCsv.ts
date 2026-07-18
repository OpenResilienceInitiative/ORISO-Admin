/*
 * Dependency-free CSV parser for the invite import (#315, Figma 1165:17005
 * "Import CSV File"). Fixed column order per the Figma annotation:
 * Email, First Name, Name (last name), Tenant/Counselor ID (optional 4th).
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type InviteCsvRejectionReason = 'invalidEmail' | 'invalidTenantId';

export interface ParsedInviteRow {
    /** 1-based physical line number of the record's first line in the file. */
    line: number;
    email: string;
    firstName: string;
    lastName: string;
    /** Explicit id from the 4th column; `undefined` = auto-populate later. */
    tenantId?: number;
    /** First and/or last name empty — still importable (owner decision), just flagged. */
    missingName: boolean;
}

export interface RejectedInviteRow {
    /** 1-based physical line number, shown to the admin next to the reason. */
    line: number;
    /** Raw cells so the preview can still display what was in the file. */
    cells: string[];
    reason: InviteCsvRejectionReason;
}

export interface ParseInviteCsvResult {
    rows: ParsedInviteRow[];
    rejected: RejectedInviteRow[];
    delimiter: ',' | ';';
    headerSkipped: boolean;
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
                if (char === '\n') line += 1;
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
 * row is skipped when its first cell is not email-shaped).
 */
export const parseInviteCsv = (text: string): ParseInviteCsvResult => {
    const content = stripBom(text);
    const delimiter = detectInviteCsvDelimiter(content);
    const records = tokenize(content, delimiter).filter((record) => record.cells.some((c) => c.trim() !== ''));

    let headerSkipped = false;
    let dataRecords = records;
    if (records.length > 0 && !EMAIL_PATTERN.test((records[0].cells[0] ?? '').trim())) {
        headerSkipped = true;
        dataRecords = records.slice(1);
    }

    const rows: ParsedInviteRow[] = [];
    const rejected: RejectedInviteRow[] = [];

    dataRecords.forEach((record) => {
        const email = (record.cells[0] ?? '').trim();
        const firstName = (record.cells[1] ?? '').trim();
        const lastName = (record.cells[2] ?? '').trim();
        const tenantRaw = (record.cells[3] ?? '').trim();

        if (!EMAIL_PATTERN.test(email)) {
            rejected.push({ line: record.line, cells: record.cells, reason: 'invalidEmail' });
            return;
        }
        if (tenantRaw !== '' && !(/^\d+$/.test(tenantRaw) && Number(tenantRaw) >= 1)) {
            rejected.push({ line: record.line, cells: record.cells, reason: 'invalidTenantId' });
            return;
        }

        rows.push({
            line: record.line,
            email,
            firstName,
            lastName,
            tenantId: tenantRaw === '' ? undefined : Number(tenantRaw),
            missingName: firstName === '' || lastName === '',
        });
    });

    return { rows, rejected, delimiter, headerSkipped };
};

export interface TenantIdAssignable {
    line: number;
    tenantId?: number;
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
        if (row.tenantId != null) used.add(row.tenantId);
    });

    const assigned = new Map<number, number>();
    let candidate = 1;
    rows.forEach((row) => {
        if (row.tenantId != null) {
            assigned.set(row.line, row.tenantId);
            return;
        }
        while (used.has(candidate)) candidate += 1;
        assigned.set(row.line, candidate);
        used.add(candidate);
    });
    return assigned;
};
