import { describe, expect, it } from 'vitest';
import { buildAgencyDataRequestBody, resolveAgencyTenantId } from './addAgencyData';

describe('buildAgencyDataRequestBody — ADR-003 single-select topic', () => {
    const parse = (consultingTypeId: string | number, formData: Record<string, any>) =>
        JSON.parse(buildAgencyDataRequestBody(consultingTypeId, formData, 1));

    it('sends the single-select Option as a one-element topicIds array', () => {
        // Would crash on the old `topics?.map` (an Option object has no .map) — this is the guard.
        const body = parse(1, { name: 'A', topicIds: { value: '7', label: 'Debt counselling' } });
        expect(body.topicIds).toEqual(['7']);
    });

    it('omits topicIds entirely when the picker was cleared', () => {
        const body = parse(1, { name: 'A', topicIds: undefined });
        expect(body).not.toHaveProperty('topicIds');
    });

    it('still accepts the legacy array shape', () => {
        const body = parse(1, { name: 'A', topicIds: [{ value: '3' }, { value: '9' }] });
        expect(body.topicIds).toEqual(['3', '9']);
    });
});

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
