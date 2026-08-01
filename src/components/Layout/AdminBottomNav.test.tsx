import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminBottomNav from './AdminBottomNav';
import type { AdminSidebarNavItem } from './AdminSidebar';

// Resolve to the inline German defaults rather than the bare keys, matching the
// convention used across this repo's component tests.
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defaultValue?: string) => defaultValue ?? key,
    }),
}));

const superAdminItems: AdminSidebarNavItem[] = [
    { key: 'theme', to: '/admin/settings/general', label: 'Einstellungen', iconPath: '/admin/settings' },
    { key: 'tenants', to: '/admin/tenants', label: 'Träger', iconPath: '/admin/tenants' },
    { key: 'agency', to: '/admin/agency', label: 'Beratungsstelle', iconPath: '/admin/agency' },
    { key: 'counselors', to: '/admin/users', label: 'Nutzer*innen', iconPath: '/admin/users' },
    { key: 'statistics', to: '/admin/statistic', label: 'Statistiken', iconPath: '/admin/statistic' },
    { key: 'links', to: '/admin/links', label: 'Links', iconPath: '/admin/links' },
    { key: 'logs', to: '/admin/logs', label: 'Logs', iconPath: '/admin/logs' },
];

const account: AdminSidebarNavItem = {
    key: 'account',
    to: '/admin/profile',
    label: 'Mein Konto',
    iconPath: '/admin/profile',
};

const onLogout = vi.fn();

const renderNav = (props: Partial<React.ComponentProps<typeof AdminBottomNav>> = {}) =>
    render(
        <MemoryRouter>
            <AdminBottomNav
                account={account}
                currentPath="/admin/settings/general"
                items={superAdminItems}
                logout={{ label: 'Abmelden', onLogout }}
                {...props}
            />
        </MemoryRouter>,
    );

/** jsdom reports every element as 0×0, which `useNavOverflow` reads as "one slot". */
const stubNavWidth = (width: number) =>
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width } as DOMRect);

describe('AdminBottomNav', () => {
    beforeEach(() => {
        onLogout.mockClear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('shows as many destinations as fit, with the rest behind the overflow', () => {
        stubNavWidth(276); // 412px phone
        renderNav();

        expect(screen.getByRole('link', { name: /Einstellungen/ })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Mehr/ })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Statistiken/ })).not.toBeInTheDocument();
    });

    it('marks the destination matching the current route', () => {
        stubNavWidth(276);
        renderNav();

        expect(screen.getByRole('link', { name: /Einstellungen/ })).toHaveAttribute('aria-current', 'page');
    });

    it('keeps the current destination visible even when it sits past the cut', () => {
        stubNavWidth(184); // 320px phone: room for one destination only
        renderNav({ currentPath: '/admin/logs' });

        expect(screen.getByRole('link', { name: /Logs/ })).toBeInTheDocument();
    });

    it('lists every destination plus the account in the overflow sheet', async () => {
        stubNavWidth(276);
        renderNav();

        await userEvent.click(screen.getByRole('button', { name: /Mehr/ }));

        ['Statistiken', 'Links', 'Logs', 'Mein Konto'].forEach((label) => {
            expect(screen.getByRole('link', { name: label })).toBeInTheDocument();
        });
    });

    it('offers logout in the sheet — the old mobile layout hid it entirely', async () => {
        stubNavWidth(276);
        renderNav();

        await userEvent.click(screen.getByRole('button', { name: /Mehr/ }));
        await userEvent.click(screen.getByRole('button', { name: 'Abmelden' }));

        expect(onLogout).toHaveBeenCalled();
    });

    it('drops the overflow segment when every destination fits', () => {
        stubNavWidth(400);
        renderNav({ items: superAdminItems.slice(0, 2) });

        expect(screen.queryByRole('button', { name: /Mehr/ })).not.toBeInTheDocument();
    });
});
