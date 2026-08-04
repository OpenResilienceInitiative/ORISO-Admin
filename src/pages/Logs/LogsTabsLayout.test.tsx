import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { LogsTabsLayout } from './LogsTabsLayout';
import routePathNames from '../../appConfig';

const t = (key: string) => key;

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t }),
}));

vi.mock('../../components/Page', () => {
    const Page = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;
    Page.Title = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>;
    return { Page };
});

const renderLayout = (props: React.ComponentProps<typeof LogsTabsLayout>, initialPath = routePathNames.logs) =>
    render(
        <MemoryRouter initialEntries={[initialPath]}>
            <LogsTabsLayout {...props} />
        </MemoryRouter>,
    );

const tabTargets = () =>
    screen
        .getAllByRole('tab')
        .map((tab) => tab.getAttribute('href'))
        .filter(Boolean);

describe('LogsTabsLayout', () => {
    it('gives the platform admin the case-handover and inactive-account tabs', () => {
        renderLayout({ showSupervisor: false, showCaseHandover: true, showInactive: true });

        expect(tabTargets()).toEqual([routePathNames.caseHandoverLogs, routePathNames.inactiveAccountAuditLogs]);
    });

    it('gives a Träger admin the supervision and case-handover tabs, never the platform audit', () => {
        renderLayout({ showSupervisor: true, showCaseHandover: true, showInactive: false });

        expect(tabTargets()).toEqual([routePathNames.logs, routePathNames.caseHandoverLogs]);
    });

    it('gives a Beratungsstellen-Admin the same tabbed section, not a separate menu entry', () => {
        // The lower role levels are exactly what a platform-admin test account never exercises —
        // the blind spot ORISO-Admin#84 was reported from.
        renderLayout({ showSupervisor: true, showCaseHandover: true, showInactive: false });

        expect(screen.getByRole('tablist')).toBeInTheDocument();
        expect(screen.getAllByRole('tab')).toHaveLength(2);
    });

    it('renders no tablist when the admin may read no log view at all', () => {
        renderLayout({ showSupervisor: false, showCaseHandover: false, showInactive: false });

        expect(screen.queryByRole('tablist')).not.toBeInTheDocument();
    });

    it('marks only the supervision tab active on /admin/logs, not its sub-route siblings', () => {
        // `/admin/logs` is a prefix of both sibling routes, so the tab needs an exact match.
        renderLayout({ showSupervisor: true, showCaseHandover: true, showInactive: true }, routePathNames.logs);

        const active = screen.getAllByRole('tab').filter((tab) => tab.getAttribute('aria-current') === 'page');
        expect(active).toHaveLength(1);
        expect(active[0].getAttribute('href')).toBe(routePathNames.logs);
    });

    it('does not keep the supervision tab active on the case-handover sub-route', () => {
        renderLayout(
            { showSupervisor: true, showCaseHandover: true, showInactive: true },
            routePathNames.caseHandoverLogs,
        );

        const active = screen.getAllByRole('tab').filter((tab) => tab.getAttribute('aria-current') === 'page');
        expect(active).toHaveLength(1);
        expect(active[0].getAttribute('href')).toBe(routePathNames.caseHandoverLogs);
    });
});
