import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_METHODS } from '../fetchData';
import { accountInvitesEndpoint, createAccountInvite, listAccountInvites, resendAccountInvite } from './accountInvites';

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
});
