import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import routePathNames, { appURL, inviteEmailTemplatesEndpoint } from '../../appConfig';
import {
    acceptBaseUrlForRole,
    accountInviteAcceptBaseUrl,
    accountInvitesEndpoint,
    createAccountInvite,
    createInviteEmailTemplate,
    listAccountInvites,
    listInviteEmailTemplates,
    resendAccountInvite,
    tenantAdminOnboardingAcceptBaseUrl,
    updateInviteEmailTemplate,
} from './accountInvites';

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
            acceptBaseUrl: 'https://app.oriso.org/account-invite',
            expiresInDays: 30,
            recipientEmail: 'person@example.org',
            targetRole: 'TENANT_ADMIN',
            templateId: 4,
            tenantId: 7,
        });

        expect(JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData)).toEqual({
            acceptBaseUrl: 'https://app.oriso.org/account-invite',
            expiresInDays: 30,
            recipientEmail: 'person@example.org',
            targetRole: 'TENANT_ADMIN',
            templateId: 4,
            tenantId: 7,
        });
        expect(result).toEqual(responseBody);
    });

    it('resends an invite through the account-invite endpoint', async () => {
        mocks.fetchData.mockResolvedValueOnce({ json: async () => ({ id: 2 }) });

        await resendAccountInvite(2, {
            acceptBaseUrl: 'https://app.oriso.org/account-invite',
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

    it.each(['AGENCY_ADMIN', 'COUNSELLOR', 'PLATFORM_ADMIN', 'ADVICE_SEEKER'] as const)(
        'keeps %s invites on the app-layer accept route',
        (role) => {
            expect(acceptBaseUrlForRole(role)).toBe(accountInviteAcceptBaseUrl);
        },
    );
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
