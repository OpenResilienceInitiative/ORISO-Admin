import { describe, expect, it } from 'vite-plus/test';
import { UserRole } from '../../enums/UserRole';
import { hasRoleFor } from '../../components/Layout/adminNavFixtures';
import type { AdminSidebarNavItem } from '../../components/Layout/AdminSidebar';
import { buildChecklist, buildHomeTiles, groupSettingsTabs, resolveHomeRole } from './homeModel';

const nav = (...keys: string[]): AdminSidebarNavItem[] =>
    keys.map((key) => ({ key, to: `/admin/${key}`, label: key, iconPath: `/admin/${key}` }));

describe('resolveHomeRole', () => {
    it('tells the three admin levels apart', () => {
        expect(resolveHomeRole({ isSuperAdmin: true, isTenantScopedAdmin: false, hasRole: hasRoleFor() })).toBe(
            'platform',
        );
        expect(
            resolveHomeRole({
                isSuperAdmin: false,
                isTenantScopedAdmin: true,
                hasRole: hasRoleFor(UserRole.TenantAdmin),
            }),
        ).toBe('tenant');
        expect(
            resolveHomeRole({
                isSuperAdmin: false,
                isTenantScopedAdmin: false,
                hasRole: hasRoleFor(UserRole.RestrictedAgencyAdmin),
            }),
        ).toBe('agency');
    });
});

describe('buildHomeTiles — only areas this admin can open', () => {
    it('gives the platform admin Träger as the organisation entry', () => {
        const tiles = buildHomeTiles({
            role: 'platform',
            navItems: nav('theme', 'tenants', 'agency', 'counselors', 'statistics', 'links', 'logs'),
        });

        expect(tiles.map((tile) => tile.id)).toEqual([
            'organisation',
            'invite',
            'accounts',
            'settings',
            'statistics',
            'logs',
        ]);
        expect(tiles[0].to).toBe('/admin/tenants');
    });

    it('points a Träger admin at their Beratungsstellen, never at Träger', () => {
        const tiles = buildHomeTiles({ role: 'tenant', navItems: nav('theme', 'agency', 'counselors', 'links') });

        expect(tiles.find((tile) => tile.id === 'organisation')?.to).toBe('/admin/agency');
        expect(tiles.map((tile) => tile.textKey)).not.toContain('home.tile.organisation.platform');
    });

    it('drops tiles whose area the role cannot reach', () => {
        const tiles = buildHomeTiles({ role: 'agency', navItems: nav('agency', 'links') });

        expect(tiles.map((tile) => tile.id)).toEqual(['organisation', 'invite']);
    });

    it('uses role-specific explanations', () => {
        const [platform] = buildHomeTiles({ role: 'platform', navItems: nav('tenants') });
        const [agency] = buildHomeTiles({ role: 'agency', navItems: nav('agency') });

        expect(platform.textKey).toBe('home.tile.organisation.platform');
        expect(agency.textKey).toBe('home.tile.organisation.agency');
    });
});

const ALL = nav('tenants', 'agency', 'links');

describe('buildChecklist — derived from data, never stored', () => {
    it('drops a step whose area this admin cannot open, so it never links into a dead end', () => {
        const steps = buildChecklist('tenant', { agencies: 0, consultants: 0 }, nav('links'));

        expect(steps.map((step) => step.id)).toEqual(['invite-counsellors']);
    });

    it('walks the platform admin through Träger and their admins', () => {
        const steps = buildChecklist('platform', { tenants: 2, acceptedTenantInvites: 0 }, ALL);

        expect(steps.map((step) => [step.id, step.state])).toEqual([
            ['create-tenant', 'done'],
            ['invite-tenant-admins', 'open'],
        ]);
    });

    it('walks a Träger admin through agencies and counsellors', () => {
        const steps = buildChecklist('tenant', { agencies: 0, consultants: 0, acceptedCounsellorInvites: 0 }, ALL);

        expect(steps.map((step) => [step.id, step.state])).toEqual([
            ['create-agency', 'open'],
            ['invite-counsellors', 'open'],
        ]);
    });

    it('counts counsellors who already have an account as done, even without an invitation', () => {
        const [step] = buildChecklist('agency', { consultants: 3, acceptedCounsellorInvites: 0 }, ALL);

        expect(step).toMatchObject({ id: 'invite-counsellors', state: 'done' });
    });

    it('marks a step unknown when its fact could not be loaded', () => {
        const steps = buildChecklist('tenant', { consultants: undefined, acceptedCounsellorInvites: undefined }, ALL);

        expect(steps.every((step) => step.state === 'unknown')).toBe(true);
    });

    it('never shows a Beratungsstellen admin a Träger step', () => {
        const steps = buildChecklist('agency', {}, ALL);

        expect(steps.map((step) => step.id)).toEqual(['invite-counsellors']);
    });
});

describe('groupSettingsTabs', () => {
    it('groups the tabs this role has, in a fixed order, and skips empty groups', () => {
        const groups = groupSettingsTabs([
            { to: '/s/legal', titleKey: 'settings.subhead.legal', iconName: 'legal' },
            { to: '/s/smtp', titleKey: 'settings.subhead.smtp', iconName: 'email_server' },
            { to: '/s/general', titleKey: 'settings.subhead.view', iconName: 'appearance' },
        ]);

        expect(groups.map((group) => [group.id, group.items.map((item) => item.to)])).toEqual([
            ['appearance', ['/s/general']],
            ['legal', ['/s/legal']],
            ['technical', ['/s/smtp']],
        ]);
    });
});
