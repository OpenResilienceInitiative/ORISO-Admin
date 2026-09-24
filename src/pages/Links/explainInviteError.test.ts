import { describe, expect, it } from 'vitest';
import { FETCH_ERRORS } from '../../api/fetchData';
import { explainInviteError, type InviteErrorContext } from './explainInviteError';

const t = ((key: string, fallback?: string, options?: Record<string, unknown>) => {
    let text = fallback ?? key;
    Object.entries(options ?? {}).forEach(([name, value]) => {
        text = text.replaceAll(`{{${name}}}`, String(value));
    });
    return text;
}) as InviteErrorContext['t'];

const response = (status: number, { reason, body }: { reason?: string; body?: unknown } = {}) =>
    new Response(body === undefined ? null : JSON.stringify(body), {
        status,
        headers: reason ? { 'X-Reason': reason } : {},
    });

const create: InviteErrorContext = { t, action: 'create', role: 'COUNSELLOR', idKind: 'agency' };

describe('explainInviteError', () => {
    it.each([
        ['NO_PENDING_UNIT_ADMIN', /keine BST-Admin-Einladung offen/, 'Keine BST-Admin für diese neue Beratungsstelle'],
        ['UNIT_NOT_CREATED', /noch nicht angelegt/, 'Beratungsstelle noch nicht angelegt'],
        ['SELF_ASSIGNMENT_ALREADY_EXISTS', /bereits in dieser Rolle eingetragen/, 'Bereits eingetragen'],
    ])('explains 409 %s', async (reason, message, label) => {
        const explained = await explainInviteError(response(409, { reason }), create);
        expect(explained.message).toMatch(message);
        expect(explained.label).toBe(label);
        expect(explained.stopsBatch).toBe(false);
    });

    it('marks 409 EMAIL_NOT_AVAILABLE as a taken address', async () => {
        const explained = await explainInviteError(response(409, { reason: 'EMAIL_NOT_AVAILABLE' }), create);
        expect(explained.emailTaken).toBe(true);
        expect(explained.label).toBe('E-Mail-Adresse bereits vorhanden');
    });

    it.each([
        ['tenant', 'Diese Träger-ID ist bereits vergeben.', 'Träger-ID vergeben'],
        ['agency', 'Diese Beratungsstellen-Nr. ist bereits vergeben.', 'Beratungsstellen-ID vergeben'],
    ] as const)('names the taken %s id on a 409 without reason', async (idKind, message, label) => {
        const explained = await explainInviteError(response(409), { ...create, idKind });
        expect(explained.message).toBe(message);
        expect(explained.label).toBe(label);
    });

    it('shows the backend text of a 400, or a plain fallback', async () => {
        expect(
            (await explainInviteError(response(400, { body: { message: 'tenantId passt nicht' } }), create)).message,
        ).toBe('tenantId passt nicht');
        const bare = await explainInviteError(response(400), create);
        expect(bare.message).toMatch(/Angaben wurden abgelehnt/);
        expect(bare.label).toBe('Ungültige Angaben');
    });

    it('explains a 404 as a unit that does not exist (any more)', async () => {
        const explained = await explainInviteError(new Error(FETCH_ERRORS.NO_MATCH), create);
        expect(explained.message).toMatch(/gibt es nicht \(mehr\)/);
        expect(explained.label).toBe('Nicht gefunden');
        expect(explained.status).toBe(404);
    });

    it('prefers the backend text of a 403 and stops a batch', async () => {
        const explained = await explainInviteError(
            response(403, { body: { message: 'Nur eigene Beratungsstellen' } }),
            create,
        );
        expect(explained.message).toBe('Nur eigene Beratungsstellen');
        expect(explained.stopsBatch).toBe(true);
        const bare = await explainInviteError(response(403), { ...create, role: 'TENANT_ADMIN' });
        expect(bare.message).toBe('Nur Plattform-Administratoren können Träger-Admins einladen.');
        expect(bare.label).toBe('Nicht berechtigt');
    });

    it('names the SMTP cause of a 502 and stops a batch', async () => {
        const explained = await explainInviteError(
            response(502, { body: { reason: 'SMTP_SEND_FAILED', detail: 'SMTP_CREDENTIALS_MISSING' } }),
            create,
        );
        expect(explained.message).toMatch(/SMTP-Zugangsdaten fehlen/);
        expect(explained.smtp).toBe(true);
        expect(explained.stopsBatch).toBe(true);
    });

    it.each([
        ['create', 'Einladung konnte nicht angelegt werden.'],
        ['resend', 'Invite konnte nicht erneut gesendet werden'],
        ['selfAssign', 'Eintragen hat nicht geklappt. Bitte erneut versuchen.'],
    ] as const)('falls back to a plain %s failure', async (action, message) => {
        expect((await explainInviteError(new Error('boom'), { ...create, action })).message).toBe(message);
    });
});
