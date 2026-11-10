/* eslint-disable no-underscore-dangle -- HAL test payload */
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { fetchData } from '../fetchData';
import { assignAgencyToConsultants } from './assignAgencyToConsultants';

vi.mock('../fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../fetchData')>()),
    fetchData: vi.fn(),
}));

const request = vi.mocked(fetchData);
const centre = (id: number) => ({ _embedded: { id } });

describe('add selected counsellors to a centre', () => {
    beforeEach(() => request.mockReset());

    it('adds only the new relation and does not replace other centres', async () => {
        request.mockResolvedValueOnce({ _embedded: [centre(2)] });
        request.mockResolvedValueOnce(new Response(null, { status: 201 }));

        await assignAgencyToConsultants(3, [{ value: 'consultant-1' }, 'consultant-1']);

        expect(request.mock.calls.map(([input]) => [input.method, input.url])).toEqual([
            ['GET', expect.stringMatching(/\/consultants\/consultant-1\/agencies$/)],
            ['POST', expect.stringMatching(/\/consultants\/consultant-1\/agencies$/)],
        ]);
        expect(JSON.parse(String(request.mock.calls[1][0].bodyData))).toEqual({
            agencyId: '3',
            roleSetKey: 'CONSULTANT_DEFAULT',
        });
    });

    it('skips the write if the centre is already assigned', async () => {
        request.mockResolvedValueOnce({ _embedded: [centre(2), centre(3)] });

        await assignAgencyToConsultants(3, ['consultant-1']);

        expect(request).toHaveBeenCalledTimes(1);
        expect(request.mock.calls[0][0].method).toBe('GET');
    });

    it('does not fall back to a replacement when the current relations cannot be read', async () => {
        request.mockRejectedValueOnce(new Error('access denied'));

        await expect(assignAgencyToConsultants(3, ['consultant-1'])).rejects.toThrow('access denied');

        expect(request).toHaveBeenCalledTimes(1);
    });
});
