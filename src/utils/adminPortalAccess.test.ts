import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { hasAdminPortalAccess, hasAdminPortalRole } from './adminPortalAccess';
import { UserRole } from '../enums/UserRole';

const browserAtob = (b64: string): string => Buffer.from(b64, 'base64').toString('binary');
const makeToken = (payload: unknown): string =>
    `header.${Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')}.sig`;

describe('hasAdminPortalRole', () => {
    it('returns true when any admin-portal role is present', () => {
        expect(hasAdminPortalRole([UserRole.RestrictedAgencyAdmin])).toBe(true);
        expect(hasAdminPortalRole(['some-other', UserRole.TenantAdmin])).toBe(true);
    });

    it('returns false for non-admin roles, empty, or default', () => {
        expect(hasAdminPortalRole([UserRole.Technical])).toBe(false);
        expect(hasAdminPortalRole(['random-role'])).toBe(false);
        expect(hasAdminPortalRole([])).toBe(false);
        expect(hasAdminPortalRole()).toBe(false);
    });
});

describe('hasAdminPortalAccess', () => {
    beforeAll(() => vi.stubGlobal('atob', browserAtob));
    afterAll(() => vi.unstubAllGlobals());

    it('returns false without a token', () => {
        expect(hasAdminPortalAccess()).toBe(false);
        expect(hasAdminPortalAccess('')).toBe(false);
    });

    it('returns true for a token carrying an admin-portal realm role', () => {
        const token = makeToken({ realm_access: { roles: ['offline_access', UserRole.UserAdmin] } });
        expect(hasAdminPortalAccess(token)).toBe(true);
    });

    it('returns false for a token without admin-portal roles', () => {
        const token = makeToken({ realm_access: { roles: [UserRole.Technical] } });
        expect(hasAdminPortalAccess(token)).toBe(false);
    });

    it('returns false (no throw) for a malformed token', () => {
        expect(hasAdminPortalAccess('not-a-jwt')).toBe(false);
    });
});
