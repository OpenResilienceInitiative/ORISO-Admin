import { describe, expect, it } from 'vite-plus/test';
import { UserRole } from '../../enums/UserRole';
import { hasRoleFor } from '../../components/Layout/adminNavFixtures';
import type { AdminSidebarNavItem } from '../../components/Layout/AdminSidebar';
import {
    buildChecklist,
    buildHomeTiles,
    groupSettingsTabs,
    mailServerStatus,
    pickHeroAction,
    resolveHomeRole,
} from './homeModel';
import { agencyPageComplete, isAgencyComplete, summariseOwnTenant } from './useHomeFacts';
import { mapTenantDataToTenantAdminData } from '../../utils/mapTenantDataToTenantAdminData';

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

const tree = {
    links: [
        { id: 'links:tenants', to: '/admin/links/tenants', labelKey: 'links.tabs.tenants' },
        { id: 'links:counsellor', to: '/admin/links/counsellor', labelKey: 'links.tabs.counsellor' },
    ],
    counselors: [
        {
            id: 'users:platform-admins',
            to: '/admin/users/platform-admins',
            labelKey: 'users.sectionPills.platformAdmins',
        },
        { id: 'users:tenant-admins', to: '/admin/users/tenant-admins', labelKey: 'users.sectionPills.tenantAdmins' },
        { id: 'users:counsellors', to: '/admin/users/consultants', labelKey: 'users.sectionPills.counsellors' },
    ],
    logs: [{ id: 'logs:deletions', to: '/admin/logs/deletions', labelKey: 'sidebar.deletionAudit' }],
};

