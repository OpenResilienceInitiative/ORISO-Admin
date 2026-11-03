import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../fetchData')>()),
    fetchData,
}));

import { getErstantwortDefaults } from './getErstantwortDefaults';

describe('getErstantwortDefaults', () => {
    beforeEach(() => fetchData.mockReset());

    it('asks for the German variant matching the Träger and returns the body', async () => {
        fetchData.mockResolvedValue({ json: async () => ({ greeting: 'Hallo' }) });
        await expect(getErstantwortDefaults(true)).resolves.toEqual({ greeting: 'Hallo' });
        expect(fetchData.mock.calls[0][0].url).toMatch(
            /\/service\/useradmin\/erstantwort\/defaults\?locale=de&informal=true$/,
        );
        expect(fetchData.mock.calls[0][0].method).toBe('GET');
    });
});
