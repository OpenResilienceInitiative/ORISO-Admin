import { describe, expect, it } from 'vitest';
import { resolveAgencyTenantId } from './addAgencyData';

describe('resolveAgencyTenantId', () => {
    it('prefers the explicitly selected tenant from the agency form', () => {
        expect(resolveAgencyTenantId('42', 7)).toBe(42);
    });

    it('falls back to a tenant-admin token tenant', () => {
        expect(resolveAgencyTenantId(undefined, '7')).toBe(7);
    });

    it('rejects the super-admin tenant 0 when no tenant was selected', () => {
        expect(resolveAgencyTenantId(undefined, 0)).toBeUndefined();
    });

    it('rejects missing tenant context when no tenant was selected', () => {
        expect(resolveAgencyTenantId(undefined, undefined)).toBeUndefined();
    });

    it('rejects explicit tenant 0 even when provided as a string', () => {
        expect(resolveAgencyTenantId('0', 0)).toBeUndefined();
    });
});
