import { beforeEach, describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted.
const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn(() => Promise.resolve({})) }));
vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL' },
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT', POST: 'POST' },
    FETCH_SUCCESS: { CONTENT: 'CONTENT' },
    fetchData,
}));
vi.mock('../../appConfig', () => ({
    agencyEndpointBase: '/service/agencies',
    agencyPostcodeRangeEndpointBase: '/service/agencies/postcoderange',
}));

// eslint-disable-next-line import/first
import { updateAgencyData } from './updateAgencyData';
// eslint-disable-next-line import/first
import { AgencyData } from '../../types/agency';

beforeEach(() => fetchData.mockClear());

const baseAgencyModel = { id: '1', teamAgency: false } as unknown as AgencyData;
const baseFormInput = {
    id: '1',
    teamAgency: false,
    consultingType: '1', // non-null → skips getConsultingType4Tenant's own fetchData call
    online: true,
} as unknown as AgencyData;

/** The `fetchData` mock also intercepts the postcode-range side-effect calls; this isolates the main PUT. */
const findPutCall = () => fetchData.mock.calls.find(([args]: any[]) => args.method === 'PUT');

describe('updateAgencyData — ADR-003 topicIds normalisation', () => {
    it('sends a single-element topicIds array for a single-select labelInValue Option', async () => {
        await updateAgencyData(baseAgencyModel, {
            ...baseFormInput,
            topicIds: { value: '7', label: 'Debt counselling' },
        } as unknown as AgencyData);

        const [putArgs] = findPutCall();
        expect(JSON.parse(putArgs.bodyData).topicIds).toEqual(['7']);
    });

    it('sends an empty topicIds array when the field was cleared (undefined)', async () => {
        await updateAgencyData(baseAgencyModel, {
            ...baseFormInput,
            topicIds: undefined,
        } as unknown as AgencyData);

        const [putArgs] = findPutCall();
        expect(JSON.parse(putArgs.bodyData).topicIds).toEqual([]);
    });

    it('falls back to formInput.topics (backend TopicData[] shape) when topicIds is absent', async () => {
        await updateAgencyData(baseAgencyModel, {
            ...baseFormInput,
            topics: [{ id: 42, name: 'Pregnancy' }],
        } as unknown as AgencyData);

        const [putArgs] = findPutCall();
        expect(JSON.parse(putArgs.bodyData).topicIds).toEqual(['42']);
    });

    it('still accepts a legacy multi-select Option[] (pre-ADR-003 saved drafts / old clients)', async () => {
        await updateAgencyData(baseAgencyModel, {
            ...baseFormInput,
            topicIds: [
                { value: '3', label: 'A' },
                { value: '9', label: 'B' },
            ],
        } as unknown as AgencyData);

        const [putArgs] = findPutCall();
        expect(JSON.parse(putArgs.bodyData).topicIds).toEqual(['3', '9']);
    });
});
