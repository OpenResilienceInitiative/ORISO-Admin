import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildListQueryString, inviteLinkHeaders, normalizeListResponse } from './inviteLinkApiShared';

const mocks = vi.hoisted(() => ({
    parseUserAuthInfo: vi.fn(),
}));

vi.mock('../../utils/parseUserAuthInfo', () => ({
    parseUserAuthInfo: mocks.parseUserAuthInfo,
}));

describe('invite link API shared helpers', () => {
    beforeEach(() => {
        mocks.parseUserAuthInfo.mockReset();
    });

    it('uses an explicit tenant id header when provided', () => {
        expect(inviteLinkHeaders(42)).toEqual({ 'X-Tenant-Id': '42' });
        expect(mocks.parseUserAuthInfo).not.toHaveBeenCalled();
    });

    it('falls back to the authenticated user tenant id', () => {
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: 7 });

        expect(inviteLinkHeaders()).toEqual({ 'X-Tenant-Id': '7' });
    });

    it('falls back to tenant 1 when no positive tenant is available', () => {
        mocks.parseUserAuthInfo.mockReturnValue({ tenantId: 0 });

        expect(inviteLinkHeaders()).toEqual({ 'X-Tenant-Id': '1' });
    });

    it('builds pagination query strings', () => {
        expect(buildListQueryString(2, 50)).toBe('page=2&size=50');
    });

    it('normalizes array responses into paged responses', () => {
        expect(normalizeListResponse([{ id: 1 }, { id: 2 }], 3, 10)).toEqual({
            content: [{ id: 1 }, { id: 2 }],
            page: 3,
            size: 10,
            totalElements: 2,
            totalPages: 1,
        });
    });

    it('fills missing paged response fields with safe defaults', () => {
        expect(normalizeListResponse({ content: undefined } as any, 1, 20)).toEqual({
            content: [],
            page: 1,
            size: 20,
            totalElements: 0,
            totalPages: 0,
        });
    });
});
