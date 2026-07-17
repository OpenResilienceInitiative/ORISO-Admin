// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { AdminDashboardStatisticsResponse } from '../api/statistic/getDashboardStatistics';
import { UserRole } from '../enums/UserRole';

vi.mock('../api/statistic/getDashboardStatistics', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/statistic/getDashboardStatistics')>();
    return { ...actual, default: vi.fn() };
});
// The name lookups (agencies/tenants/topics) go through fetchData directly; mock it
// so tests can simulate per-endpoint failures such as a 403 on /service/topicadmin.
vi.mock('../api/fetchData', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../api/fetchData')>();
    return { ...actual, fetchData: vi.fn() };
});
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

import { fetchData } from '../api/fetchData';
import getDashboardStatistics from '../api/statistic/getDashboardStatistics';
import i18n from '../i18n';
import { Statistic } from './Statistic';

const dashboardMock = vi.mocked(getDashboardStatistics);
const fetchDataMock = vi.mocked(fetchData);

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
            <MemoryRouter>
                <Statistic />
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    dashboardMock.mockReset();
    fetchDataMock.mockReset();
    // default: all name lookups succeed with empty result sets
    fetchDataMock.mockResolvedValue({ total: 0, _embedded: [] });
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
        // metrics without an application-layer source render the calm empty
        // presentation (dash + hint) instead of a shouty "Keine Daten" value
        expect(screen.getAllByText('wird noch nicht erfasst').length).toBeGreaterThan(0);
        expect(screen.getAllByLabelText('Keine Daten').length).toBeGreaterThan(0);
        // legacy mock numbers must be gone
        expect(screen.queryByText('312')).toBeNull();
        expect(screen.queryByText('Caritas NRW')).toBeNull();
    });

    it('still renders dashboard data when a name lookup fails with 403', async () => {
        dashboardMock.mockResolvedValue(response);
        // simulate the Pre-Dev incident: /service/topicadmin denies access
        fetchDataMock.mockImplementation(({ url }: { url: string }) => {
            if (url.includes('topicadmin')) {
                return Promise.reject(new Error('API call error: 403 Forbidden'));
            }
            return Promise.resolve({ total: 0, _embedded: [] });
        });

        renderStatistic();

        // dashboard data still renders
        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        // and the lookup failure did not trigger the access-denied redirect
        expect(window.location.href).not.toContain('access-denied');
        // regression guard: lookups must bypass the shared responseHandling
        // (any truthy responseHandling makes fetchData hard-redirect on 403)
        const topicCall = fetchDataMock.mock.calls.find(([props]) => props.url.includes('topicadmin'));
        expect(topicCall).toBeDefined();
        expect(topicCall?.[0].responseHandling).toBeUndefined();
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

    it('shows a loading state instead of "Keine Daten"/0 while the dashboard request is in flight', async () => {
        let resolveDashboard: (value: AdminDashboardStatisticsResponse) => void = () => undefined;
        dashboardMock.mockReturnValue(
            new Promise((resolve) => {
                resolveDashboard = resolve;
            }),
        );

        renderStatistic();

        expect(screen.getByRole('status')).toBeInTheDocument();
        expect(screen.getByText('Statistik wird geladen …')).toBeInTheDocument();
        // Nothing from the eventual dashboard shape should be visible yet.
        expect(screen.queryByText('Keine Daten')).toBeNull();
        expect(screen.queryByText('0')).toBeNull();

        resolveDashboard(response);

        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        expect(screen.queryByRole('status')).toBeNull();
    });

    // Regression guard for the audit's H01 finding: the card/menu blueprints
    // (dashboardByScope, dashboardMetricOptionsByScope) no longer carry
    // hardcoded value/detail/trend defaults, so a wiring gap for a
    // card/menu key can only ever render "Keine Daten" - never a stray
    // "undefined" leaking out of a missing override mapping.
    it('never renders a literal "undefined" for any card or menu value', async () => {
        dashboardMock.mockResolvedValue(response);

        renderStatistic();

        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        expect(screen.queryByText('undefined', { exact: false })).toBeNull();
    });

    it('offers a CSV export of exactly the metrics shown on screen', async () => {
        dashboardMock.mockResolvedValue(response);
        let csvBlobParts: string | undefined;
        const OriginalBlob = global.Blob;
        const blobSpy = vi.spyOn(global, 'Blob').mockImplementation(function mockBlob(this: unknown, parts, options) {
            csvBlobParts = (parts as string[])?.join('');
            return new OriginalBlob(parts, options);
        } as unknown as typeof Blob);

        renderStatistic();

        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        expect(screen.getByText('Statistik als CSV herunterladen').closest('a')).not.toBeNull();
        expect(csvBlobParts).toContain('12');
        expect(csvBlobParts).not.toContain('312');
        expect(csvBlobParts).not.toContain('Caritas NRW');

        blobSpy.mockRestore();
    });

    it('shows one friendly empty-state hero when nothing happened yet', async () => {
        const zeroCounts = { today: 0, yesterday: 0, thisWeek: 0, total: 0, thisYear: 0, lastYear: 0 };
        dashboardMock.mockResolvedValue({
            ...response,
            targets: [
                {
                    ...response.targets[0],
                    // counsellors are onboarded, but no counselling activity yet
                    counselorCount: 3,
                    metrics: {
                        enquiriesCurrentMonth: 0,
                        enquiriesPreviousMonth: 0,
                        activeCases: 0,
                        activeConversationsToday: 0,
                        groupChatsTotal: 0,
                    },
                    sessionCountsByPeriod: zeroCounts,
                    groupChatCountsByPeriod: zeroCounts,
                },
            ],
        });

        renderStatistic();

        await waitFor(() =>
            expect(screen.getByText('Ihr Dashboard füllt sich mit der ersten Beratung')).toBeInTheDocument(),
        );
        // the metric grids step back but stay visible (disable, don't hide)
        expect(document.querySelector('.statisticDashboard__summaryGrid--quiet')).not.toBeNull();
    });

    it('does not show the empty-state hero when real activity exists', async () => {
        dashboardMock.mockResolvedValue(response);

        renderStatistic();

        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        expect(screen.queryByText('Ihr Dashboard füllt sich mit der ersten Beratung')).toBeNull();
        expect(document.querySelector('.statisticDashboard__summaryGrid--quiet')).toBeNull();
    });

    it('hints KDG suppression on the cards instead of showing the hero', async () => {
        dashboardMock.mockResolvedValue({
            ...response,
            targets: [
                {
                    ...response.targets[0],
                    counselorCount: 1,
                    suppressed: true,
                    metrics: null,
                    sessionCountsByPeriod: null,
                    groupChatCountsByPeriod: null,
                },
            ],
        });

        renderStatistic();

        await waitFor(() => expect(screen.getAllByText('Statistik unterdrückt').length).toBeGreaterThan(0));
        expect(screen.queryByText('Ihr Dashboard füllt sich mit der ersten Beratung')).toBeNull();
    });
});
