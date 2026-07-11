// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminDashboardStatisticsResponse } from '../api/statistic/getDashboardStatistics';
import { UserRole } from '../enums/UserRole';

vi.mock('../api/statistic/getDashboardStatistics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/statistic/getDashboardStatistics')>();
    return { ...actual, default: vi.fn() };
});
vi.mock('../api/agency/getAgencyData', () => ({ default: vi.fn().mockResolvedValue({ total: 0, data: [] }) }));
vi.mock('../api/tenant/searchTenantData', () => ({
    searchTenantData: vi.fn().mockResolvedValue({ total: 0, data: [] }),
}));
vi.mock('../api/topic/getTopicData', () => ({ default: vi.fn().mockResolvedValue({ total: 0, data: [] }) }));
vi.mock('../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        roles: [UserRole.TenantAdmin],
        hasRole: (role: UserRole | UserRole[]) => (Array.isArray(role) ? role : [role]).includes(UserRole.TenantAdmin),
        isSuperAdmin: false,
        isTechnicalAccount: false,
        isTenantScopedAdmin: true,
        tenantId: 5,
    }),
}));

import getDashboardStatistics from '../api/statistic/getDashboardStatistics';
import i18n from '../i18n';
import { Statistic } from './Statistic';

const dashboardMock = vi.mocked(getDashboardStatistics);

const periodCounts = (total: number) => ({
    today: 0,
    yesterday: 0,
    thisWeek: 1,
    total,
    thisYear: total,
    lastYear: 0,
});

const response: AdminDashboardStatisticsResponse = {
    generatedAt: '2026-07-11T10:00:00Z',
    scope: 'TENANT',
    targets: [
        {
            targetType: 'TENANT',
            tenantId: 5,
            agencyId: null,
            counselorCount: 4,
            suppressed: false,
            metrics: {
                enquiriesCurrentMonth: 12,
                enquiriesPreviousMonth: 10,
                activeCases: 7,
                activeConversationsToday: 2,
                groupChatsTotal: 3,
            },
            dailyNewSessions: [],
            monthlyTopTopics: [],
            sessionCountsByPeriod: periodCounts(20),
            groupChatCountsByPeriod: periodCounts(3),
        },
    ],
};

const renderStatistic = () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    return render(
        <QueryClientProvider client={client}>
            <Statistic />
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    dashboardMock.mockReset();
    window.localStorage.clear();
    // jsdom has no matchMedia; report prefers-reduced-motion so animated
    // counter values render their final numbers synchronously.
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: true,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })) as unknown as typeof window.matchMedia;
});

describe('Statistic page', () => {
    it('initialises i18n with German translations', async () => {
        await i18n.changeLanguage('de');
        expect(i18n.language).toBe('de');
    });

    it('renders real backend values instead of mock data', async () => {
        dashboardMock.mockResolvedValue(response);

        renderStatistic();

        // enquiries of the current month from the API response
        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        // previous month detail is computed from the real comparison value
        expect(screen.getAllByText(/Vormonat gesamt 10/).length).toBeGreaterThan(0);
        // metrics without an application-layer source degrade to "Keine Daten"
        expect(screen.getAllByText('Keine Daten').length).toBeGreaterThan(0);
        // legacy mock numbers must be gone
        expect(screen.queryByText('312')).toBeNull();
        expect(screen.queryByText('Caritas NRW')).toBeNull();
    });

    it('shows a warning banner when small-cell suppression is disabled', async () => {
        dashboardMock.mockResolvedValue({ ...response, suppressionDisabled: true });

        renderStatistic();

        await waitFor(() =>
            expect(screen.getByText('Kleinzellen-Schutz deaktiviert – nur für Testumgebungen')).toBeInTheDocument(),
        );
    });

    it('does not show the suppression warning banner by default', async () => {
        dashboardMock.mockResolvedValue(response);

        renderStatistic();

        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        expect(screen.queryByText('Kleinzellen-Schutz deaktiviert – nur für Testumgebungen')).toBeNull();
    });

    it('shows an error notice when the statistics endpoint fails', async () => {
        dashboardMock.mockRejectedValue(new Error('boom'));

        renderStatistic();

        await waitFor(() =>
            expect(screen.getByText('Statistikdaten konnten nicht geladen werden.')).toBeInTheDocument(),
        );
    });
});
