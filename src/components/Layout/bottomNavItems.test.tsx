import { describe, expect, it } from 'vitest';
import type { AdminSidebarNavItem } from './AdminSidebar';
import { resolveActiveNavKey, toBottomNavItems } from './bottomNavItems';

const items: AdminSidebarNavItem[] = [
    { key: 'theme', to: '/admin/settings/general', label: 'Einstellungen', iconPath: '/admin/settings' },
    { key: 'logs', to: '/admin/logs', label: 'Logs', iconPath: '/admin/logs' },
    { key: 'activity-logs', to: '/admin/logs/activity', label: 'Aktivitäts-Logs', iconPath: '/admin/logs/activity' },
    {
        key: 'links',
        to: '/admin/links',
        label: 'Links',
        iconPath: '/admin/links',
        activeMatch: { paths: ['/admin/invites'], mode: 'startsWith' },
    },
];

describe('toBottomNavItems', () => {
    it('carries the label and route over unchanged', () => {
        expect(toBottomNavItems(items)[0]).toMatchObject({
            key: 'theme',
            label: 'Einstellungen',
            to: '/admin/settings/general',
        });
    });

    it('gives every destination a selected and an unselected icon', () => {
        toBottomNavItems(items).forEach((item) => {
            expect(item.icon).toBeTruthy();
            expect(item.activeIcon).toBeTruthy();
        });
    });

    it('falls back to a generic icon for an unknown key instead of rendering a hole', () => {
        const [item] = toBottomNavItems([{ key: 'brand-new', to: '/admin/x', label: 'Neu', iconPath: '/admin/x' }]);

        expect(item.icon).toBeTruthy();
        expect(item.activeIcon).toBeTruthy();
    });
});

describe('resolveActiveNavKey', () => {
    it('matches the exact route', () => {
        expect(resolveActiveNavKey(items, '/admin/logs')).toBe('logs');
    });

    it('matches a sub-route of a destination', () => {
        expect(resolveActiveNavKey(items, '/admin/settings/general/appearance')).toBe('theme');
    });

    it('prefers the longest match so a nested route does not light up its parent', () => {
        expect(resolveActiveNavKey(items, '/admin/logs/activity')).toBe('activity-logs');
    });

    it('honours activeMatch for routes that live outside the destination', () => {
        expect(resolveActiveNavKey(items, '/admin/invites/new')).toBe('links');
    });

    it('marks nothing when the route belongs to no destination', () => {
        expect(resolveActiveNavKey(items, '/admin/profile')).toBeUndefined();
    });

    it('does not treat a shared prefix as a match', () => {
        expect(resolveActiveNavKey(items, '/admin/logsomething')).toBeUndefined();
    });
});
