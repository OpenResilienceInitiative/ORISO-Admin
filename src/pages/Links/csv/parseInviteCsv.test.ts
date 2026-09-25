import { describe, expect, it } from 'vitest';
import { assignBatchTenantIds, detectInviteCsvDelimiter, parseInviteCsv } from './parseInviteCsv';

describe('parseInviteCsv', () => {
    it('parses comma-separated rows in the fixed column order', () => {
        const result = parseInviteCsv('maria@example.org,Maria,Huber,12\npeter@example.org,Peter,Maier\n');

        expect(result.delimiter).toBe(',');
        expect(result.headerSkipped).toBe(false);
        expect(result.rejected).toEqual([]);
        expect(result.rows).toEqual([
            {
                line: 1,
                email: 'maria@example.org',
                firstName: 'Maria',
                lastName: 'Huber',
                id: 12,
                missingName: false,
            },
            {
                line: 2,
                email: 'peter@example.org',
                firstName: 'Peter',
                lastName: 'Maier',
                id: undefined,
                missingName: false,
            },
        ]);
    });

    it('auto-detects semicolons (German spreadsheet exports)', () => {
        const result = parseInviteCsv('maria@example.org;Maria;Huber;3\r\npeter@example.org;Peter;Maier;\r\n');

        expect(result.delimiter).toBe(';');
        expect(result.rows.map((row) => row.id)).toEqual([3, undefined]);
    });

    it('strips a UTF-8 BOM before parsing', () => {
        const result = parseInviteCsv('\uFEFFmaria@example.org,Maria,Huber');

        expect(result.headerSkipped).toBe(false);
        expect(result.rows[0].email).toBe('maria@example.org');
    });

    it('handles quoted fields with embedded delimiters, escaped quotes and line breaks', () => {
        const result = parseInviteCsv(
            '"maria@example.org","Maria, geb. ""Mia""","Huber\nvon Berg",7\npeter@example.org,Peter,Maier',
        );

        expect(result.rows[0]).toEqual({
            line: 1,
            email: 'maria@example.org',
            firstName: 'Maria, geb. "Mia"',
            lastName: 'Huber\nvon Berg',
            id: 7,
            missingName: false,
        });
        // The quoted line break consumed a physical line — the next record starts on line 3.
        expect(result.rows[1].line).toBe(3);
    });

    it('skips a header row when the first cell is not email-shaped', () => {
        const result = parseInviteCsv('Email,First Name,Name,Tenant ID\nmaria@example.org,Maria,Huber,4');

        expect(result.headerSkipped).toBe(true);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toMatchObject({ line: 2, email: 'maria@example.org', id: 4 });
    });

    it('does not treat a merely invalid first e-mail as a header (surfaces it as a rejection)', () => {
        const result = parseInviteCsv('not-an-email,Peter,Maier\nmaria@example.org,Maria,Huber');

        expect(result.headerSkipped).toBe(false);
        expect(result.rejected).toMatchObject([
            { line: 1, cells: ['not-an-email', 'Peter', 'Maier'], reason: 'invalidEmail' },
        ]);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toMatchObject({ line: 2, email: 'maria@example.org' });
    });

    it('rejects a tenant id that overflows a safe integer (Infinity → null downstream)', () => {
        const result = parseInviteCsv(`maria@example.org,Maria,Huber,${'9'.repeat(400)}`);

        expect(result.rows).toEqual([]);
        expect(result.rejected.map((row) => row.reason)).toEqual(['invalidId']);
    });

    it('keeps rows with missing names importable but flags them', () => {
        const result = parseInviteCsv('maria@example.org,,,\npeter@example.org,Peter,,9');

        expect(result.rejected).toEqual([]);
        expect(result.rows).toEqual([
            {
                line: 1,
                email: 'maria@example.org',
                firstName: '',
                lastName: '',
                id: undefined,
                missingName: true,
            },
            { line: 2, email: 'peter@example.org', firstName: 'Peter', lastName: '', id: 9, missingName: true },
        ]);
    });

    it('rejects invalid emails with their line number and reason', () => {
        const result = parseInviteCsv('maria@example.org,Maria,Huber\nnot-an-email,Peter,Maier\n@broken,Ida,Klein');

        expect(result.rows).toHaveLength(1);
        expect(result.rejected).toMatchObject([
            { line: 2, cells: ['not-an-email', 'Peter', 'Maier'], reason: 'invalidEmail' },
            { line: 3, cells: ['@broken', 'Ida', 'Klein'], reason: 'invalidEmail' },
        ]);
    });

    it('rejects rows whose 4th column is not a positive integer', () => {
        const result = parseInviteCsv('maria@example.org,Maria,Huber,abc\npeter@example.org,Peter,Maier,0');

        expect(result.rows).toEqual([]);
        expect(result.rejected.map((row) => row.reason)).toEqual(['invalidId', 'invalidId']);
    });

    it('ignores trailing and interspersed empty lines', () => {
        const result = parseInviteCsv('maria@example.org,Maria,Huber\n\npeter@example.org,Peter,Maier\n\n\n');

        expect(result.rows.map((row) => row.email)).toEqual(['maria@example.org', 'peter@example.org']);
    });

    it('returns empty results for an empty file', () => {
        expect(parseInviteCsv('')).toMatchObject({ rows: [], rejected: [], delimiter: ',', headerSkipped: false });
        expect(parseInviteCsv('\uFEFF\n\n').rows).toEqual([]);
    });
});

