import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import routePathNames, { appURL, inviteEmailTemplatesEndpoint } from '../../appConfig';
import {
    acceptBaseUrlForRole,
    accountInviteAcceptBaseUrl,
    accountInvitesEndpoint,
    counsellorOnboardingAcceptBaseUrl,
    createAccountInvite,
    createInviteEmailTemplate,
    getInviteEmailPreview,
    inviteEmailPreviewEndpoint,
    listAccountInvites,
    listInviteEmailTemplates,
    resendAccountInvite,
    sendAccountInvite,
    tenantAdminOnboardingAcceptBaseUrl,
    updateInviteEmailTemplate,
} from './accountInvites';
import { extractSmtpSendFailure } from '../../utils/extractApiErrorMessage';

const mocks = vi.hoisted(() => ({
    fetchData: vi.fn(),
}));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');

    return {
        ...actual,
        fetchData: mocks.fetchData,
    };
});

describe('account invite API', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('lists account invites with target role and status filters', async () => {
        mocks.fetchData.mockResolvedValueOnce({ content: [], totalElements: 0, totalPages: 0, page: 1, size: 10 });

        await listAccountInvites({
            page: 1,
            size: 10,
            status: 'EMAIL_SENT',
            targetRole: 'COUNSELLOR',
            tenantId: 7,
        });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                url: `${accountInvitesEndpoint}?page=1&size=10&target_role=COUNSELLOR&status=EMAIL_SENT&tenant_id=7`,
            }),
        );
    });

    it('creates account invites without using external inbound link status', async () => {
        const responseBody = { id: 1, inviteStatus: 'EMAIL_SENT' };
        mocks.fetchData.mockResolvedValueOnce({ json: async () => responseBody });

        const result = await createAccountInvite({
            acceptBaseUrl: 'https://app.example.org/account-invite',
            expiresInDays: 30,
            recipientEmail: 'person@example.org',
            targetRole: 'TENANT_ADMIN',
            templateId: 4,
            tenantId: 7,
        });

        expect(JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData)).toEqual({
            acceptBaseUrl: 'https://app.example.org/account-invite',
            expiresInDays: 30,
            recipientEmail: 'person@example.org',
            targetRole: 'TENANT_ADMIN',
            templateId: 4,
            tenantId: 7,
        });
        expect(result).toEqual(responseBody);
    });

    it('omits browser-pinned ids in AUTO allocation mode', async () => {
        mocks.fetchData.mockResolvedValueOnce({ json: async () => ({ id: 1 }) });

        await createAccountInvite({
            agencyId: 9,
            agencyIdAllocationMode: 'AUTO',
            recipientEmail: 'person@example.org',
            targetRole: 'TENANT_ADMIN',
            tenantId: 7,
            tenantIdAllocationMode: 'AUTO',
        });

        const payload = JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData);
        expect(payload.tenantId).toBeUndefined();
        expect(payload.agencyId).toBeUndefined();
    });

    it('rejects MANUAL allocation without the required id before transport', async () => {
        await expect(
            createAccountInvite({
                recipientEmail: 'person@example.org',
                targetRole: 'TENANT_ADMIN',
                tenantIdAllocationMode: 'MANUAL',
            }),
        ).rejects.toThrow('tenantId is required when allocation mode is MANUAL');

        expect(mocks.fetchData).not.toHaveBeenCalled();
    });

    it('resends an invite through the account-invite endpoint', async () => {
        mocks.fetchData.mockResolvedValueOnce({ json: async () => ({ id: 2 }) });

        await resendAccountInvite(2, {
            acceptBaseUrl: 'https://app.example.org/account-invite',
            templateId: 4,
        });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.POST,
                url: `${accountInvitesEndpoint}/2/resend`,
            }),
        );
    });

    it('rejects account invite creation with the raw response on a tenantId collision (409)', async () => {
        const conflictResponse = new Response(null, { status: 409 });
        mocks.fetchData.mockRejectedValueOnce(conflictResponse);

        await expect(
            createAccountInvite({
                recipientEmail: 'person@example.org',
                targetRole: 'TENANT_ADMIN',
                templateId: 4,
                tenantId: 7,
            }),
        ).rejects.toBe(conflictResponse);

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                responseHandling: expect.arrayContaining([FETCH_ERRORS.CONFLICT_WITH_RESPONSE]),
            }),
        );
    });
});