describe('buildHomeTiles — only areas this admin can open', () => {
    it('puts inviting first and orders the platform admin tiles by section', () => {
        const tiles = buildHomeTiles({
            role: 'platform',
            navItems: nav('theme', 'tenants', 'agency', 'counselors', 'statistics', 'links', 'logs'),
            tree,
            canCreateAgency: true,
        });

        expect(tiles.map((tile) => [tile.id, tile.section])).toEqual([
            ['invite', 'people'],
            ['organisation', 'people'],
            ['accounts', 'people'],
            ['settings', 'configure'],
            ['statistics', 'observe'],
            ['logs', 'observe'],
        ]);
        expect(tiles.find((tile) => tile.id === 'organisation')?.to).toBe('/admin/tenants');
    });

    it('founds a Träger by invitation and lists what can be edited, Träger included', () => {
        const tiles = buildHomeTiles({
            role: 'platform',
            navItems: nav('tenants', 'agency', 'counselors', 'links'),
            tree,
            canCreateAgency: true,
        });
        const linksOf = (id: string) => tiles.find((tile) => tile.id === id)?.links.map((link) => link.labelKey);

        expect(linksOf('invite')).toEqual(['home.link.invite.tenants.platform', 'home.link.invite.counsellor']);
        expect(linksOf('organisation')).toEqual(['home.link.foundTenant', 'home.link.foundAgency']);
        expect(linksOf('accounts')).toEqual([
            'home.link.tenants',
            'home.link.agencies',
            'home.link.admins',
            'home.link.counsellors',
        ]);
    });

    it('groups the admin lists into one row, counts on the rows that have a fact', () => {
        const accounts = buildHomeTiles({
            role: 'platform',
            navItems: nav('tenants', 'agency', 'counselors'),
            tree,
        }).find((tile) => tile.id === 'accounts');

        expect(accounts?.links.map((link) => [link.id, link.count, link.separated])).toEqual([
            ['edit-tenants', 'tenants', undefined],
            ['edit-agencies', 'agencies', undefined],
            ['edit-admins', undefined, true],
            ['edit-counsellors', 'consultants', undefined],
        ]);
        expect(accounts?.links[2]).toMatchObject({
            to: '/admin/users/platform-admins',
            detailKeys: ['home.link.admins.platform-admins', 'home.link.admins.tenant-admins'],
        });
    });

    it('offers inviting BST-Admins only to whoever may hand out that role, on the Berater tab', () => {
        const linksFor = (canInviteAgencyAdmins: boolean) =>
            buildHomeTiles({ role: 'tenant', navItems: nav('links'), tree, canInviteAgencyAdmins })[0].links;

        expect(linksFor(true).map((link) => [link.id, link.to])).toEqual([
            ['links:tenants', '/admin/links/tenants'],
            ['invite-agency-admin', '/admin/links/counsellor'],
            ['links:counsellor', '/admin/links/counsellor'],
        ]);
        expect(linksFor(false).map((link) => link.id)).toEqual(['links:tenants', 'links:counsellor']);
    });

    it('points a Träger admin at founding Beratungsstellen, never at Träger', () => {
        const tiles = buildHomeTiles({
            role: 'tenant',
            navItems: nav('theme', 'agency', 'counselors', 'links'),
            tree: { links: tree.links },
            canCreateAgency: true,
        });
        const organisation = tiles.find((tile) => tile.id === 'organisation');

        expect(organisation?.to).toBe('/admin/agency');
        expect(organisation?.links.map((link) => link.id)).toEqual(['found-agency']);
        expect(tiles.find((tile) => tile.id === 'invite')?.links[0].labelKey).toBe('home.link.invite.tenants.other');
        expect(tiles.map((tile) => tile.textKey)).not.toContain('home.tile.organisation.platform');
    });

    it('drops tiles whose area the role cannot reach, and an organisation tile with nothing to found', () => {
        const tiles = buildHomeTiles({ role: 'agency', navItems: nav('agency', 'links') });

        expect(tiles.map((tile) => tile.id)).toEqual(['invite', 'accounts']);
    });

    it('never offers a Beratungsstellen admin to invite admins, the Träger tab is read-only for them', () => {
        const [invite] = buildHomeTiles({ role: 'agency', navItems: nav('links'), tree });

        expect(invite.links.map((link) => link.id)).toEqual(['links:counsellor']);
        expect(pickHeroAction('agency', [invite])).toEqual({
            to: '/admin/links/counsellor',
            labelKey: 'home.link.invite.counsellor',
            kind: 'invite',
        });
    });

    it('lists only the log views this admin may read', () => {
        const [logs] = buildHomeTiles({ role: 'platform', navItems: nav('logs'), tree });

        expect(logs.links.map((link) => link.to)).toEqual(['/admin/logs/deletions']);
        expect(logs.links[0].descriptionKey).toBe('home.logs.description.deletions');
    });

    it('leads each level with its first job, and only with what its tiles offer', () => {
        const tilesFor = (role: 'platform' | 'tenant', canCreateAgency: boolean) =>
            buildHomeTiles({ role, navItems: nav('tenants', 'agency', 'links'), tree, canCreateAgency });

        expect(pickHeroAction('platform', tilesFor('platform', true))).toMatchObject({
            to: '/admin/links/tenants',
            labelKey: 'home.hero.inviteTenant',
        });
        expect(pickHeroAction('tenant', tilesFor('tenant', true))).toMatchObject({
            labelKey: 'home.link.foundAgency',
            kind: 'found',
        });
        expect(pickHeroAction('tenant', tilesFor('tenant', false))).toMatchObject({
            labelKey: 'home.link.invite.counsellor',
        });
        expect(pickHeroAction('other', tilesFor('tenant', true))).toBeUndefined();
    });

    it('uses role-specific explanations', () => {
        const platform = buildHomeTiles({
            role: 'platform',
            navItems: nav('tenants', 'links'),
            tree,
        }).find((tile) => tile.id === 'organisation');
        const [agency] = buildHomeTiles({ role: 'agency', navItems: nav('agency') });

        expect(platform?.textKey).toBe('home.tile.organisation.platform');
        expect(agency.textKey).toBe('home.tile.accounts.agency');
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
        const steps = buildChecklist('agency', { consultants: 3, acceptedCounsellorInvites: 0 }, ALL);

        expect(steps.find((step) => step.id === 'invite-counsellors')).toMatchObject({ state: 'done' });
    });

    it('marks a step unknown when its fact could not be loaded', () => {
        const steps = buildChecklist('tenant', { consultants: undefined, acceptedCounsellorInvites: undefined }, ALL);

        expect(steps.every((step) => step.state === 'unknown')).toBe(true);
    });

    it('never shows a Beratungsstellen admin a Träger step', () => {
        const steps = buildChecklist('agency', {}, ALL);

        expect(steps.map((step) => step.id)).toEqual(['complete-agency', 'invite-counsellors']);
    });

    it('tells a Beratungsstellen admin whether the centre is complete', () => {
        expect(buildChecklist('agency', { agencyComplete: false }, ALL)[0]).toMatchObject({
            id: 'complete-agency',
            state: 'open',
        });
        expect(buildChecklist('agency', { agencyComplete: true }, ALL)[0].state).toBe('done');
    });
});

