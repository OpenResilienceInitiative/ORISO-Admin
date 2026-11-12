import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vite-plus/test';
import { MemoryRouter } from 'react-router-dom';
import { MobileNavProvider } from '../AdminMobileNav/MobileNavContext';
import { AdminMobileNavBar } from '../Layout/AdminMobileNavBar';
import { Page } from './index';

vi.mock('../../hooks/useIsDesktopLayout.hook', () => ({ useIsDesktopLayout: () => true }));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, options?: { parent?: string }) => (options?.parent ? `${key}(${options.parent})` : key),
    }),
}));
vi.mock('antd', () => ({ Spin: () => <span>Loading</span> }));
// Icon rendering is covered by Storybook; avoid loading the entire MUI icon
// catalog while exercising the header in jsdom.
vi.mock('@mui/icons-material', () => {
    const Icon = () => <svg />;
    return {
        AdminPanelSettingsOutlined: Icon,
        AppsOutlined: Icon,
        BalanceOutlined: Icon,
        CategoryOutlined: Icon,
        ChevronLeft: Icon,
        ChatOutlined: Icon,
        EmailOutlined: Icon,
        ManageAccountsOutlined: Icon,
        SettingsApplicationsOutlined: Icon,
        SettingsOutlined: Icon,
    };
});

it.each(['title', 'back'])('shows every tab in the shared sub-navigation bar, without arrows (%s)', (header) => {
    const tabs = [
        { to: '/global', titleKey: 'Global Configs' },
        { to: '/notices', titleKey: 'System notices' },
    ];
    const { container } = render(
        <MemoryRouter initialEntries={['/global']}>
            <Page>{header === 'title' ? <Page.Title tabs={tabs} /> : <Page.Back path="/" tabs={tabs} />}</Page>
        </MemoryRouter>,
    );

    // ORISO-Admin#1374: one tab bar for every sub-navigation, with tab semantics.
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'System notices' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Global Configs' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.queryByRole('button', { name: 'page.tabs.next' })).not.toBeInTheDocument();
    expect(container.querySelector('[data-admin-page-deck-nav]')).not.toBeInTheDocument();
});

// ORISO-Admin#1404: the back button names the list it returns to, on desktop and in the mobile
// bottom bar. A Beratungsstelle leads back to the Beratungsstellen list, never to "Träger".
const renderWithMobileBar = (back: JSX.Element) =>
    render(
        <MemoryRouter initialEntries={['/admin/agency/1/general']}>
            <MobileNavProvider>
                <Page>{back}</Page>
                <AdminMobileNavBar items={[]} logout={{ label: 'logout', onLogout: () => {} }} currentPath="/" />
            </MobileNavProvider>
        </MemoryRouter>,
    );

it('names the list the back button returns to, on desktop and in the mobile bottom bar', () => {
    renderWithMobileBar(<Page.Back path="/admin/agency" parentKey="sidebar.agency" title="Beratungsstelle Mitte" />);

    const back = screen.getByRole('link', { name: 'page.back.to(sidebar.agency)' });
    expect(back).toHaveAttribute('href', '/admin/agency');
    expect(back).toHaveAttribute('data-admin-back-button', 'tonal');
    expect(screen.getByRole('button', { name: 'page.back.to(sidebar.agency)' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /sidebar\.tenants/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Beratungsstelle Mitte' })).not.toBeInTheDocument();
});

it('says plain "back" when the page names no list, on desktop and in the mobile bottom bar', () => {
    renderWithMobileBar(<Page.Back path="/" title="Irgendwas" />);

    expect(screen.getByRole('link', { name: 'page.back.label' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('button', { name: 'page.back.label' })).toBeInTheDocument();
});
