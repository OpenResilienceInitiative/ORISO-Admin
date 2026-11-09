import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AdminSidebarNavItem } from '../../components/Layout/AdminSidebar';
import type { HomeFacts } from './homeModel';
import { HomePage } from './HomePage';
import de from '../../locales/de/translation.json';
import { Resource } from '../../enums/Resource';

const state = vi.hoisted(() => ({
    canCreateAgency: true,
    roles: { isSuperAdmin: false, isTenantScopedAdmin: true, roles: ['tenant-admin'] as string[] },
    navItems: [] as AdminSidebarNavItem[],
    facts: {} as HomeFacts,
}));

const translations = de as Record<string, string>;
const t = (key: string, options?: Record<string, unknown>) =>
    (translations[key] ?? key).replace(/{{\s*(\w+)\s*}}/g, (_, name: string) => String(options?.[name] ?? ''));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t }) }));

vi.mock('../../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        ...state.roles,
        hasRole: (role: string | string[]) => [role].flat().some((r) => state.roles.roles.includes(r)),
    }),
}));
vi.mock('../../hooks/useUserPermission', () => ({
    useUserPermissions: () => ({
        can: (action: string, resource: unknown) =>
            !(action === 'create' && String(resource) === String(Resource.Agency)) || state.canCreateAgency,
    }),
}));
vi.mock('../../hooks/useUserData.hook', () => ({ useUserData: () => ({ data: { firstName: 'Kim' } }) }));
vi.mock('../../components/Layout/useAdminNavigation', () => ({
    useAdminNavigation: () => ({
        navItems: state.navItems,
        tree: {
            links: [{ id: 'links:counsellor', to: '/admin/links/counsellor', labelKey: 'links.tabs.counsellor' }],
        },
        settingsTabs: [
            { to: '/admin/theme-settings/legal', titleKey: 'settings.subhead.legal', iconName: 'legal' },
            { to: '/admin/theme-settings/smtp', titleKey: 'settings.subhead.smtp', iconName: 'email_server' },
        ],
    }),
}));
vi.mock('./useHomeFacts', () => ({ useHomeFacts: () => state.facts }));

const nav = (...keys: string[]): AdminSidebarNavItem[] =>
    keys.map((key) => ({ key, to: `/admin/${key}`, label: key, iconPath: `/admin/${key}` }));

const renderHome = () =>
    render(
        <MemoryRouter>
            <HomePage />
        </MemoryRouter>,
    );

