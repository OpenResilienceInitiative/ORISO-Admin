import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchData } from '../fetchData';
import { getConsultantPicture, removeConsultantPicture, uploadConsultantPicture } from './consultantPicture';

vi.mock('../fetchData', () => ({
    FETCH_ERRORS: {
        NO_MATCH: 'NO_MATCH',
        FORBIDDEN_SILENT: 'FORBIDDEN_SILENT',
        CATCH_ALL_SILENT: 'CATCH_ALL_SILENT',
    },
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT', DELETE: 'DELETE' },
    fetchData: vi.fn(),
}));

describe('consultantPicture API', () => {
    beforeEach(() => {
        vi.mocked(fetchData).mockReset();
    });

    it('uses the authenticated service route with Blob GET, raw PNG PUT and 204 DELETE', async () => {
        const blob = new Blob(['picture'], { type: 'image/png' });
        vi.mocked(fetchData)
            .mockResolvedValueOnce(blob)
            .mockResolvedValueOnce({ status: 204 } as Response)
            .mockResolvedValueOnce({ status: 204 } as Response);

        await expect(getConsultantPicture('consultant-42')).resolves.toBe(blob);
        await uploadConsultantPicture('consultant-42', new File(['png'], 'portrait.png', { type: 'image/png' }));
        await removeConsultantPicture('consultant-42');

        expect(vi.mocked(fetchData).mock.calls.map(([request]) => request)).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    url: expect.stringMatching(/\/service\/useradmin\/consultants\/consultant-42\/picture$/),
                    method: 'GET',
                    responseType: 'blob',
                }),
                expect.objectContaining({
                    url: expect.stringMatching(/\/service\/useradmin\/consultants\/consultant-42\/picture$/),
                    method: 'PUT',
                    headersData: { 'Content-Type': 'image/png' },
                    bodyData: expect.any(File),
                }),
                expect.objectContaining({ method: 'DELETE' }),
            ]),
        );
    });

    it('maps only the missing-image sentinel to null', async () => {
        vi.mocked(fetchData).mockRejectedValue(new Error('NO_MATCH'));
        await expect(getConsultantPicture('42')).resolves.toBeNull();
    });

    it.each(['NOT_ALLOWED', 'network failure'])('propagates %s instead of claiming an absent photo', async (reason) => {
        const error = new Error(reason);
        vi.mocked(fetchData).mockRejectedValue(error);
        await expect(getConsultantPicture('42')).rejects.toBe(error);
    });

    it('forwards the read AbortSignal to authenticated fetchData', async () => {
        const controller = new AbortController();
        vi.mocked(fetchData).mockResolvedValue(new Blob());
        await getConsultantPicture('42', controller.signal);
        expect(vi.mocked(fetchData).mock.calls[0][0].signal).toBe(controller.signal);
    });
});
