import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vite-plus/test';
import { MemoryRouter } from 'react-router-dom';
import { Page } from './index';

vi.mock('../../hooks/useIsDesktopLayout.hook', () => ({ useIsDesktopLayout: () => true }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (key: string) => key }) }));
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