describe('HomePage (ORISO-Admin#1323)', () => {
    beforeEach(() => {
        state.roles = { isSuperAdmin: false, isTenantScopedAdmin: true, roles: ['tenant-admin'] };
        state.navItems = nav('home', 'theme', 'agency', 'counselors', 'links');
        state.facts = {};
        state.canCreateAgency = true;
    });

    it('offers founding a Beratungsstelle only with the Create Agency permission', () => {
        state.canCreateAgency = false;

        renderHome();

        expect(screen.queryByRole('link', { name: 'Beratungsstelle gründen' })).toBeNull();
        expect(screen.queryByRole('heading', { level: 3, name: 'Organisation' })).toBeNull();
    });

    it('greets the admin and explains their level', () => {
        renderHome();

        expect(screen.getByRole('heading', { level: 1, name: 'Guten Tag, Kim' })).toBeTruthy();
        expect(screen.getByText(translations['home.intro.tenant'])).toBeTruthy();
    });

    it('groups the reachable areas into sections, inviting first, Home itself excluded', () => {
        renderHome();

        const people = screen.getByRole('region', { name: 'Wen Sie anlegen' });
        expect(
            within(people)
                .getAllByRole('heading', { level: 3 })
                .map((heading) => heading.textContent),
        ).toEqual(['Einladen', 'Organisation', 'Bestehendes bearbeiten']);
        expect(within(people).getByRole('link', { name: /^Organisation/ })).toHaveAttribute('href', '/admin/agency');
        expect(within(people).getByRole('link', { name: 'Beratende einladen' })).toHaveAttribute(
            'href',
            '/admin/links/counsellor',
        );
        expect(screen.getByRole('region', { name: 'Was Sie einstellen' })).toBeTruthy();
    });

    it('lists the settings this role has, grouped', () => {
        renderHome();

        expect(screen.getByRole('link', { name: /^Rechtliches/ })).toHaveAttribute(
            'href',
            '/admin/theme-settings/legal',
        );
        expect(screen.getByRole('heading', { level: 4, name: 'Recht & Kommunikation' })).toBeTruthy();
    });

    it('offers the welcome video in German and English, with a placeholder until it is uploaded', () => {
        renderHome();

        const video = screen.getByRole('region', { name: 'Einführungsvideo' });
        expect(within(video).getByRole('checkbox', { name: 'Deutsch' })).toHaveAttribute('aria-checked', 'true');
        expect(within(video).getByRole('checkbox', { name: 'English' })).toHaveAttribute('aria-checked', 'false');
        expect(within(video).getByRole('img', { name: 'Das Video folgt in Kürze.' })).toBeTruthy();
        expect(within(video).getByText('Platzhalter · ca. 3 Min.')).toBeTruthy();
    });

    it('shows live counts on the rows they belong to, and stuck invitations in the tile header', () => {
        state.facts = { agencies: 4, consultants: 12, openInvites: 2, needsActionInvites: 1 };

        renderHome();

        const accounts = screen.getByRole('link', { name: /^Beratungsstellen\s*4$/ });
        expect(accounts).toHaveAttribute('href', '/admin/agency');
        expect(screen.getByText('2 Einladungen offen')).toBeTruthy();
        expect(screen.getByRole('link', { name: /^Einladen\s*1 braucht Aktion$/ })).toBeTruthy();
    });

    it('shows no count and no badge for facts that did not load', () => {
        renderHome();

        expect(screen.getByRole('link', { name: /^Beratungsstellen$/ })).toBeTruthy();
        expect(screen.queryByText(/braucht Aktion|brauchen Aktion/)).toBeNull();
        expect(screen.queryByText(/Einladung(en)? offen/)).toBeNull();
    });

    it('uses the singular for one', () => {
        state.facts = { openInvites: 1 };

        renderHome();

        expect(screen.getByText('1 Einladung offen')).toBeTruthy();
    });

    it('leads with the role-specific first job', () => {
        renderHome();

        const hero = screen.getByRole('banner');
        expect(within(hero).getByRole('link', { name: 'Beratungsstelle gründen' })).toHaveAttribute(
            'href',
            '/admin/agency/add',
        );
        expect(within(hero).queryByRole('link', { name: /Rundgang/ })).toBeNull();
    });

    it('offers inviting BST-Admins to a Träger admin, never to a Beratungsstellen admin', () => {
        state.roles = { isSuperAdmin: false, isTenantScopedAdmin: true, roles: ['tenant-admin'] };
        const { unmount } = renderHome();

        expect(screen.getByRole('link', { name: 'Beratungsstellen-Admin einladen' })).toHaveAttribute(
            'href',
            '/admin/links/counsellor',
        );
        unmount();

        state.roles = { isSuperAdmin: false, isTenantScopedAdmin: false, roles: ['restricted-agency-admin'] };
        renderHome();

        expect(screen.queryByRole('link', { name: 'Beratungsstellen-Admin einladen' })).toBeNull();
    });

    it('describes each setting and shows the mail server status only when it can be read', () => {
        state.facts = { ownTenant: { appearanceComplete: true, smtpMode: 'OWN', smtpComplete: false } };

        renderHome();

        expect(screen.getByRole('link', { name: /^Rechtliches\s*Impressum, Datenschutz und Verträge$/ })).toBeTruthy();
        expect(screen.getByRole('link', { name: /^Email Server.*Unvollständig$/ })).toBeTruthy();
    });

    it('shows no mail server status for the platform mail server', () => {
        state.facts = { ownTenant: { appearanceComplete: true, smtpMode: 'PLATFORM', smtpComplete: true } };

        renderHome();

        expect(screen.queryByText('Eingerichtet')).toBeNull();
        expect(screen.queryByText('Unvollständig')).toBeNull();
    });

    it('shows the checklist while steps are open, with state in text, not colour alone', () => {
        state.facts = { dpaStatus: 'UNSIGNED', agencies: 1, consultants: 0, acceptedCounsellorInvites: 0 };

        renderHome();

        const checklist = screen.getByRole('region', { name: 'Erste Schritte' });
        expect(within(checklist).getByText('1 von 3 erledigt')).toBeTruthy();
        // The AVV comes first and reads the stored DPA status (#1374).
        const [first] = within(checklist).getAllByRole('link');
        expect(first).toHaveAccessibleName(/^Auftragsverarbeitungsvertrag.*Weiter$/);
        // The first open step leads; the others are plain rows.
        expect(first).toHaveAttribute('aria-current', 'step');
        expect(within(checklist).getByRole('link', { name: /^Beratungsstelle anlegen\s*Erledigt$/ })).toBeTruthy();
        const counsellors = within(checklist).getByRole('link', { name: /^Beratende einladen/ });
        expect(counsellors).not.toHaveAttribute('aria-current');
        expect(counsellors).not.toHaveAccessibleName(/Weiter/);
        expect(within(checklist).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
    });

    it('never leads with a step whose state could not be loaded', () => {
        state.facts = { agencies: 1 };

        renderHome();

        const checklist = screen.getByRole('region', { name: 'Erste Schritte' });
        const avv = within(checklist).getByRole('link', { name: /^Auftragsverarbeitungsvertrag/ });
        expect(avv).toHaveAccessibleName(/Status konnte nicht geladen werden/);
        expect(avv).not.toHaveAttribute('aria-current');
        expect(within(checklist).queryByText('Weiter')).toBeNull();
    });

    it('hides the checklist once everything is done', () => {
        state.facts = { dpaStatus: 'VALID', agencies: 1, consultants: 5 };

        renderHome();

        expect(screen.queryByRole('region', { name: 'Erste Schritte' })).toBeNull();
    });

    it('never shows a Beratungsstellen admin Träger content', () => {
        state.roles = { isSuperAdmin: false, isTenantScopedAdmin: false, roles: ['restricted-agency-admin'] };
        state.navItems = nav('home', 'agency', 'links');

        renderHome();

        expect(screen.queryByText(/Träger/)).toBeNull();
        expect(screen.getByText(translations['home.intro.agency'])).toBeTruthy();
    });
});
