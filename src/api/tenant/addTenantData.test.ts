import { describe, it, expect, vi } from 'vitest';
import { buildTenantCreatePayload } from './addTenantData';

// `./addTenantData` statically imports `../fetchData` and `../../appConfig`,
// which transitively pull in Vite/antd/i18next side effects irrelevant to the
// pure `buildTenantCreatePayload`. Stub them so the unit stays fast and pure.
vi.mock('../fetchData', () => ({
    FETCH_ERRORS: { CATCH_ALL: 'CATCH_ALL' },
    FETCH_METHODS: { POST: 'POST' },
    fetchData: vi.fn(() => Promise.resolve({ status: 200, json: () => ({}) })),
}));
vi.mock('../../appConfig', () => ({
    tenantEndpoint: '/service/tenant/',
}));

describe('buildTenantCreatePayload', () => {
    const formData = {
        name: 'Caritas',
        subdomain: 'caritas',
        createDate: '2026-06-24',
        allowedNumberOfUsers: 42,
        settings: { featureTopicsEnabled: true },
        formalLanguage: true,
        consultingType: '0',
        twoFactorAuth: false,
        videoFeature: true,
        address: 'Musterstr. 1, 12345 Musterstadt',
        description: 'Beratungsträger für die Region',
        topic: 'Sucht', // frontend-only, must NOT be forwarded
        somethingElse: 'ignore me', // arbitrary extra field, must be stripped
    };

    it('keeps the persisted top-level fields', () => {
        const payload = buildTenantCreatePayload(formData);
        expect(payload.name).toBe('Caritas');
        expect(payload.subdomain).toBe('caritas');
        expect(payload.consultingType).toBe('0');
        expect(payload.address).toBe('Musterstr. 1, 12345 Musterstadt');
        expect(payload.description).toBe('Beratungsträger für die Region');
    });

    it('nests allowedNumberOfUsers under licensing', () => {
        const payload = buildTenantCreatePayload(formData);
        expect(payload.licensing).toEqual({ allowedNumberOfUsers: 42 });
    });

    it('drops the frontend-only topic field (no backend column)', () => {
        const payload = buildTenantCreatePayload(formData);
        expect('topic' in payload).toBe(false);
    });

    it('strips unknown fields', () => {
        const payload = buildTenantCreatePayload(formData);
        expect('somethingElse' in payload).toBe(false);
    });

    it('leaves optional fields undefined when absent (no crash)', () => {
        const minimal = buildTenantCreatePayload({ name: 'X', subdomain: 'x' });
        expect(minimal.address).toBeUndefined();
        expect(minimal.description).toBeUndefined();
        expect('topic' in minimal).toBe(false);
    });
});