describe('acceptBaseUrlForRole', () => {
    it('routes tenant-admin invites to the public Admin onboarding page (TEN-INV U6/U8)', () => {
        expect(acceptBaseUrlForRole('TENANT_ADMIN')).toBe(tenantAdminOnboardingAcceptBaseUrl);
        expect(tenantAdminOnboardingAcceptBaseUrl).toBe(
            `${appURL.replace(/\/$/, '')}${routePathNames.tenantOnboarding}`,
        );
        expect(tenantAdminOnboardingAcceptBaseUrl.endsWith('/admin/tenant-onboarding')).toBe(true);
    });

    it('routes counsellor invites to the public Admin wizard (#997)', () => {
        expect(acceptBaseUrlForRole('COUNSELLOR')).toBe(counsellorOnboardingAcceptBaseUrl);
        expect(counsellorOnboardingAcceptBaseUrl.endsWith('/admin/counsellor-onboarding')).toBe(true);
    });

    it.each(['PLATFORM_ADMIN', 'ADVICE_SEEKER'] as const)('keeps %s invites on the app-layer accept route', (role) => {
        expect(acceptBaseUrlForRole(role)).toBe(accountInviteAcceptBaseUrl);
    });
});

describe('invite email template API', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('lists templates filtered by kind', async () => {
        mocks.fetchData.mockResolvedValueOnce([]);

        await listInviteEmailTemplates('TENANT_INVITE');

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                url: `${inviteEmailTemplatesEndpoint}?kind=TENANT_INVITE`,
            }),
        );
    });

    it('lists all templates when no kind filter is given', async () => {
        mocks.fetchData.mockResolvedValueOnce([]);

        await listInviteEmailTemplates();

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                url: inviteEmailTemplatesEndpoint,
            }),
        );
    });

    it('creates an invite email template', async () => {
        const responseBody = { id: 1, kind: 'TENANT_INVITE', name: 'Default' };
        mocks.fetchData.mockResolvedValueOnce({ json: async () => responseBody });

        const result = await createInviteEmailTemplate({
            kind: 'TENANT_INVITE',
            name: 'Default',
            language: 'de',
            subject: 'Willkommen',
            body: 'Hallo {{firstName}}, {{inviteLink}}',
            active: true,
        });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.POST,
                url: inviteEmailTemplatesEndpoint,
            }),
        );
        expect(JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData)).toEqual({
            kind: 'TENANT_INVITE',
            name: 'Default',
            language: 'de',
            subject: 'Willkommen',
            body: 'Hallo {{firstName}}, {{inviteLink}}',
            active: true,
        });
        expect(result).toEqual(responseBody);
    });

    it('updates an invite email template', async () => {
        const responseBody = { id: 3, kind: 'COUNSELLOR_INVITE', name: 'Updated' };
        mocks.fetchData.mockResolvedValueOnce({ json: async () => responseBody });

        const result = await updateInviteEmailTemplate(3, {
            kind: 'COUNSELLOR_INVITE',
            name: 'Updated',
            language: null,
            subject: 'Hi',
            body: 'Body {{email}}',
            active: false,
        });

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.PUT,
                url: `${inviteEmailTemplatesEndpoint}/3`,
            }),
        );
        expect(JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData)).toEqual({
            kind: 'COUNSELLOR_INVITE',
            name: 'Updated',
            language: null,
            subject: 'Hi',
            body: 'Body {{email}}',
            active: false,
        });
        expect(result).toEqual(responseBody);
    });
});