describe('buildChecklist — role perspectives from stored data (#1374)', () => {
    const WITH_SETTINGS = nav('theme', 'tenants', 'agency', 'counselors', 'links');

    it('starts the platform admin with the platform look, then Träger and their admins', () => {
        const steps = buildChecklist(
            'platform',
            { ownTenant: { appearanceComplete: true }, tenants: 0, acceptedTenantInvites: 0 },
            WITH_SETTINGS,
        );

        expect(steps.map((step) => [step.id, step.state])).toEqual([
            ['platform-appearance', 'done'],
            ['create-tenant', 'open'],
            ['invite-tenant-admins', 'open'],
        ]);
    });

    it('starts a Träger admin with the AVV, read from the stored DPA status', () => {
        const state = (dpaStatus: 'VALID' | 'UNSIGNED' | 'OUTDATED' | 'INCONSISTENT' | undefined) =>
            buildChecklist('tenant', { dpaStatus }, WITH_SETTINGS)[0];

        expect(state('VALID')).toMatchObject({ id: 'sign-dpa', state: 'done' });
        expect(state('UNSIGNED').state).toBe('open');
        expect(state('OUTDATED').state).toBe('open');
        expect(state('INCONSISTENT').state).toBe('unknown');
        expect(state(undefined).state).toBe('unknown');
    });

    it('shows the mail server step only to a Träger with its own mail server', () => {
        const ids = (smtpMode: 'OWN' | 'PLATFORM') =>
            buildChecklist(
                'tenant',
                { ownTenant: { appearanceComplete: false, smtpMode, smtpComplete: false } },
                WITH_SETTINGS,
            ).map((step) => step.id);

        expect(ids('OWN')).toEqual([
            'sign-dpa',
            'tenant-appearance',
            'check-mail-server',
            'create-agency',
            'invite-counsellors',
        ]);
        expect(ids('PLATFORM')).not.toContain('check-mail-server');
    });

    it('leads to Stammdaten while name or claim is missing, otherwise to Erscheinungsbild', () => {
        const first = (masterDataComplete: boolean) =>
            buildChecklist(
                'platform',
                { ownTenant: { appearanceComplete: false, masterDataComplete } },
                WITH_SETTINGS,
            )[0];

        expect(first(false).to).toBe('/admin/theme-settings/master-data');
        expect(first(true).to).toBe('/admin/theme-settings/general');
    });

    it('drops a settings step when this admin does not have that settings tab', () => {
        const steps = buildChecklist('tenant', {}, WITH_SETTINGS, ['/admin/theme-settings/legal']);

        expect(steps.map((step) => step.id)).toEqual(['sign-dpa', 'create-agency', 'invite-counsellors']);
    });
});

