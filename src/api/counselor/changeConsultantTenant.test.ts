import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData } from '../fetchData';
import {
    CHANGE_TENANT_ERRORS,
    ChangeConsultantTenantError,
    changeConsultantTenant,
    ChangeTenantErrorCode,
} from './changeConsultantTenant';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: vi.fn() };
});

const RESULT = {
    consultantId: 'consultant-7',
    previousTenantId: 7,
    tenantId: 12,
    agencyIds: [21, 22],
    casesLeftWithPreviousTenant: 3,
    matrixAccessRevocationsQueued: 2,
};

const refusal = (status: number, body: string | null = null, headers: Record<string, string> = {}) =>
    new Response(body, { status, headers });

const failureOf = async (rejection: unknown): Promise<ChangeTenantErrorCode> => {
    vi.mocked(fetchData).mockRejectedValue(rejection);
    try {
        await changeConsultantTenant('consultant-7', { tenantId: '12', centreIds: ['21'] });
    } catch (error) {
        expect(error).toBeInstanceOf(ChangeConsultantTenantError);
        return (error as ChangeConsultantTenantError).code;
    }
    throw new Error('expected the call to fail');
};

describe('changeConsultantTenant', () => {
    beforeEach(() => {
        vi.mocked(fetchData).mockReset();
    });

    it('PUTs the new Träger and its centres to /useradmin/consultants/{id}/tenant', async () => {
        vi.mocked(fetchData).mockResolvedValue(RESULT);

        await changeConsultantTenant('consultant-7', { tenantId: '12', centreIds: ['21', '22'], topicIds: ['3', '7'] });

        const request = vi.mocked(fetchData).mock.calls[0][0];
        expect(request.method).toBe('PUT');
        expect(request.url).toMatch(/\/service\/useradmin\/consultants\/consultant-7\/tenant$/);
        expect(JSON.parse(request.bodyData as string)).toEqual({
            tenantId: 12,
            agencies: [
                { agencyId: '21', roleSetKey: 'CONSULTANT_DEFAULT' },
                { agencyId: '22', roleSetKey: 'CONSULTANT_DEFAULT' },
            ],
            topicIds: [3, 7],
        });
    });

    it('leaves topicIds out when the admin was not shown any, so the move starts without topics', async () => {
        vi.mocked(fetchData).mockResolvedValue(RESULT);

        await changeConsultantTenant('consultant-7', { tenantId: '12', centreIds: ['21'] });

        const body = JSON.parse(vi.mocked(fetchData).mock.calls[0][0].bodyData as string);
        expect(body).not.toHaveProperty('topicIds');
    });

    it('returns what the server counted, so the page can say how many cases stayed behind', async () => {
        vi.mocked(fetchData).mockResolvedValue(RESULT);

        await expect(changeConsultantTenant('consultant-7', { tenantId: '12', centreIds: ['21'] })).resolves.toEqual(
            RESULT,
        );
    });

    it('lets fetchData hand back the refusal instead of toasting or redirecting', async () => {
        vi.mocked(fetchData).mockResolvedValue(RESULT);

        await changeConsultantTenant('consultant-7', { tenantId: '12', centreIds: ['21'] });

        const { responseHandling } = vi.mocked(fetchData).mock.calls[0][0];
        expect(responseHandling).toEqual(
            expect.arrayContaining(['BAD_REQUEST_WITH_RESPONSE', 'CONFLICT_WITH_RESPONSE', 'FORBIDDEN_WITH_RESPONSE']),
        );
        expect(responseHandling).toContain('CATCH_ALL_SILENT');
        expect(responseHandling).toContain('CONTENT');
    });

    describe('names every refusal', () => {
        it.each<[string, Response, ChangeTenantErrorCode]>([
            [
                '400 multi-tenancy is off',
                refusal(400, 'A counsellor can only change the Träger with multi-tenancy'),
                'MULTI_TENANCY_OFF',
            ],
            ['400 same Träger', refusal(400, 'The consultant already belongs to this Träger'), 'SAME_TRAEGER'],
            [
                '400 centre of another Träger',
                refusal(400, 'Selected agency ids [5] do not belong to consultant tenant 12'),
                'CENTRE_OF_OTHER_TRAEGER',
            ],
            [
                '400 topics not covered',
                refusal(400, '{"message":"topic ids [10] are not covered by selected agencies"}'),
                'TOPICS_NOT_COVERED',
            ],
            ['400 without a recognisable reason', refusal(400, ''), 'BAD_REQUEST'],
            ['403 not a platform admin', refusal(403), 'FORBIDDEN'],
            ['404 unknown counsellor', refusal(404), 'NOT_FOUND'],
            [
                '409 last counsellor of an active centre (X-Reason)',
                refusal(409, '', { 'X-Reason': 'CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE' }),
                'LAST_COUNSELLOR_OF_CENTRE',
            ],
            [
                '409 last counsellor of an active centre (message)',
                refusal(409, 'consultant is the last one of agency 4 and the agency is still active'),
                'LAST_COUNSELLOR_OF_CENTRE',
            ],
            [
                '409 account also holds an admin identity',
                refusal(409, 'The account also holds an admin identity and cannot change the Träger as a consultant'),
                'ALSO_ADMIN',
            ],
            ['409 without a recognisable reason', refusal(409, ''), 'CONFLICT'],
            ['503 identity provider refused', refusal(503), 'IDENTITY_PROVIDER_UNAVAILABLE'],
            ['500', refusal(500), 'UNKNOWN'],
        ])('%s', async (_label, response, code) => {
            expect(await failureOf(response)).toBe(code);
        });

        it('reads the reason from a JSON body as well as a plain one', async () => {
            expect(
                await failureOf(refusal(409, JSON.stringify({ message: 'The account also holds an admin identity' }))),
            ).toBe('ALSO_ADMIN');
        });

        it('an expired session is its own case, not a generic failure', async () => {
            expect(await failureOf(new Error('UNAUTHORIZED'))).toBe('SESSION_EXPIRED');
        });

        it('a request that never got an answer is a network failure', async () => {
            expect(await failureOf(new TypeError('Failed to fetch'))).toBe('NETWORK');
            expect(await failureOf(new Error('TIMEOUT'))).toBe('NETWORK');
        });

        it('exposes the codes the dialog keys its messages on', () => {
            expect(Object.keys(CHANGE_TENANT_ERRORS).sort()).toEqual(
                [
                    'ALSO_ADMIN',
                    'BAD_REQUEST',
                    'CENTRE_OF_OTHER_TRAEGER',
                    'CONFLICT',
                    'FORBIDDEN',
                    'IDENTITY_PROVIDER_UNAVAILABLE',
                    'LAST_COUNSELLOR_OF_CENTRE',
                    'MULTI_TENANCY_OFF',
                    'NETWORK',
                    'NOT_FOUND',
                    'SAME_TRAEGER',
                    'SESSION_EXPIRED',
                    'TOPICS_NOT_COVERED',
                    'UNKNOWN',
                ].sort(),
            );
        });
    });
});
