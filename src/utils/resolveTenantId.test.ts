import { describe, expect, it } from 'vitest';
import { resolveTenantId } from './resolveTenantId';

describe('resolveTenantId', () => {
    it('preserves the technical platform tenant id', () => {
        expect(resolveTenantId(undefined, 0)).toBe('0');
    });

    it('prefers an explicitly selected tenant', () => {
        expect(resolveTenantId('42', 0)).toBe('42');
    });

    it('returns an empty value only when neither id exists', () => {
        expect(resolveTenantId(undefined, undefined)).toBe('');
    });
});