describe('summariseOwnTenant / isAgencyComplete', () => {
    it('needs name, claim and logo for a complete look', () => {
        const tenant = {
            id: 3,
            name: 'Caritas Süd',
            content: { claim: { de: 'Für Sie da' } },
            theming: { logo: 'x.png' },
        };

        expect(summariseOwnTenant(tenant)).toMatchObject({ appearanceComplete: true, masterDataComplete: true });
        expect(summariseOwnTenant({ ...tenant, theming: {} })).toMatchObject({
            appearanceComplete: false,
            masterDataComplete: true,
        });
        expect(summariseOwnTenant({ ...tenant, content: { claim: { de: ' ' } } })?.appearanceComplete).toBe(false);
    });

    it('reads a claim the tenant service returns top-level, like the settings editor does', () => {
        const fromTenantService = {
            id: 1,
            name: 'Plattform',
            claim: 'Für Sie da',
            content: { claim: '' },
            theming: { logo: 'logo.png' },
        } as unknown as Parameters<typeof mapTenantDataToTenantAdminData>[0];

        expect(summariseOwnTenant(mapTenantDataToTenantAdminData(fromTenantService))).toMatchObject({
            appearanceComplete: true,
            masterDataComplete: true,
        });
    });

    it('reads the SMTP block only when the API exposes it', () => {
        const base = { id: 3, name: 'x', settings: { smtpMode: 'OWN' } };
        const connection = { host: 'mail.x', port: 587, from: 'a@x', username: 'mailer' };

        expect(summariseOwnTenant(base)?.smtpComplete).toBeUndefined();
        expect(
            summariseOwnTenant({
                ...base,
                settings: { smtpMode: 'OWN', smtp: { ...connection, passwordSet: true } },
            })?.smtpComplete,
        ).toBe(true);
        // Older backends send the stored password instead of `passwordSet` (as the SMTP editor reads it).
        const legacy = (password: string) =>
            summariseOwnTenant({
                ...base,
                settings: { smtpMode: 'OWN', smtp: { ...connection, password } },
            })?.smtpComplete;
        expect(legacy('secret')).toBe(true);
        expect(legacy('  ')).toBe(false);
        // An explicit `passwordSet: false` wins over a leftover password value.
        expect(
            summariseOwnTenant({
                ...base,
                settings: { smtpMode: 'OWN', smtp: { ...connection, passwordSet: false, password: 'x' } },
            })?.smtpComplete,
        ).toBe(false);
        // Like the SMTP editor: no username or no valid port means not set up yet.
        const without = (patch: Record<string, unknown>) =>
            summariseOwnTenant({
                ...base,
                settings: { smtpMode: 'OWN', smtp: { ...connection, passwordSet: true, ...patch } },
            })?.smtpComplete;
        expect(without({ username: '' })).toBe(false);
        expect(without({ port: undefined })).toBe(false);
        expect(without({ port: 70000 })).toBe(false);
    });

    it('counts a centre complete with postcode and topics', () => {
        expect(isAgencyComplete({ postcode: '10115', topics: [{ id: 1 }] }, true)).toBe(true);
        expect(isAgencyComplete({ postcode: '10115', topics: [] }, true)).toBe(false);
        // Topics switched off ("topicsInRegistration"): the editor offers none, so none are required.
        expect(isAgencyComplete({ postcode: '10115', topics: [] })).toBe(true);
        expect(isAgencyComplete({ postcode: '', topics: [{ id: 1 }] })).toBe(false);
        expect(isAgencyComplete({ postcode: '10115' })).toBe(true);
    });

    it('stays unknown when more centres exist than one page shows', () => {
        const complete = { postcode: '10115', topics: [{ id: 1 }] };

        expect(agencyPageComplete([complete, complete], 2)).toBe(true);
        expect(agencyPageComplete([complete, complete], 25)).toBeNull();
        expect(agencyPageComplete([], 0)).toBe(false);
        // No total in the answer: unknown, neither open nor done.
        expect(agencyPageComplete([], undefined)).toBeNull();
        expect(agencyPageComplete([complete, complete])).toBeNull();
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
            ['communication', ['/s/legal', '/s/smtp']],
        ]);
        expect(groups[0].items[0].iconName).toBe('appearance');
        expect(groups[1].items.map((item) => [item.descriptionKey, item.isMailServer])).toEqual([
            ['home.settings.description.legal', undefined],
            ['home.settings.description.smtp', true],
        ]);
    });

    it('describes Funktionszugriff per level', () => {
        const tabs = [{ to: '/s/permissions', titleKey: 'settings.subhead.functionAccess', iconName: 'x' }];

        expect(groupSettingsTabs(tabs, 'platform')[0].items[0].descriptionKey).toBe(
            'home.settings.description.permissions.platform',
        );
        expect(groupSettingsTabs(tabs, 'tenant')[0].items[0].descriptionKey).toBe(
            'home.settings.description.permissions.tenant',
        );
    });
});

describe('mailServerStatus', () => {
    it('shows a status only for an own mail server whose SMTP block was read', () => {
        expect(mailServerStatus({ appearanceComplete: true, smtpMode: 'OWN', smtpComplete: true })).toBe('complete');
        expect(mailServerStatus({ appearanceComplete: true, smtpMode: 'OWN', smtpComplete: false })).toBe('incomplete');
        expect(mailServerStatus({ appearanceComplete: true, smtpMode: 'OWN' })).toBeUndefined();
        expect(
            mailServerStatus({ appearanceComplete: true, smtpMode: 'PLATFORM', smtpComplete: true }),
        ).toBeUndefined();
        expect(mailServerStatus(undefined)).toBeUndefined();
    });
});
