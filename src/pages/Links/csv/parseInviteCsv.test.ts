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
                tenantId: 12,
                missingName: false,
            },
            {
                line: 2,
                email: 'peter@example.org',
                firstName: 'Peter',
                lastName: 'Maier',
                tenantId: undefined,
                missingName: false,
            },
        ]);
    });

    it('auto-detects semicolons (German spreadsheet exports)', () => {
        const result = parseInviteCsv('maria@example.org;Maria;Huber;3\r\npeter@example.org;Peter;Maier;\r\n');

        expect(result.delimiter).toBe(';');
        expect(result.rows.map((row) => row.tenantId)).toEqual([3, undefined]);
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
            tenantId: 7,
            missingName: false,
        });
        // The quoted line break consumed a physical line — the next record starts on line 3.
        expect(result.rows[1].line).toBe(3);
    });

    it('skips a header row when the first cell is not email-shaped', () => {
        const result = parseInviteCsv('Email,First Name,Name,Tenant ID\nmaria@example.org,Maria,Huber,4');

        expect(result.headerSkipped).toBe(true);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toMatchObject({ line: 2, email: 'maria@example.org', tenantId: 4 });
    });

    it('does not treat a merely invalid first e-mail as a header (surfaces it as a rejection)', () => {
        const result = parseInviteCsv('not-an-email,Peter,Maier\nmaria@example.org,Maria,Huber');

        expect(result.headerSkipped).toBe(false);
        expect(result.rejected).toEqual([
            { line: 1, cells: ['not-an-email', 'Peter', 'Maier'], reason: 'invalidEmail' },
        ]);
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toMatchObject({ line: 2, email: 'maria@example.org' });
    });

    it('rejects a tenant id that overflows a safe integer (Infinity → null downstream)', () => {
        const result = parseInviteCsv(`maria@example.org,Maria,Huber,${'9'.repeat(400)}`);

        expect(result.rows).toEqual([]);
        expect(result.rejected.map((row) => row.reason)).toEqual(['invalidTenantId']);
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
                tenantId: undefined,
                missingName: true,
            },
            { line: 2, email: 'peter@example.org', firstName: 'Peter', lastName: '', tenantId: 9, missingName: true },
        ]);
    });

    it('rejects invalid emails with their line number and reason', () => {
        const result = parseInviteCsv('maria@example.org,Maria,Huber\nnot-an-email,Peter,Maier\n@broken,Ida,Klein');

        expect(result.rows).toHaveLength(1);
        expect(result.rejected).toEqual([
            { line: 2, cells: ['not-an-email', 'Peter', 'Maier'], reason: 'invalidEmail' },
            { line: 3, cells: ['@broken', 'Ida', 'Klein'], reason: 'invalidEmail' },
        ]);
    });

    it('rejects rows whose 4th column is not a positive integer', () => {
        const result = parseInviteCsv('maria@example.org,Maria,Huber,abc\npeter@example.org,Peter,Maier,0');

        expect(result.rows).toEqual([]);
        expect(result.rejected.map((row) => row.reason)).toEqual(['invalidTenantId', 'invalidTenantId']);
    });

    it('ignores trailing and interspersed empty lines', () => {
        const result = parseInviteCsv('maria@example.org,Maria,Huber\n\npeter@example.org,Peter,Maier\n\n\n');

        expect(result.rows.map((row) => row.email)).toEqual(['maria@example.org', 'peter@example.org']);
    });

    it('returns empty results for an empty file', () => {
        expect(parseInviteCsv('')).toEqual({ rows: [], rejected: [], delimiter: ',', headerSkipped: false });
        expect(parseInviteCsv('\uFEFF\n\n').rows).toEqual([]);
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
                { line: 2, tenantId: 5 }, // explicit
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
        const assigned = assignBatchTenantIds([{ line: 1 }, { line: 2, tenantId: 1 }], new Set());

        expect(assigned.get(1)).toBe(2);
        expect(assigned.get(2)).toBe(1);
    });
});
