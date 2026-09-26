import { describe, expect, it } from 'vitest';
import { buildInviteCsvTemplate, inviteCsvColumnsForTab } from './inviteCsvTemplate';
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
            id: 42,
        });
        // Second row shows the id column may stay empty.
        expect(result.rows[1].id).toBeUndefined();
    });

    it('uses the separator German spreadsheets export, with a BOM', () => {
        const csv = buildInviteCsvTemplate(LABELS);

        expect(csv.charCodeAt(0)).toBe(0xfeff);
        expect(detectInviteCsvDelimiter(csv)).toBe(';');
        expect(csv).toContain('E-Mail;Vorname;Name;Träger-ID');
    });
});

describe('buildInviteCsvTemplate — extended columns', () => {
    const FULL = {
        email: 'E-Mail',
        firstName: 'Vorname',
        lastName: 'Name',
        id: 'Beratungsstellen-ID',
        target: 'Ziel',
        role: 'Rolle',
        template: 'Vorlage',
        topicPermission: 'Themen & Fachbereiche',
        alsoCounsellor: 'Berät auch',
    };

    it('the agency example imports cleanly with every new column, founding admin row included', () => {
        const csv = buildInviteCsvTemplate(FULL, { role: 'Berater:in', idKind: 'agency' });
        expect(csv).toContain(
            'E-Mail;Vorname;Name;Beratungsstellen-ID;Ziel;Rolle;Vorlage;Themen & Fachbereiche;Berät auch',
        );
        const result = parseInviteCsv(csv);
        expect(result.rejected).toHaveLength(0);
        expect(
            result.rows.map((row) => [row.id, row.target, row.role, row.topicPermission, row.alsoCounsellor]),
        ).toEqual([
            [42, 'EXISTING', 'COUNSELLOR', 'NONE', undefined],
            // A new Beratungsstelle: its BST-Admin row founds it, the counsellor row waits for it.
            [900, 'NEW', 'AGENCY_ADMIN', undefined, true],
            [900, 'NEW', 'COUNSELLOR', 'SELECT_EXISTING', undefined],
            [42, 'EXISTING', 'COUNSELLOR', 'CREATE', undefined],
        ]);
    });

    it('the Träger example creates new Träger only and leaves the topic column empty', () => {
        const result = parseInviteCsv(
            buildInviteCsvTemplate({ ...FULL, id: 'Träger-ID' }, { role: 'Träger-Admin', idKind: 'tenant' }),
        );
        expect(result.rejected).toHaveLength(0);
        expect(result.rows.every((row) => row.target === 'NEW' && row.role === 'TENANT_ADMIN')).toBe(true);
        expect(result.rows.every((row) => row.topicPermission === undefined)).toBe(true);
    });

    it('offers each tab only the columns its import accepts', () => {
        expect(inviteCsvColumnsForTab('tenant')).toEqual([
            'email',
            'firstName',
            'lastName',
            'id',
            'target',
            'role',
            'template',
        ]);
        expect(inviteCsvColumnsForTab('counsellor')).toEqual([
            'email',
            'firstName',
            'lastName',
            'id',
            'target',
            'role',
            'template',
            'topicPermission',
            'alsoCounsellor',
        ]);
    });

    it('leaves out the columns a tab does not take', () => {
        const { topicPermission, alsoCounsellor, ...tenantLabels } = { ...FULL, id: 'Träger-ID' };
        const csv = buildInviteCsvTemplate(tenantLabels, { role: 'Träger-Admin', idKind: 'tenant' });
        expect(csv).toContain('E-Mail;Vorname;Name;Träger-ID;Ziel;Rolle;Vorlage\r\n');
        expect(csv).not.toContain(topicPermission);
        expect(csv).not.toContain(alsoCounsellor);
        expect(parseInviteCsv(csv).rejected).toHaveLength(0);
    });
});
