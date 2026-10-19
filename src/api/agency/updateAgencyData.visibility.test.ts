import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgencyData } from '../../types/agency';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../fetchData', async () => ({
    ...(await vi.importActual<typeof import('../fetchData')>('../fetchData')),
    fetchData: mocks.fetchData,
}));

import { updateAgencyData } from './updateAgencyData';

const agency: AgencyData = {
    id: '18',
    name: 'Counselling centre',
    city: '',
    counsellingRelations: [],
    topics: [],
    description: '',
    offline: true,
    online: false,
    postcode: '',
    teamAgency: false,
    consultingType: '1',
    status: undefined,
    deleteDate: null,
    dataProtection: {
        dataProtectionResponsibleEntity: 'AGENCY_RESPONSIBLE',
        agencyDataProtectionResponsibleContact: null,
        alternativeDataProtectionRepresentativeContact: null,
        dataProtectionOfficerContact: null,
    },
    agencyLogo: null,
    tenantId: 1,
};

describe('agency visibility with persisted geographic coverage', () => {
    let coverage: string;
    let offline: boolean;

    beforeEach(() => {
        coverage = '';
        offline = true;
        mocks.fetchData.mockReset();
        mocks.fetchData.mockImplementation(async ({ method, bodyData }) => {
            const body = bodyData ? JSON.parse(bodyData) : {};
            if (method === 'POST') {
                coverage = body.postcodeRanges;
                return undefined;
            }
            if (method === 'PUT') {
                // Mirrors the real AgencyService eligibility check. A counsellor and topic
                // already exist; activation still fails until geographic coverage is stored.
                if (body.offline === false && coverage === '') {
                    return Promise.reject(
                        new Response(JSON.stringify({ field: 'offline', reason: 'INVALID_OFFLINE_STATUS' }), {
                            status: 400,
                        }),
                    );
                }
                offline = body.offline;
                return { _embedded: { id: agency.id, offline } };
            }
            throw new Error(`Unexpected request: ${method}`);
        });
    });

    it('persists all postal codes before activating a centre with no saved coverage', async () => {
        const onMainWritten = vi.fn();
        await expect(
            updateAgencyData(agency, { ...agency, online: true, postCodeRangesActive: false }, onMainWritten),
        ).resolves.toEqual({ id: '18', offline: false });

        expect(coverage).toBe('00000-99999;');
        expect(offline).toBe(false);
        expect(mocks.fetchData.mock.calls.map(([request]) => request.method)).toEqual(['POST', 'PUT']);
        expect(onMainWritten).toHaveBeenCalledOnce();
    });

    it('persists the selected restricted coverage before activating', async () => {
        await updateAgencyData(agency, {
            ...agency,
            online: true,
            postCodeRangesActive: true,
            postCodes: [{ from: '10115', until: '10179' }],
        });

        expect(coverage).toBe('10115-10179;');
        expect(offline).toBe(false);
        expect(mocks.fetchData.mock.calls.map(([request]) => request.method)).toEqual(['POST', 'PUT']);
    });

    it('does not activate or acknowledge success when storing coverage fails', async () => {
        coverage = '10115-10179;';
        mocks.fetchData.mockRejectedValueOnce(new Error('Coverage rejected'));
        const onMainWritten = vi.fn();

        await expect(
            updateAgencyData(agency, { ...agency, online: true, postCodeRangesActive: false }, onMainWritten),
        ).rejects.toThrow('Coverage rejected');

        expect(coverage).toBe('10115-10179;');
        expect(offline).toBe(true);
        expect(mocks.fetchData.mock.calls.map(([request]) => request.method)).toEqual(['POST']);
        expect(onMainWritten).not.toHaveBeenCalled();
    });

    it('keeps restricted coverage when saving an unrelated card', async () => {
        coverage = '10115-10179;';
        await updateAgencyData(agency, { ...agency, name: 'Updated centre' });

        expect(coverage).toBe('10115-10179;');
        expect(mocks.fetchData.mock.calls.map(([request]) => request.method)).toEqual(['PUT']);
    });

    it.each([undefined, []])('does not replace missing explicit ranges with all areas (%s)', async (postCodes) => {
        coverage = '10115-10179;';
        await expect(
            updateAgencyData(agency, {
                ...agency,
                online: true,
                teamAgency: true,
                consultantIds: ['first-counsellor'],
                postCodeRangesActive: true,
                postCodes,
            }),
        ).rejects.toThrow('Selected postal-code ranges are missing');

        expect(coverage).toBe('10115-10179;');
        expect(mocks.fetchData).not.toHaveBeenCalled();
    });
});
