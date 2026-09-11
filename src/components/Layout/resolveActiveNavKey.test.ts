import { describe, expect, it } from 'vitest';
import type { AdminSidebarNavItem } from './AdminSidebar';
import { resolveActiveNavKey } from './resolveActiveNavKey';

const item = (
    overrides: Partial<AdminSidebarNavItem> & Pick<AdminSidebarNavItem, 'key' | 'to'>,
): AdminSidebarNavItem => ({
    label: overrides.key,
    iconPath: overrides.key,
    ...overrides,
});

describe('resolveActiveNavKey', () => {
    it('picks the longest prefix match', () => {
        const items = [item({ key: 'tenants', to: '/admin/tenants' }), item({ key: 'agency', to: '/admin/agency' })];

        expect(resolveActiveNavKey(items, '/admin/tenants/7/legal-settings')).toBe('tenants');
    });

    it('honours includes activeMatch for sibling user hubs', () => {
        const items = [
            item({
                key: 'counselors',
                to: '/admin/users/tenant-admins',
                activeMatch: { paths: ['/admin/users'], mode: 'includes' },
            }),
            item({ key: 'tenants', to: '/admin/tenants' }),
        ];

        expect(resolveActiveNavKey(items, '/admin/users/consultants')).toBe('counselors');
    });

    it('honours startsWith activeMatch for logs siblings', () => {
        const items = [
            item({
                key: 'logs',
                to: '/admin/logs/case-handover',
                activeMatch: { paths: ['/admin/logs'], mode: 'startsWith' },
            }),
        ];

        expect(resolveActiveNavKey(items, '/admin/logs')).toBe('logs');
        expect(resolveActiveNavKey(items, '/admin/logs/inactive-accounts')).toBe('logs');
    });

    it('returns undefined when nothing matches', () => {
        expect(resolveActiveNavKey([item({ key: 'tenants', to: '/admin/tenants' })], '/admin/other')).toBeUndefined();
    });
});
