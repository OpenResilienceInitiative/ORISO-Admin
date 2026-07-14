import { describe, expect, it } from 'vitest';
import { normalizedPagePath } from './normalizedPagePath';

describe('normalizedPagePath', () => {
    it('strips a query string', () => {
        expect(normalizedPagePath('/admin/agencies?page=2&sort=name')).toBe('/admin/agencies');
    });

    it('replaces a numeric path segment with :id', () => {
        expect(normalizedPagePath('/admin/agencies/42')).toBe('/admin/agencies/:id');
    });

    it('replaces multiple numeric path segments with :id', () => {
        expect(normalizedPagePath('/admin/tenants/7/agencies/42')).toBe('/admin/tenants/:id/agencies/:id');
    });

    it('replaces a UUID path segment with :id', () => {
        expect(normalizedPagePath('/admin/consultants/3fa85f64-5717-4562-b3fc-2c963f66afa6')).toBe(
            '/admin/consultants/:id',
        );
    });

    it('replaces a bare hex-looking id segment of 8+ chars with :id', () => {
        expect(normalizedPagePath('/admin/users/0123abcd')).toBe('/admin/users/:id');
    });

    it('strips the query string and normalizes a UUID segment together', () => {
        expect(normalizedPagePath('/admin/agencies/3fa85f64-5717-4562-b3fc-2c963f66afa6?tab=settings')).toBe(
            '/admin/agencies/:id',
        );
    });

    it('leaves short, non-id, non-numeric segments untouched', () => {
        expect(normalizedPagePath('/admin/agencies/create')).toBe('/admin/agencies/create');
    });

    it('leaves a route with no dynamic segments untouched', () => {
        expect(normalizedPagePath('/admin/dashboard')).toBe('/admin/dashboard');
    });

    it('defaults to window.location.pathname when called with no argument', () => {
        const originalPathname = window.location.pathname;
        try {
            window.history.pushState({}, '', '/admin/agencies/42?page=2');
            expect(normalizedPagePath()).toBe('/admin/agencies/:id');
        } finally {
            window.history.pushState({}, '', originalPathname);
        }
    });
});
