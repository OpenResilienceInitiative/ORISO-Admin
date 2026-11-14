import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FETCH_METHODS } from '../fetchData';
import { inviteEmailTemplatesEndpoint } from '../../appConfig';
import { deleteInviteEmailTemplate } from './accountInvites';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../fetchData', async () => ({
    ...(await vi.importActual<typeof import('../fetchData')>('../fetchData')),
    fetchData: mocks.fetchData,
}));

describe('deleteInviteEmailTemplate', () => {
    beforeEach(() => {
        mocks.fetchData.mockReset();
    });

    it('deletes the selected template with authentication and accepts an empty response', async () => {
        mocks.fetchData.mockResolvedValue(new Response(null, { status: 204 }));
        await expect(deleteInviteEmailTemplate(17)).resolves.toBeUndefined();
        expect(mocks.fetchData).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `${inviteEmailTemplatesEndpoint}/17`,
                method: FETCH_METHODS.DELETE,
                skipAuth: false,
            }),
        );
    });

    it('rejects a denied deletion so the dialog cannot report false success', async () => {
        const denied = new Error('FORBIDDEN');
        mocks.fetchData.mockRejectedValue(denied);
        await expect(deleteInviteEmailTemplate(17)).rejects.toBe(denied);
    });
});
