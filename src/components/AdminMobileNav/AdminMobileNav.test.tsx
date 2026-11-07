import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import { AdminMobileNav, type AdminMobileNavSection } from './AdminMobileNav';
import { EXPANDED_SECTION_STORAGE_KEY } from './useRememberedExpansion';

const sections: AdminMobileNavSection[] = [
    {
        key: 'settings',
        label: 'Einstellungen',
        description: 'Erscheinungsbild, Rechtliches',
        to: '/settings/legal',
        subsections: [
            { key: 'settings:legal', label: 'Rechtliches', to: '/settings/legal' },
            { key: 'settings:smtp', label: 'Email Server', to: '/settings/smtp' },
        ],
    },
    { key: 'tenants', label: 'Träger', to: '/tenants' },
    {
        key: 'users',
        label: 'Konten',
        to: '/users/admins',
        subsections: [
            { key: 'users:admins', label: 'Admins', to: '/users/admins' },
            { key: 'users:counsellors', label: 'Beratende', to: '/users/counsellors' },
        ],
    },
    { key: 'logs', label: 'Logs', to: '/logs' },
];

const labels = {
    navigation: 'Navigation',
    more: 'Mehr',
    globalSearch: 'Überall suchen',
    close: 'Schließen',
    back: 'Zurück',
};

const Location = () => <span data-testid="path">{useLocation().pathname}</span>;

const renderNav = (path = '/settings/legal', onSectionSelect = vi.fn(), onOpenGlobalSearch = vi.fn()) =>
    render(
        <MemoryRouter initialEntries={[path]}>
            <Routes>
                <Route
                    path="*"
                    element={
                        <>
                            <AdminMobileNav
                                sections={sections}
                                accountItems={[{ key: 'logout', label: 'Verlassen' }]}
                                activeSectionKey={path.startsWith('/settings') ? 'settings' : 'tenants'}
                                activeSubsectionKey={path}
                                onOpenGlobalSearch={onOpenGlobalSearch}
                                onSectionSelect={onSectionSelect}
                                labels={labels}
                            />
                            <Location />
                        </>
                    }
                />
            </Routes>
        </MemoryRouter>,
    );