describe('branded invite e-mail preview (UserService#914)', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('renders the built-in platform sample when no parameter is given', async () => {
        mocks.fetchData.mockResolvedValueOnce({ html: '<!doctype html><html></html>' });

        await getInviteEmailPreview();

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                method: FETCH_METHODS.GET,
                url: inviteEmailPreviewEndpoint,
                // The preview owns an inline error state; a global toast would be wrong here.
                responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
            }),
        );
    });

    it('passes the documented query parameters, snake_case tenant id included', async () => {
        mocks.fetchData.mockResolvedValueOnce({ html: '<!doctype html><html></html>' });

        await getInviteEmailPreview({ templateId: 5, kind: 'COUNSELLOR_INVITE', tenantId: 7, language: 'en' });

        expect(mocks.fetchData.mock.calls[0][0].url).toBe(
            `${inviteEmailPreviewEndpoint}?templateId=5&kind=COUNSELLOR_INVITE&tenant_id=7&language=en`,
        );
    });

    it('omits parameters that are not set instead of sending empty values', async () => {
        mocks.fetchData.mockResolvedValueOnce({ html: '<!doctype html><html></html>' });

        await getInviteEmailPreview({ tenantId: undefined, language: 'de' });

        expect(mocks.fetchData.mock.calls[0][0].url).toBe(`${inviteEmailPreviewEndpoint}?language=de`);
    });

    it('returns the parsed preview payload unchanged — the html must not be post-processed', async () => {
        const preview = {
            templateId: null,
            templateName: null,
            kind: 'TENANT_INVITE',
            language: 'de',
            subject: 'Ihre Einladung zu ORISO',
            html: '<!doctype html><html lang="de"><body>mail</body></html>',
            plainText: 'ORISO\n=====',
            sampleAcceptUrl: 'https://admin.example.org/admin/tenant-onboarding/SAMPLE-PREVIEW-TOKEN',
        };
        mocks.fetchData.mockResolvedValueOnce(preview);

        await expect(getInviteEmailPreview()).resolves.toBe(preview);
    });
});

/*
 * UserService#1160: when the invite mail cannot be handed to SMTP the request is
 * answered 502 `{"reason":"SMTP_SEND_FAILED","detail":"<category>"}`. Every call
 * that SENDS mail must opt into BAD_GATEWAY_WITH_RESPONSE, otherwise the raw
 * Response never reaches the caller and the cause is swallowed by CATCH_ALL.
 */
describe('invite mail delivery failures (UserService#1160)', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    const smtp502 = (detail?: string) =>
        new Response(JSON.stringify({ reason: 'SMTP_SEND_FAILED', ...(detail ? { detail } : {}) }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
        });

    it.each([
        [
            'create',
            () =>
                createAccountInvite({
                    recipientEmail: 'person@example.org',
                    targetRole: 'TENANT_ADMIN',
                    templateId: 4,
                    tenantId: 7,
                }),
        ],
        ['send', () => sendAccountInvite(11, { templateId: 4 })],
        ['resend', () => resendAccountInvite(11, { templateId: 4 })],
    ])('opts %s into BAD_GATEWAY_WITH_RESPONSE so the 502 reaches the caller', async (_name, call) => {
        mocks.fetchData.mockResolvedValueOnce({ json: async () => ({ id: 11 }) });

        await call();

        expect(mocks.fetchData.mock.calls[0][0].responseHandling).toContain(FETCH_ERRORS.BAD_GATEWAY_WITH_RESPONSE);
        // The 403 role surfacing (UserService#1006) must survive untouched.
        expect(mocks.fetchData.mock.calls[0][0].responseHandling).toContain(FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE);
    });

    it('rejects with the raw 502 response instead of resolving an invite', async () => {
        const rejection = smtp502('SMTP_CREDENTIALS_MISSING');
        mocks.fetchData.mockRejectedValueOnce(rejection);

        await expect(sendAccountInvite(11, { templateId: 4 })).rejects.toBe(rejection);
    });

    it.each([
        'SMTP_CREDENTIALS_MISSING',
        'SMTP_DISABLED_OR_INCOMPLETE',
        'SMTP_SETTINGS_UNAVAILABLE',
        'SMTP_TRANSPORT_FAILED',
    ])('decodes the %s category out of the 502 body', async (detail) => {
        await expect(extractSmtpSendFailure(smtp502(detail))).resolves.toEqual({ detail });
    });

    it('reports a categoryless SMTP failure as detail null rather than guessing a cause', async () => {
        await expect(extractSmtpSendFailure(smtp502())).resolves.toEqual({ detail: null });
    });

    it('ignores responses that are not an SMTP send failure', async () => {
        await expect(extractSmtpSendFailure(new Response(null, { status: 403 }))).resolves.toBeNull();
        await expect(
            extractSmtpSendFailure(new Response(JSON.stringify({ reason: 'OTHER' }), { status: 502 })),
        ).resolves.toBeNull();
        await expect(extractSmtpSendFailure(new Response('not json', { status: 502 }))).resolves.toBeNull();
        await expect(extractSmtpSendFailure(new Error('network down'))).resolves.toBeNull();
    });
});
