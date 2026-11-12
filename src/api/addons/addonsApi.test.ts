import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';

const mocks = vi.hoisted(() => ({ fetchData: vi.fn() }));
vi.mock('../../appConfig', () => ({ addonServiceEndpoint: 'https://example.org/service/addons' }));
vi.mock('../fetchData', () => ({
    fetchData: mocks.fetchData,
    FETCH_METHODS: { GET: 'GET', PUT: 'PUT', DELETE: 'DELETE' },
    FETCH_ERRORS: {
        FORBIDDEN: 'FORBIDDEN',
        NO_MATCH: 'NO_MATCH',
        CATCH_ALL: 'CATCH_ALL',
        CATCH_ALL_SILENT: 'CATCH_ALL_SILENT',
        BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
    },
    FETCH_SUCCESS: { CONTENT: 'CONTENT' },
}));

import {
    AddonSettingsValidationError,
    clearAddonAgencyOverride,
    getAddonRegistry,
    getAddonSettings,
    getAddonStats,
    getAdminAddons,
    saveAddonSettings,
    setAddonEnabledForAgency,
    setAddonEnabledForTenant,
} from './addonsApi';

const base = 'https://example.org/service/addons';
const lastCall = () => mocks.fetchData.mock.calls[mocks.fetchData.mock.calls.length - 1][0];

beforeEach(() => {
    mocks.fetchData.mockReset();
    mocks.fetchData.mockResolvedValue({});
});

describe('addonsApi', () => {
    it('lists the add-ons of a Träger and without one the caller’s own', async () => {
        mocks.fetchData.mockResolvedValue([{ manifest: { name: 'demo' } }]);
        await expect(getAdminAddons(7)).resolves.toEqual([{ manifest: { name: 'demo' } }]);
        expect(lastCall()).toMatchObject({ url: `${base}/admin/addons?tenantId=7`, method: 'GET' });
        expect(lastCall().responseHandling).toContain('FORBIDDEN');

        await getAdminAddons(null);
        expect(lastCall().url).toBe(`${base}/admin/addons`);
    });

    it('switches an add-on for a Träger and for an agency', async () => {
        await setAddonEnabledForTenant('digi tools', 7, true);
        expect(lastCall()).toMatchObject({
            url: `${base}/admin/addons/digi%20tools/tenants/7`,
            method: 'PUT',
            bodyData: '{"enabled":true}',
        });

        await setAddonEnabledForAgency('demo', 7, 42, false);
        expect(lastCall()).toMatchObject({
            url: `${base}/admin/addons/demo/tenants/7/agencies/42`,
            method: 'PUT',
            bodyData: '{"enabled":false}',
        });

        await clearAddonAgencyOverride('demo', 7, 42);
        expect(lastCall()).toMatchObject({ url: `${base}/admin/addons/demo/tenants/7/agencies/42`, method: 'DELETE' });
    });

    it('reads settings per Träger and per agency', async () => {
        mocks.fetchData.mockResolvedValue({ schema: { type: 'object' }, values: { a: 1 } });
        await expect(getAddonSettings('demo', 7)).resolves.toEqual({ schema: { type: 'object' }, values: { a: 1 } });
        expect(lastCall().url).toBe(`${base}/admin/addons/demo/settings?tenantId=7`);

        mocks.fetchData.mockResolvedValue({});
        await expect(getAddonSettings('demo', 7, 3)).resolves.toEqual({ schema: null, values: {} });
        expect(lastCall().url).toBe(`${base}/admin/addons/demo/settings?tenantId=7&agencyId=3`);
    });

    it('saves settings and turns a 400 into a validation error with the server detail', async () => {
        mocks.fetchData.mockResolvedValue({ a: 2 });
        await expect(saveAddonSettings('demo', 7, null, { a: 2 })).resolves.toEqual({ a: 2 });
        expect(lastCall()).toMatchObject({
            url: `${base}/admin/addons/demo/settings?tenantId=7`,
            method: 'PUT',
            bodyData: '{"a":2}',
        });
        expect(lastCall().responseHandling).toContain('BAD_REQUEST_WITH_RESPONSE');

        mocks.fetchData.mockRejectedValue(new Response(JSON.stringify({ message: 'a too big' }), { status: 400 }));
        const error = await saveAddonSettings('demo', 7, 3, { a: 99 }).catch((caught) => caught);
        expect(error).toBeInstanceOf(AddonSettingsValidationError);
        expect(error.detail).toBe('a too big');
        expect(lastCall().url).toBe(`${base}/admin/addons/demo/settings?tenantId=7&agencyId=3`);
    });

    it('reads statistics and the registry', async () => {
        mocks.fetchData.mockResolvedValue({ stats: [{ id: 'x', value: 3 }] });
        await expect(getAddonStats('demo', 7)).resolves.toEqual({ stats: [{ id: 'x', value: 3 }] });
        expect(lastCall().url).toBe(`${base}/admin/addons/demo/stats?tenantId=7`);

        mocks.fetchData.mockResolvedValue({ contract: 'oriso-addon/v1' });
        await expect(getAddonRegistry()).resolves.toEqual({ contract: 'oriso-addon/v1', addons: [] });
        expect(lastCall().url).toBe(`${base}/registry`);
    });
});