describe('AdminMobileNav', () => {
    beforeEach(() => window.localStorage.clear());

    it('shows three sections as tabs plus "Mehr" and a separate search button, like Slack', () => {
        renderNav();

        const bar = screen.getByRole('navigation', { name: 'Navigation' });

        expect(
            within(bar)
                .getAllByRole('link')
                .map((link) => link.textContent),
        ).toEqual(['Einstellungen', 'Träger', 'Konten']);
        expect(within(bar).getByRole('button', { name: 'Mehr' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Überall suchen' })).toBeInTheDocument();
        expect(within(bar).getByRole('link', { name: 'Einstellungen' })).toHaveAttribute('aria-current', 'page');
    });

    it('opens the menu as a card, not a page, with every section and the account entries', async () => {
        renderNav();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));

        const menu = screen.getByRole('dialog', { name: 'Mehr' });

        expect(within(menu).getByText('Erscheinungsbild, Rechtliches')).toBeInTheDocument();
        expect(within(menu).getByRole('link', { name: 'Logs' })).toBeInTheDocument();
        expect(within(menu).getByRole('button', { name: 'Verlassen' })).toBeInTheDocument();
    });

    it('expands the section you are on the first time and marks the current subsection', async () => {
        renderNav();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));

        const menu = screen.getByRole('dialog', { name: 'Mehr' });

        expect(within(menu).getByRole('button', { name: /Einstellungen/ })).toHaveAttribute('aria-expanded', 'true');
        expect(within(menu).getByRole('link', { name: 'Rechtliches' })).toHaveAttribute('aria-current', 'page');
        expect(within(menu).getByRole('button', { name: /Konten/ })).toHaveAttribute('aria-expanded', 'false');
    });

    it('remembers the category the user expanded last, across a remount', async () => {
        const { unmount } = renderNav();

        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));
        await userEvent.click(screen.getByRole('button', { name: /Konten/ }));
        expect(screen.getByRole('link', { name: 'Beratende' })).toBeInTheDocument();
        expect(window.localStorage.getItem(EXPANDED_SECTION_STORAGE_KEY)).toBe('users');
        unmount();

        renderNav();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));

        expect(screen.getByRole('button', { name: /Konten/ })).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByRole('button', { name: /Einstellungen/ })).toHaveAttribute('aria-expanded', 'false');
    });

    it('remembers "everything collapsed" too', async () => {
        const { unmount } = renderNav();

        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));
        await userEvent.click(screen.getByRole('button', { name: /Einstellungen/ }));
        unmount();

        renderNav();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));

        expect(screen.getByRole('button', { name: /Einstellungen/ })).toHaveAttribute('aria-expanded', 'false');
    });

    it('navigates from a subsection and closes the card', async () => {
        renderNav();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));
        await userEvent.click(screen.getByRole('link', { name: 'Email Server' }));

        expect(screen.getByTestId('path')).toHaveTextContent('/settings/smtp');
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('logs out through onSectionSelect', async () => {
        const onSectionSelect = vi.fn();

        renderNav('/settings/legal', onSectionSelect);
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));
        await userEvent.click(screen.getByRole('button', { name: 'Verlassen' }));

        expect(onSectionSelect).toHaveBeenCalledWith('logout');
    });

    it('closes on Escape and returns focus to the button that opened it', async () => {
        renderNav();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));
        await userEvent.keyboard('{Escape}');

        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mehr' })).toHaveFocus();
    });

    // ORISO-Admin#1323: Home · Einstellen · Einladen · Mehr, whatever the sidebar order.
    it('fills the tabs with the preferred sections first, then in sidebar order', () => {
        render(
            <MemoryRouter>
                <AdminMobileNav
                    sections={sections}
                    tabKeys={['logs', 'settings', 'missing']}
                    activeSectionKey="settings"
                    labels={labels}
                />
            </MemoryRouter>,
        );

        expect(
            within(screen.getByRole('navigation'))
                .getAllByRole('link')
                .map((link) => link.textContent),
        ).toEqual(['Logs', 'Einstellungen', 'Träger']);
    });

    it('keeps Tab and Shift+Tab inside the open menu card (aria-modal)', async () => {
        renderNav();
        await userEvent.click(screen.getByRole('button', { name: 'Mehr' }));
        const dialog = screen.getByRole('dialog');
        const focusable = dialog.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        expect(first).toHaveFocus();
        await userEvent.tab({ shift: true });
        expect(last).toHaveFocus();
        await userEvent.tab();
        expect(first).toHaveFocus();
    });

    it('names a tab by its visible short label (WCAG 2.5.3)', () => {
        render(
            <MemoryRouter>
                <AdminMobileNav
                    sections={[{ ...sections[0], tabLabel: 'Optionen' }, ...sections.slice(1)]}
                    activeSectionKey="settings"
                    labels={labels}
                />
            </MemoryRouter>,
        );

        expect(within(screen.getByRole('navigation')).getByRole('link', { name: 'Optionen' })).toBeInTheDocument();
    });

    it('hands the round button to the app-wide search and has no search of its own', async () => {
        const onOpenGlobalSearch = vi.fn();

        renderNav('/tenants', vi.fn(), onOpenGlobalSearch);
        const button = screen.getByRole('button', { name: 'Überall suchen' });

        await userEvent.click(button);

        // The button is passed on, so the search view can grow out of it.
        expect(onOpenGlobalSearch).toHaveBeenCalledWith(button);
        expect(screen.queryByRole('searchbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('shows no search button when there is no app-wide search (restricted layout)', () => {
        render(
            <MemoryRouter>
                <AdminMobileNav sections={sections} activeSectionKey="settings" labels={labels} />
            </MemoryRouter>,
        );

        expect(screen.queryByRole('button', { name: 'Überall suchen' })).not.toBeInTheDocument();
    });
});
