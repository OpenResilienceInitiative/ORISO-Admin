import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';
import { grantConsultantIdentityData } from './grantConsultantIdentityData';
import { fetchData, FETCH_METHODS } from '../fetchData';

vi.mock('../fetchData', async () => {
    const actual = await vi.importActual<typeof import('../fetchData')>('../fetchData');
    return {
        ...actual,
        fetchData: vi.fn(),
    };
});

describe('grantConsultantIdentityData', () => {
    const mockedFetchData = fetchData as unknown as Mock;

    beforeEach(() => {
        mockedFetchData.mockReset();
        mockedFetchData.mockResolvedValue({ status: 204 });
    });

    it('POSTs to the grant-consultant-identity endpoint for the given admin id', async () => {
        await grantConsultantIdentityData('admin-123', {
            agencyIds: ['10', '20'],
        });

        expect(mockedFetchData).toHaveBeenCalledTimes(1);
        const call = mockedFetchData.mock.calls[0][0];
        expect(call.method).toBe(FETCH_METHODS.POST);
        expect(call.url).toContain('/admins/admin-123/grant-consultant-identity');
    });

    it('sends agencyIds in the request body', async () => {
        await grantConsultantIdentityData('admin-123', {
            agencyIds: ['10', '20'],
        });

        const call = mockedFetchData.mock.calls[0][0];
        const body = JSON.parse(call.bodyData);
        expect(body.agencyIds).toEqual(['10', '20']);
    });

    it('forwards the consultant identity flags and topicIds in the body', async () => {
        await grantConsultantIdentityData('admin-456', {
            isGroupchatConsultant: true,
            absent: true,
            absenceMessage: 'out of office',
            formalLanguage: false,
            agencyIds: ['5'],
            topicIds: ['1', '2'],
        });

        const call = mockedFetchData.mock.calls[0][0];
        const body = JSON.parse(call.bodyData);
        expect(body.isGroupchatConsultant).toBe(true);
        expect(body.absent).toBe(true);
        expect(body.absenceMessage).toBe('out of office');
        expect(body.formalLanguage).toBe(false);
        expect(body.agencyIds).toEqual(['5']);
        expect(body.topicIds).toEqual(['1', '2']);
    });
});
