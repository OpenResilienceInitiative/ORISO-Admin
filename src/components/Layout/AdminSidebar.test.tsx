import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from 'antd';
import { AdminSidebar, type AdminSidebarNavItem, type AdminSidebarProps } from './AdminSidebar';

// NavIcon pulls in ~30 SVGs via `ReactComponent`, which the test runner does not transform.
// It is not what we are testing here, so stub it with a lightweight marker.
vi.mock('./NavIcon', () => ({
    NavIcon: ({ path }: { path: string }) => <span data-testid="nav-icon" data-path={path} />,
}));

const agencyItem: AdminSidebarNavItem = {
    key: 'agency',
    to: '/admin/agency',
    label: 'Agencies',
    iconPath: '/admin/agency',
    activeMatch: { paths: ['/admin/agency'], mode: 'includes' },
};
const statsItem: AdminSidebarNavItem = {
    key: 'stats',
    to: '/admin/statistic',
    label: 'Statistics',
    iconPath: '/admin/statistic',
};
const linksItem: AdminSidebarNavItem = {
    key: 'links',
    to: '/admin/links',
    label: 'Links',
    iconPath: '/admin/links',
    activeMatch: { paths: ['/admin/links/'], mode: 'startsWith' },
};
const accountItem: AdminSidebarNavItem = {
    key: 'account',
    to: '/admin/profil/',
    label: 'Account',
    iconPath: '/admin/profil/',
};

const renderSidebar = (props: Partial<AdminSidebarProps> = {}, initialPath = '/') => {
    const onLogout = vi.fn();
    const merged: AdminSidebarProps = {
        items: [agencyItem, statsItem],
        account: accountItem,
        logout: { label: 'Logout', onLogout },
        currentPath: '/',
        ...props,
    };
    render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Layout>
                <AdminSidebar {...merged} />
            </Layout>
        </MemoryRouter>,
    );
    return { onLogout };
};

describe('AdminSidebar', () => {
    it('renders the provided items as links to their routes', () => {
        renderSidebar();
        expect(screen.getByRole('link', { name: 'Agencies' })).toHaveAttribute('href', '/admin/agency');
        expect(screen.getByRole('link', { name: 'Statistics' })).toHaveAttribute('href', '/admin/statistic');
    });

    it('only renders the items it is given (visibility is the caller’s job)', () => {
        renderSidebar({ items: [agencyItem] });
        expect(screen.getByRole('link', { name: 'Agencies' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Statistics' })).not.toBeInTheDocument();
    });

    it('renders the account link and a logout button, and fires onLogout on click', async () => {
        const { onLogout } = renderSidebar();
        expect(screen.getByRole('link', { name: 'Account' })).toHaveAttribute('href', '/admin/profil/');
        await userEvent.click(screen.getByRole('button', { name: 'Logout' }));
        expect(onLogout).toHaveBeenCalledTimes(1);
    });

    it('marks an item active when currentPath matches its includes activeMatch', () => {
        renderSidebar({ currentPath: '/admin/agency/edit/5' });
        expect(screen.getByRole('link', { name: 'Agencies' })).toHaveClass('active');
        // statsItem has no activeMatch, so currentPath must not activate it.
        expect(screen.getByRole('link', { name: 'Statistics' })).not.toHaveClass('active');
    });

    it('honours a startsWith activeMatch on sub-routes', () => {
        renderSidebar({ items: [linksItem], currentPath: '/admin/links/tenants' });
        expect(screen.getByRole('link', { name: 'Links' })).toHaveClass('active');
    });

    it('does not activate a startsWith item on the bare base path', () => {
        renderSidebar({ items: [linksItem], currentPath: '/admin/links' });
        expect(screen.getByRole('link', { name: 'Links' })).not.toHaveClass('active');
    });

    it('renders the grouped activity-logs section with its children when provided', () => {
        renderSidebar({
            activityLogs: {
                label: 'Activity logs',
                items: [
                    {
                        key: 'ch',
                        to: '/admin/logs/case-handover',
                        label: 'Case handover',
                        iconPath: '/admin/logs/case-handover',
                    },
                ],
            },
        });
        expect(screen.getByRole('group', { name: 'Activity logs' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Case handover' })).toHaveAttribute(
            'href',
            '/admin/logs/case-handover',
        );
    });

    it('omits the activity-logs section when not provided', () => {
        renderSidebar();
        expect(screen.queryByRole('group')).not.toBeInTheDocument();
    });
});
