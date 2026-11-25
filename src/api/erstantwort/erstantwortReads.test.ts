import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const { fetchData } = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../fetchData')>()),
    fetchData,
}));

import { getErstantwortPlatformTexts } from './platformTexts';
import { getAgencyErstantwort } from './agencyTexts';

describe('Erstantwort GET readers', () => {
    beforeEach(() => fetchData.mockReset());

    it('returns the platform body fetchData already parsed', async () => {
        const body = { texts: { greeting: { de: '<p>Hallo</p>' } }, builtIn: {} };
        fetchData.mockResolvedValue(body);

        await expect(getErstantwortPlatformTexts()).resolves.toBe(body);
        expect(fetchData.mock.calls[0][0].method).toBe('GET');
    });

    it('returns the centre texts fetchData already parsed', async () => {
        fetchData.mockResolvedValue({ texts: { greeting: { de: '<p>Zentrum</p>' } } });

        await expect(getAgencyErstantwort(7)).resolves.toEqual({
            erstantwortGreeting: { de: '<p>Zentrum</p>' },
        });
        expect(fetchData.mock.calls[0][0].url).toMatch(/\/7$/);
    });
});
