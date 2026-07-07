import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return { ...actual, fetchData: mocks.fetchData };
});
vi.mock('./updateAgencyType', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('./updateAgencyPostCodeRange', () => ({ default: vi.fn().mockResolvedValue(undefined) }));
vi.mock('../consultingtype/getConsultingType4Tenant', () => ({ default: vi.fn().mockResolvedValue('1') }));

import { updateAgencyData } from './updateAgencyData';

const agencyModel: any = { id: '55', consultingType: '1' };

const sentBody = () => JSON.parse(mocks.fetchData.mock.calls[0][0].bodyData);

describe('updateAgencyData — ADR-003 single-select topic', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
        mocks.fetchData.mockResolvedValue({ _embedded: {} });
    });

    it('sends the single-select Option as a one-element topicIds array', async () => {
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            topicIds: { value: '7', label: 'Debt counselling' },
        } as any);
        expect(sentBody().topicIds).toEqual(['7']);
    });

    it('sends an empty topicIds array when the picker was cleared', async () => {
        // Regression guard: with the old `|| topics` fallback a cleared [] fell back to the
        // backend topics and could not be cleared. `?? topics` + normalize keeps it empty.
        await updateAgencyData(agencyModel, { ...agencyModel, topicIds: [] } as any);
        expect(sentBody().topicIds).toEqual([]);
    });

    it('still accepts the legacy Option[] shape', async () => {
        await updateAgencyData(agencyModel, {
            ...agencyModel,
            topicIds: [{ value: '3' }, { value: '9' }],
        } as any);
        expect(sentBody().topicIds).toEqual(['3', '9']);
    });
});
