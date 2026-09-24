import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import {
    acceptBaseUrlForRole,
    accountInvitesEndpoint,
    counsellorOnboardingAcceptBaseUrl,
    createAccountInvite,
    resendAccountInvite,
    sendAccountInvite,
    updateAccountInviteTopicPermission,
} from './accountInvites';
import { createSelfAssignment, listSelfAssignments, selfAssignmentsEndpoint } from './selfAssignments';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) });
const sentBody = () => JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData);

describe('#1026 invite wiring — request contract', () => {
    beforeEach(() => mocks.fetchData.mockReset());

    it('sends role, alsoCounsellor and an EXISTING Träger', async () => {
        mocks.fetchData.mockResolvedValueOnce(jsonResponse({ id: 1 }));

        await createAccountInvite({
            targetRole: 'AGENCY_ADMIN',
            recipientEmail: 'a@example.org',
            tenantId: 40,
            tenantIdAllocationMode: 'EXISTING',
            agencyId: 900,
            agencyIdAllocationMode: 'MANUAL',
            alsoCounsellor: true,
        });

        expect(sentBody()).toMatchObject({
            targetRole: 'AGENCY_ADMIN',
            tenantId: 40,
            tenantIdAllocationMode: 'EXISTING',
            agencyId: 900,
            agencyIdAllocationMode: 'MANUAL',
            alsoCounsellor: true,
        });
    });

    it('passes the CSV true/false topic permission through unchanged', async () => {
        mocks.fetchData.mockResolvedValueOnce(jsonResponse({ id: 2 }));

        await createAccountInvite({
            targetRole: 'COUNSELLOR',
            recipientEmail: 'c@example.org',
            agencyId: 12,
            agencyIdAllocationMode: 'EXISTING',
            topicPermission: false,
        });

        expect(sentBody().topicPermission).toBe(false);
    });

    it('omits alsoCounsellor and topicPermission when not set', async () => {
        mocks.fetchData.mockResolvedValueOnce(jsonResponse({ id: 3 }));

        await createAccountInvite({ targetRole: 'COUNSELLOR', recipientEmail: 'c@example.org' });

        const body = sentBody();
        expect(body).not.toHaveProperty('alsoCounsellor');
        expect(body).not.toHaveProperty('topicPermission');
    });

    it('lets a 409 reach the caller on send and resend (UNIT_NOT_CREATED)', async () => {
        mocks.fetchData.mockResolvedValue(jsonResponse({ id: 4 }));

        await sendAccountInvite(4, { templateId: 1 });
        await resendAccountInvite(4, { templateId: 1 });

        mocks.fetchData.mock.calls.forEach(([call]) =>
            expect(call.responseHandling).toContain(FETCH_ERRORS.CONFLICT_WITH_RESPONSE),
        );
    });

    it('changes the topic permission of one invite with PUT', async () => {
        mocks.fetchData.mockResolvedValueOnce(jsonResponse({ id: 7, topicPermission: 'CREATE' }));

        const updated = await updateAccountInviteTopicPermission(7, 'CREATE');

        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${accountInvitesEndpoint}/7/topic-permission`,
                method: FETCH_METHODS.PUT,
                bodyData: JSON.stringify({ topicPermission: 'CREATE' }),
            }),
        );
        expect(updated.topicPermission).toBe('CREATE');
    });

    it('routes agency-admin invites to the counsellor wizard like counsellors', () => {
        expect(acceptBaseUrlForRole('AGENCY_ADMIN')).toBe(counsellorOnboardingAcceptBaseUrl);
    });
});

describe('#1026 self-assignment API', () => {
    beforeEach(() => mocks.fetchData.mockReset());

    it('posts role, agency and topics and lets 409 reasons reach the caller', async () => {
        mocks.fetchData.mockResolvedValueOnce(
            jsonResponse({ role: 'COUNSELLOR', agencyId: 12, userId: 'u', consultantIdentityCreated: true }),
        );

        await createSelfAssignment({ role: 'COUNSELLOR', agencyId: 12, topicIds: [3] });

        const call = mocks.fetchData.mock.calls[0][0];
        expect(call.url).toBe(selfAssignmentsEndpoint);
        expect(call.method).toBe(FETCH_METHODS.POST);
        expect(JSON.parse(call.bodyData)).toEqual({ role: 'COUNSELLOR', agencyId: 12, topicIds: [3] });
        expect(call.responseHandling).toEqual(
            expect.arrayContaining([FETCH_ERRORS.CONFLICT_WITH_RESPONSE, FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE]),
        );
    });

    it('lists the caller’s own assignments', async () => {
        mocks.fetchData.mockResolvedValueOnce({ agencyAdminAgencyIds: [5], counsellorAgencyIds: [12, 14] });

        await expect(listSelfAssignments()).resolves.toEqual({
            agencyAdminAgencyIds: [5],
            counsellorAgencyIds: [12, 14],
        });
        expect(mocks.fetchData.mock.calls[0][0].method).toBe(FETCH_METHODS.GET);
    });
});
