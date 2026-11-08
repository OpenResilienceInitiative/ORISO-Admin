import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import type { AdminSidebarNavItem } from '../../components/Layout/AdminSidebar';
import type { HomeFacts } from './homeModel';
import { HomePage } from './HomePage';
import de from '../../locales/de/translation.json';

const state = vi.hoisted(() => ({
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
vi.mock('../../hooks/useUserPermission', () => ({ useUserPermissions: () => ({ can: () => true }) }));
vi.mock('../../hooks/useUserData.hook', () => ({ useUserData: () => ({ data: { firstName: 'Kim' } }) }));
vi.mock('../../components/Layout/useAdminNavigation', () => ({
    useAdminNavigation: () => ({
        navItems: state.navItems,
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
    });

    it('greets the admin and explains their level', () => {
        renderHome();

        expect(screen.getByRole('heading', { level: 1, name: 'Guten Tag, Kim' })).toBeTruthy();
        expect(screen.getByText(translations['home.intro.tenant'])).toBeTruthy();
    });

    it('shows one linked tile per reachable area, Home itself excluded', () => {
        renderHome();

        const areas = screen.getByRole('region', { name: 'Bereiche' });
        expect(
            within(areas)
                .getAllByRole('heading', { level: 3 })
                .map((heading) => heading.textContent),
        ).toEqual(['Organisation', 'Einladen', 'Konten', 'Einstellungen']);
        expect(within(areas).getByRole('link', { name: /Organisation/ })).toHaveAttribute('href', '/admin/agency');
    });

    it('lists the settings this role has, grouped', () => {
        renderHome();

        expect(screen.getByRole('link', { name: 'Rechtliches' })).toHaveAttribute(
            'href',
            '/admin/theme-settings/legal',
        );
        expect(screen.getByText('Technik')).toBeTruthy();
    });

    it('shows live counts as text', () => {
        state.facts = { agencies: 4, openInvites: 2, needsActionInvites: 1 };

        renderHome();

        expect(screen.getByText('4 Beratungsstellen')).toBeTruthy();
        expect(screen.getByText('2 Einladungen offen')).toBeTruthy();
        expect(screen.getByText('1 braucht Ihre Hilfe')).toBeTruthy();
    });

    it('uses the singular for one', () => {
        state.facts = { agencies: 1 };

        renderHome();

        expect(screen.getByText('1 Beratungsstelle')).toBeTruthy();
    });

    it('shows the checklist while steps are open, with state in text, not colour alone', () => {
        state.facts = { agencies: 1, consultants: 0, acceptedCounsellorInvites: 0 };

        renderHome();

        const checklist = screen.getByRole('region', { name: 'Erste Schritte' });
        expect(within(checklist).getByText('1 von 2 erledigt')).toBeTruthy();
        expect(within(checklist).getByRole('link', { name: /Beratungsstelle anlegen.*erledigt/ })).toBeTruthy();
        expect(within(checklist).getByRole('link', { name: 'Beratende einladen' })).toBeTruthy();
    });

    it('hides the checklist once everything is done', () => {
        state.facts = { agencies: 1, consultants: 5 };

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
