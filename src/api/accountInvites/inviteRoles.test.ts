import { beforeEach, describe, expect, it, vi } from 'vitest';
import { counselorEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS } from '../fetchData';
import { accountInvitesEndpoint } from './accountInvites';
import { addConsultantRole, changeAccountInviteRole } from './inviteRoles';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});

const jsonResponse = (body: unknown) => ({ json: () => Promise.resolve(body) });
const call = () => mocks.fetchData.mock.calls[0][0];

// Contract: ORISO-UserService#1260.
describe('invite role API', () => {
    beforeEach(() => mocks.fetchData.mockReset());

    it('changes the role of an open invite with PUT …/role and reads the answer as UTC', async () => {
        mocks.fetchData.mockResolvedValueOnce(
            jsonResponse({ id: 7, targetRole: 'AGENCY_ADMIN', sentAt: '2026-09-25T08:00:00' }),
        );

        const updated = await changeAccountInviteRole(7, { targetRole: 'AGENCY_ADMIN', alsoCounsellor: true });

        expect(call().url).toBe(`${accountInvitesEndpoint}/7/role`);
        expect(call().method).toBe(FETCH_METHODS.PUT);
        expect(JSON.parse(call().bodyData)).toEqual({ targetRole: 'AGENCY_ADMIN', alsoCounsellor: true });
        expect(updated.sentAt).toBe('2026-09-25T08:00:00Z');
    });

    it('omits alsoCounsellor when not given, so the backend default applies', async () => {
        mocks.fetchData.mockResolvedValueOnce(jsonResponse({ id: 7 }));
        await changeAccountInviteRole(7, { targetRole: 'COUNSELLOR' });
        expect(JSON.parse(call().bodyData)).toEqual({ targetRole: 'COUNSELLOR' });
    });

    it('adds a role to an existing account with POST /useradmin/consultants/{id}/roles', async () => {
        mocks.fetchData.mockResolvedValueOnce(
            jsonResponse({ consultantId: 'c-1', role: 'AGENCY_ADMIN', agencyIds: [12] }),
        );

        await expect(addConsultantRole('c-1', { role: 'AGENCY_ADMIN', agencyId: 12 })).resolves.toEqual({
            consultantId: 'c-1',
            role: 'AGENCY_ADMIN',
            agencyIds: [12],
        });
        expect(call().url).toBe(`${counselorEndpoint}/c-1/roles`);
        expect(call().method).toBe(FETCH_METHODS.POST);
        expect(JSON.parse(call().bodyData)).toEqual({ role: 'AGENCY_ADMIN', agencyId: 12 });
    });

    it('lets 400, 403, 404 and 409 reach the caller for explainInviteError', async () => {
        mocks.fetchData.mockResolvedValue(jsonResponse({}));
        await changeAccountInviteRole(7, { targetRole: 'COUNSELLOR' });
        await addConsultantRole('c-1', { role: 'AGENCY_ADMIN' });

        mocks.fetchData.mock.calls.forEach(([request]) =>
            expect(request.responseHandling).toEqual(
                expect.arrayContaining([
                    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
                    FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
                    FETCH_ERRORS.NO_MATCH,
                    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
                ]),
            ),
        );
    });
});