describe('parseInviteCsv — Ziel, Rolle, Vorlage and Themen & Fachbereiche', () => {
    const HEADER = 'E-Mail;Vorname;Name;Beratungsstellen-ID;Ziel;Rolle;Vorlage;Themen & Fachbereiche';

    it('reads all eight columns of the example file', () => {
        const result = parseInviteCsv(
            `${HEADER}\r\nanna@x.de;Anna;Beispiel;42;bestehend;Berater:in;Standard;SELECT_EXISTING\r\nbernd@x.de;Bernd;Muster;;neu;BST-Admin;;\r\n`,
        );
        expect(result.rejected).toEqual([]);
        expect(result.rows[0]).toMatchObject({
            id: 42,
            target: 'EXISTING',
            role: 'COUNSELLOR',
            template: 'Standard',
            topicPermission: 'SELECT_EXISTING',
        });
        expect(result.rows[1]).toMatchObject({ target: 'NEW', role: 'AGENCY_ADMIN' });
        expect(result.rows[1].template).toBeUndefined();
        expect(result.rows[1].topicPermission).toBeUndefined();
    });

    it.each([
        ['true', 'CREATE'],
        ['FALSE', 'NONE'],
        ['ja', 'CREATE'],
        ['nein', 'NONE'],
        ['none', 'NONE'],
        ['Select_Existing', 'SELECT_EXISTING'],
        ['CREATE', 'CREATE'],
    ])('accepts topic permission %s as %s', (raw, expected) => {
        const result = parseInviteCsv(`a@x.de;A;B;;;;;${raw}`);
        expect(result.rows[0].topicPermission).toBe(expected);
    });

    it.each([
        ['a@x.de;A;B;;vielleicht', 'invalidMode'],
        ['a@x.de;A;B;;bestehend', 'existingWithoutId'],
        ['a@x.de;A;B;;;Chef', 'invalidRole'],
        ['a@x.de;A;B;;;;;manchmal', 'invalidTopicPermission'],
    ])('rejects %s with %s', (line, reason) => {
        const result = parseInviteCsv(line);
        expect(result.rows).toEqual([]);
        expect(result.rejected[0]).toMatchObject({ line: 1, reason, email: 'a@x.de', firstName: 'A', lastName: 'B' });
    });

    it('matches columns by header, in any order and with columns left out', () => {
        const result = parseInviteCsv('E-Mail;Rolle;Themen;Vorname\r\nc@x.de;Träger-Admin;false;Carla\r\n');
        expect(result.columns).toEqual(['email', 'firstName', 'role', 'topicPermission']);
        expect(result.rows[0]).toMatchObject({
            firstName: 'Carla',
            lastName: '',
            role: 'TENANT_ADMIN',
            topicPermission: 'NONE',
        });
        expect(result.rows[0].id).toBeUndefined();
    });

    it('keeps reading an old four-column file with a custom ID header by position', () => {
        const result = parseInviteCsv('E-Mail;Vorname;Name;Träger-Nummer\r\nd@x.de;D;E;7\r\n');
        expect(result.rows[0]).toMatchObject({ id: 7 });
        expect(result.rows[0].target).toBeUndefined();
    });

    it('reads an unknown extra column as nothing, not by its position', () => {
        const result = parseInviteCsv(
            'E-Mail;Vorname;Name;ID;Telefon;Ziel;Rolle;Bemerkung\r\nd@x.de;D;E;7;0170 1;bestehend;Berater:in;ja\r\n',
        );
        expect(result.rows[0]).toMatchObject({ id: 7, target: 'EXISTING' });
        // "ja" in an unlabelled 8th column must not turn into "may create topics".
        expect(result.rows[0].topicPermission).toBeUndefined();
        expect(result.columns).not.toContain('topicPermission');
    });

    it('lets a recognised ID header win over an unknown header that sits in the ID position', () => {
        const result = parseInviteCsv(
            'E-Mail;Vorname;Name;Bemerkung;Beratungsstellen-ID;Ziel\r\nd@x.de;D;E;99;7;bestehend\r\n',
        );
        expect(result.rows[0]).toMatchObject({ id: 7, target: 'EXISTING' });
    });
});

describe('detectInviteCsvDelimiter', () => {
    it('ignores delimiters inside quoted cells', () => {
        // Three quoted commas vs. two real semicolons — the semicolon still wins.
        expect(detectInviteCsvDelimiter('"a,b,c,d";x;y')).toBe(';');
    });

    it('falls back to comma on ties', () => {
        expect(detectInviteCsvDelimiter('plain text without separators')).toBe(',');
    });
});

describe('assignBatchTenantIds', () => {
    it('assigns consecutive free ids, skipping taken ids, explicit ids and earlier batch ids', () => {
        const assigned = assignBatchTenantIds(
            [
                { line: 1 }, // -> 3 (1, 2 taken)
                { line: 2, id: 5 }, // explicit
                { line: 3 }, // -> 6 (4 taken, 5 explicit)
                { line: 4 }, // -> 7
            ],
            new Set([1, 2, 4]),
        );

        expect([...assigned.entries()]).toEqual([
            [1, 3],
            [2, 5],
            [3, 6],
            [4, 7],
        ]);
    });

    it('skips a later explicit id even for rows assigned before it', () => {
        const assigned = assignBatchTenantIds([{ line: 1 }, { line: 2, id: 1 }], new Set());

        expect(assigned.get(1)).toBe(2);
        expect(assigned.get(2)).toBe(1);
    });
});
