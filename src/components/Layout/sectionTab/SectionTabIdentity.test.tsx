import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, useNavigate } from 'react-router-dom';
import i18next from 'i18next';
import { I18nextProvider, initReactI18next, useTranslation } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it } from 'vite-plus/test';
import routePathNames from '../../../appConfig';
import { applyBrandingFavicon } from '../../../utils/applyBrandingFavicon';
import type { AdminSidebarNavItem } from '../AdminSidebar';
import { SectionTabIdentity } from './SectionTabIdentity';

const i18n = i18next.createInstance();
i18n.use(initReactI18next).init({
    lng: 'de',
    initImmediate: false,
    resources: {
        de: { translation: { 'sidebar.users': 'Konten', 'sidebar.account': 'Mein Account' } },
        en: { translation: { 'sidebar.users': 'Accounts', 'sidebar.account': 'My account' } },
    },
});

let go: (to: string) => void = () => {};
const Navigator = () => {
    const navigate = useNavigate();
    go = (to) => navigate(to);
    return null;
};

// Like ProtectedPageLayoutWrapper: labels come translated from useAdminNavigation.
const Shell = () => {
    const { t } = useTranslation();
    const navItems: AdminSidebarNavItem[] = [
        {
            key: 'counselors',
            to: routePathNames.consultants,
            label: t('sidebar.users'),
            iconPath: routePathNames.users,
            activeMatch: { paths: [routePathNames.users], mode: 'includes' },
        },
    ];
    const accountItem: AdminSidebarNavItem = {
        key: 'account',
        to: routePathNames.userProfile,
        label: t('sidebar.account'),
        iconPath: routePathNames.userProfile,
    };
    return <SectionTabIdentity navItems={navItems} accountItem={accountItem} />;
};

const INDEX_HTML_HEAD = [
    '<title>Online-Beratung Admin</title>',
    '<link rel="icon" href="/favicon.ico" />',
    '<link rel="icon" type="image/png" sizes="192x192" href="/android-icon-192x192.png" />',
    '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />',
    '<link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png" />',
    '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />',
].join('');
const DEFAULT_HREFS = [
    '/favicon.ico',
    '/android-icon-192x192.png',
    '/favicon-32x32.png',
    '/favicon-96x96.png',
    '/favicon-16x16.png',
];

const iconHrefs = () =>
    Array.from(document.querySelectorAll<HTMLLinkElement>("link[rel~='icon']")).map(
        (link) => link.getAttribute('href') ?? '',
    );
const svgOf = (href: string) => decodeURIComponent(href.slice('data:image/svg+xml,'.length));

describe('SectionTabIdentity', () => {
    let container: HTMLDivElement;
    let root: Root;

    const render = (path: string) =>
        act(() => {
            root.render(
                <I18nextProvider i18n={i18n}>
                    <MemoryRouter initialEntries={[path]}>
                        <Navigator />
                        <Shell />
                    </MemoryRouter>
                </I18nextProvider>,
            );
        });

    beforeEach(() => {
        // jsdom has no canvas: the PNG fallback is skipped here (covered in Storybook).
        HTMLCanvasElement.prototype.getContext = (() => null) as unknown as HTMLCanvasElement['getContext'];
        document.head.innerHTML = INDEX_HTML_HEAD;
        document.documentElement.style.setProperty('--m3-primary', '#a5000a');
        document.documentElement.style.setProperty('--m3-on-primary', '#ffffff');
        container = document.createElement('div');
        document.body.appendChild(container);
        root = createRoot(container);
    });

    afterEach(async () => {
        act(() => root.unmount());
        container.remove();
        document.documentElement.removeAttribute('style');
        await act(() => i18n.changeLanguage('de'));
    });

    it('shows the section glyph on a primary tile and follows route changes', () => {
        render('/admin/users/consultants');
        const users = iconHrefs()[0];
        expect(iconHrefs()).toEqual(Array(5).fill(users));
        expect(users.startsWith('data:image/svg+xml,')).toBe(true);
        expect(svgOf(users)).toContain('fill="#a5000a"');
        expect(svgOf(users)).toContain('{fill:#ffffff}');
        expect(svgOf(users)).toContain('M20 34.2362');

        act(() => go('/admin/profil/'));
        const profile = iconHrefs()[0];
        expect(profile).not.toBe(users);
        expect(profile.startsWith('data:image/svg+xml,')).toBe(true);
    });

    it('titles the tab with only the section name, in the active language', async () => {
        render('/admin/users/tenant-admins');
        expect(document.title).toBe('Konten');

        await act(() => i18n.changeLanguage('en'));
        expect(document.title).toBe('Accounts');

        act(() => go('/admin/profil/'));
        expect(document.title).toBe('My account');
    });

    it('keeps the default favicon and title on routes without a section', () => {
        render('/admin/nowhere');
        expect(iconHrefs()).toEqual(DEFAULT_HREFS);
        expect(document.title).toBe('Online-Beratung Admin');
    });

    it('restores the default favicon and title on leaving a section and on unmount (logout)', () => {
        render('/admin/profil/');
        expect(document.title).toBe('Mein Account');
        act(() => go('/admin/nowhere'));
        expect(iconHrefs()).toEqual(DEFAULT_HREFS);
        expect(document.title).toBe('Online-Beratung Admin');

        act(() => go('/admin/profil/'));
        act(() => root.unmount());
        expect(iconHrefs()).toEqual(DEFAULT_HREFS);
        expect(document.title).toBe('Online-Beratung Admin');
        root = createRoot(container);
    });

    it('returns to a tenant favicon that arrived while the section icon showed', () => {
        render('/admin/profil/');
        applyBrandingFavicon('data:image/x-icon;base64,AAAB');
        expect(iconHrefs()[0].startsWith('data:image/svg+xml,')).toBe(true);
        act(() => go('/admin/nowhere'));
        expect(iconHrefs()).toEqual(Array(5).fill('data:image/x-icon;base64,AAAB'));
    });

    it('redraws in the new colours when the Träger theme changes', async () => {
        render('/admin/profil/');
        expect(svgOf(iconHrefs()[0])).toContain('fill="#a5000a"');

        await act(async () => {
            document.documentElement.style.setProperty('--m3-primary', '#1c4f8f');
            document.documentElement.style.setProperty('--m3-on-primary', '#f0f0f0');
            await Promise.resolve();
        });
        expect(svgOf(iconHrefs()[0])).toContain('fill="#1c4f8f"');
        expect(svgOf(iconHrefs()[0])).toContain('{fill:#f0f0f0}');
    });
});
