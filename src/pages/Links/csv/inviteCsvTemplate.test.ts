import { describe, expect, it } from 'vitest';
import { buildInviteCsvTemplate } from './inviteCsvTemplate';
import { detectInviteCsvDelimiter, parseInviteCsv } from './parseInviteCsv';

const LABELS = { email: 'E-Mail', firstName: 'Vorname', lastName: 'Name', id: 'Träger-ID' };

describe('buildInviteCsvTemplate', () => {
    it('is a file the import itself accepts', () => {
        const result = parseInviteCsv(buildInviteCsvTemplate(LABELS));

        // The header row must be recognised as one, not imported as a recipient.
        expect(result.headerSkipped).toBe(true);
        expect(result.rejected).toHaveLength(0);
        expect(result.rows).toHaveLength(2);
        expect(result.rows[0]).toMatchObject({
            email: 'anna.beispiel@traeger.de',
            firstName: 'Anna',
            lastName: 'Beispiel',
            tenantId: 42,
        });
        // Second row shows the id column may stay empty.
        expect(result.rows[1].tenantId).toBeUndefined();
    });

    it('uses the separator German spreadsheets export, with a BOM', () => {
        const csv = buildInviteCsvTemplate(LABELS);

        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(detectInviteCsvDelimiter(csv)).toBe(';');
        expect(csv).toContain('E-Mail;Vorname;Name;Träger-ID');
    });
});
