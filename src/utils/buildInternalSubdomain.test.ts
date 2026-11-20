import { describe, expect, it } from 'vite-plus/test';
import { buildInternalSubdomain, newInternalSubdomainSuffix } from './buildInternalSubdomain';
import { SUBDOMAIN_PATTERN } from './isValidSubdomain';

describe('buildInternalSubdomain', () => {
    it('slugs the name and appends the suffix', () => {
        expect(buildInternalSubdomain('Caritas Nord e.V.', '123456')).toBe('caritas-nord-e-v-123456');
    });

    it('falls back to "tenant" for an empty or symbol-only name', () => {
        expect(buildInternalSubdomain(undefined, '000001')).toBe('tenant-000001');
        expect(buildInternalSubdomain('***', '000001')).toBe('tenant-000001');
    });

    it('cuts a long name at 24 characters without leaving a trailing hyphen', () => {
        const value = buildInternalSubdomain('Diakonisches Werk für Familien und mehr', '111111');
        expect(value).toBe('diakonisches-werk-f-r-fa-111111');
        expect(value).not.toMatch(/--/);
    });

    it('always matches the TenantService subdomain format', () => {
        ['Beispiel e.V.', 'Ärzte ohne Grenzen', '  -x-  ', 'A'.repeat(60)].forEach((name) => {
            expect(SUBDOMAIN_PATTERN.test(buildInternalSubdomain(name))).toBe(true);
        });
    });

    it('makes a six digit suffix', () => {
        expect(newInternalSubdomainSuffix()).toMatch(/^\d{6}$/);
    });
});
