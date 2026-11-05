// @vitest-environment jsdom
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
const roleState = vi.hoisted(() => ({ isSuperAdmin: false }));
vi.mock('../hooks/useUserRoles.hook', () => ({
    useUserRoles: () => ({
        roles: [UserRole.TenantAdmin],
        hasRole: (role: UserRole | UserRole[]) => (Array.isArray(role) ? role : [role]).includes(UserRole.TenantAdmin),
        isSuperAdmin: roleState.isSuperAdmin,
        isTechnicalAccount: false,
        isTenantScopedAdmin: !roleState.isSuperAdmin,
        tenantId: 5,
    }),
}));

import { FETCH_ERRORS, fetchData } from '../api/fetchData';
import getDashboardStatistics from '../api/statistic/getDashboardStatistics';
import i18n from '../i18n';
import { Statistic } from './Statistic';

const dashboardMock = vi.mocked(getDashboardStatistics);
const fetchDataMock = vi.mocked(fetchData);

const periodCounts = (total: number) => ({
    today: 0,
    yesterday: 0,
    thisWeek: total ? 1 : 0,
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

const renderStatistic = (client = new QueryClient({ defaultOptions: { queries: { retry: false } } })) => {
    return render(
        <QueryClientProvider client={client}>
            <MemoryRouter>
                <Statistic />
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

beforeEach(() => {
    roleState.isSuperAdmin = false;
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

    it('places metric and chart cards in the shared settings raster', async () => {
        dashboardMock.mockResolvedValue(response);

        const { container } = renderStatistic();

        await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
        const rasters = container.querySelectorAll('[data-admin-card-raster]');
        expect(rasters).toHaveLength(3);
        container
            .querySelectorAll('.statisticDashboard__metricCard, .statisticDashboard__chartCard')
            .forEach((card) => {
                expect(card.parentElement).toHaveAttribute('data-admin-card-grid-item');
            });
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

    describe('fixed stand (UserService#1547)', () => {
        const standOf = (snapshotInterval: 'DAILY' | 'WEEKLY', dataUntil: string) => ({
            ...response,
            generatedAt: '2026-11-04T05:00:00Z',
            dataUntil,
            snapshotInterval,
        });
        const conversationPeriods = async () => {
            fireEvent.click(await screen.findByRole('button', { name: 'Zeitraum für Gesprächstyp' }));
            return screen.getAllByRole('menuitemradio').map((option) => option.textContent);
        };

        it('shows a stand without any case as zeros, with no empty-state hero', async () => {
            const noCases = {
                ...response.targets[0],
                metrics: {
                    enquiriesCurrentMonth: 0,
                    enquiriesPreviousMonth: 0,
                    activeCases: 0,
                    activeConversationsToday: null,
                    groupChatsTotal: 0,
                },
                sessionCountsByPeriod: periodCounts(0),
                groupChatCountsByPeriod: periodCounts(0),
            };
            dashboardMock.mockResolvedValue({ ...standOf('DAILY', '2026-11-03'), targets: [noCases] });
            renderStatistic();

            await screen.findByText(/^Zahlen bis einschließlich 03\.11\.2026/);
            expect(document.querySelector('.statisticDashboard__emptyHero')).toBeNull();
            expect(screen.getAllByText('0').length).toBeGreaterThan(0);
        });

        it('keeps the empty-state hero on a level without any target, as there is nothing to count', async () => {
            // The stand holds the Träger, but no Beratungsstelle: that tab has no zeros to state.
            dashboardMock.mockResolvedValue({ ...standOf('DAILY', '2026-11-03'), targets: [response.targets[0]] });
            renderStatistic();

            await screen.findByText(/^Zahlen bis einschließlich 03\.11\.2026/);
            expect(document.querySelector('.statisticDashboard__emptyHero')).toBeNull();

            fireEvent.click(screen.getByRole('tab', { name: 'Auf Beratungsstellenebene' }));

            await waitFor(() => expect(document.querySelector('.statisticDashboard__emptyHero')).not.toBeNull());
        });

        it('says up to which day the numbers go and when new ones come', async () => {
            dashboardMock.mockResolvedValue(standOf('DAILY', '2026-11-03'));
            renderStatistic();

            expect(
                await screen.findByText('Zahlen bis einschließlich 03.11.2026. Neue Zahlen täglich um 6:00 Uhr.'),
            ).toBeInTheDocument();
        });

        it('says the same in English for a weekly stand', async () => {
            await i18n.changeLanguage('en');
            dashboardMock.mockResolvedValue(standOf('WEEKLY', '2026-11-01'));

            try {
                renderStatistic();

                expect(
                    await screen.findByText(/^Figures up to and including .*2026\. New figures every Monday at 6:00/),
                ).toBeInTheDocument();
            } finally {
                await i18n.changeLanguage('de');
            }
        });

        it('offers the date of the newest full day, not today and not yesterday', async () => {
            dashboardMock.mockResolvedValue(standOf('DAILY', '2026-11-03'));
            renderStatistic();

            const labels = await conversationPeriods();

            expect(labels).toContain('03.11.2026');
            expect(labels).not.toContain('heute');
            expect(labels).not.toContain('gestern');
        });

        it('offers no single day at all in a weekly stand', async () => {
            dashboardMock.mockResolvedValue(standOf('WEEKLY', '2026-11-01'));
            renderStatistic();

            const labels = await conversationPeriods();

            expect(labels).toEqual(['diese Woche', 'gesamt', 'dieses Jahr', 'letztes Jahr']);
        });

        it('shows week bars and no day bars in a weekly stand', async () => {
            dashboardMock.mockResolvedValue({ ...standOf('WEEKLY', '2026-11-01'), chartWeeks: 5 });
            renderStatistic();

            expect(await screen.findAllByRole('button', { name: /Beratungsfälle in KW \d+/ })).toHaveLength(5);
            expect(screen.queryAllByRole('button', { name: /Beratungsfälle am/ })).toHaveLength(0);
        });

        it('selects the newest full day in the day chart', async () => {
            dashboardMock.mockResolvedValue(standOf('DAILY', '2026-11-03'));
            renderStatistic();

            expect(await screen.findByRole('button', { name: /Beratungsfälle am Di/, pressed: true })).toBeVisible();
        });

        it('drops the active-today metric from the card menu', async () => {
            dashboardMock.mockResolvedValue(standOf('DAILY', '2026-11-03'));
            renderStatistic();
            await screen.findByText('Anfragen gesamt');

            fireEvent.click(screen.getAllByRole('button', { name: /Kennzahl in diesem Dashboard-Slot/ })[0]);

            expect(screen.queryByText(/aktive Gespräche/i)).toBeNull();
        });
    });

    it('keeps today and says "live" when the numbers are live', async () => {
        dashboardMock.mockResolvedValue({
            ...response,
            generatedAt: '2026-11-04T05:00:00Z',
            snapshotInterval: 'LIVE',
        });

        renderStatistic();

        expect(await screen.findByText('Live-Zahlen')).toBeInTheDocument();
        expect(screen.queryByText(/Neue Zahlen/)).toBeNull();
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

    describe('hidden rows, hidden totals and the unavailable state (ORISO-Admin#1337)', () => {
        const hiddenRow = {
            ...response.targets[0],
            counselorCount: 0,
            suppressed: true,
            metrics: null,
            sessionCountsByPeriod: null,
            groupChatCountsByPeriod: null,
        };

        it('shows no counsellor count for a hidden row', async () => {
            dashboardMock.mockResolvedValue({ ...response, targets: [hiddenRow] });

            renderStatistic();

            await waitFor(() => expect(screen.getAllByText('Statistik unterdrückt').length).toBeGreaterThan(0));
            // the zero a hidden row carries must never be shown as a count
            const cards = document.querySelector('.statisticDashboard__summaryGrid') as HTMLElement;
            expect(cards.textContent).not.toMatch(/(^|\D)0(\D|$)/);
        });

        it('says so when the total itself is hidden', async () => {
            dashboardMock.mockResolvedValue({ ...response, targets: [hiddenRow] });

            renderStatistic();

            await waitFor(() =>
                expect(
                    screen.getByText(/Die Gesamtzahl wird aus Datenschutzgründen nicht angezeigt/),
                ).toBeInTheDocument(),
            );
            // a chart of zeros would read as "nothing happened"
            expect(document.querySelector('.statisticDashboard__chartGrid')).toBeNull();
        });

        const agencyRow = (
            agencyId: number,
            overrides: Partial<AdminDashboardStatisticsResponse['targets'][0]> = {},
        ) => ({
            ...response.targets[0],
            targetType: 'AGENCY' as const,
            agencyId,
            counselorCount: 6,
            ...overrides,
        });
        const hiddenAgency = (agencyId: number) =>
            agencyRow(agencyId, {
                counselorCount: 0,
                suppressed: true,
                metrics: null,
                sessionCountsByPeriod: null,
                groupChatCountsByPeriod: null,
            });
        const tenantResponse = (targets: AdminDashboardStatisticsResponse['targets']) => ({ ...response, targets });
        const openAgencyLevel = () => fireEvent.click(screen.getByText('Auf Beratungsstellenebene'));
        const rowNotice = /kann auch einen größeren Bereich treffen/;
        const totalNotice = /Die Gesamtzahl wird aus Datenschutzgründen nicht angezeigt/;

        it('offers the active-counsellor count once per menu on the agency level, never as "on duty"', async () => {
            dashboardMock.mockResolvedValue(tenantResponse([response.targets[0], agencyRow(11)]));
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
            openAgencyLevel();

            const menuButtons = await screen.findAllByRole('button', {
                name: 'Kennzahl in diesem Dashboard-Slot auswählen',
            });
            const allLabels: string[] = [];
            menuButtons.forEach((button) => {
                fireEvent.click(button);
                const labels = screen.getAllByRole('menuitemradio').map((option) => option.textContent ?? '');
                expect(new Set(labels).size).toBe(labels.length);
                allLabels.push(...labels);
                fireEvent.click(button);
            });

            expect(allLabels.some((label) => label.includes('aktive Beratende'))).toBe(true);
            expect(allLabels.some((label) => /im Dienst|insgesamt/.test(label))).toBe(false);
        });

        it('falls back to the active-counsellor count when an old stored choice was the removed duplicate', async () => {
            window.localStorage.setItem(
                'oriso.admin.statistics.metricPreferences.v1',
                JSON.stringify({ agency: { 'active-counselors': 'counselors' } }),
            );
            dashboardMock.mockResolvedValue(tenantResponse([response.targets[0], agencyRow(11)]));
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
            openAgencyLevel();

            await waitFor(() => expect(screen.getAllByText('6').length).toBeGreaterThan(0));
            expect(screen.getAllByText('aktive Beratende').length).toBeGreaterThan(0);
        });

        it('shows the row notice, not the total notice, for a hidden agency next to a shown one', async () => {
            dashboardMock.mockResolvedValue(tenantResponse([response.targets[0], agencyRow(11), hiddenAgency(12)]));
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
            openAgencyLevel();

            expect(await screen.findByText(rowNotice)).toBeInTheDocument();
            expect(screen.queryByText(totalNotice)).toBeNull();
            // a shown row remains: charts and the export stay
            expect(screen.getByText('Statistik als CSV herunterladen')).toBeInTheDocument();
            expect(document.querySelector('.statisticDashboard__chartGrid')).not.toBeNull();
        });

        it('shows only the total notice, and no CSV link, when the Träger total is hidden', async () => {
            dashboardMock.mockResolvedValue(
                tenantResponse([
                    { ...hiddenAgency(0), targetType: 'TENANT', agencyId: null, tenantId: 5 },
                    agencyRow(11),
                ]),
            );
            renderStatistic();

            expect(await screen.findByText(totalNotice)).toBeInTheDocument();
            expect(screen.queryByText(rowNotice)).toBeNull();
            expect(screen.queryByText('Statistik als CSV herunterladen')).toBeNull();
        });

        it('does not show the total notice for a hidden agency picked in the picker', async () => {
            dashboardMock.mockResolvedValue(tenantResponse([response.targets[0], agencyRow(11), hiddenAgency(12)]));
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));

            fireEvent.focus(screen.getByRole('textbox', { name: 'Beratungsstellen oder Träger suchen' }));
            fireEvent.click(await screen.findByRole('option', { name: /Beratungsstelle 12/ }));

            expect(await screen.findByText(rowNotice)).toBeInTheDocument();
            expect(screen.queryByText(totalNotice)).toBeNull();
        });

        it('on the platform level, shows the total notice for a hidden platform total and the row notice for a picked hidden Träger', async () => {
            roleState.isSuperAdmin = true;
            const platform = (suppressed: boolean) => ({
                ...(suppressed ? hiddenAgency(0) : agencyRow(0)),
                targetType: 'PLATFORM' as const,
                tenantId: null,
                agencyId: null,
            });
            const tenant = (tenantId: number, suppressed: boolean) => ({
                ...(suppressed ? hiddenAgency(0) : agencyRow(0)),
                targetType: 'TENANT' as const,
                tenantId,
                agencyId: null,
            });
            dashboardMock.mockResolvedValue({
                ...response,
                scope: 'PLATFORM',
                targets: [platform(true), tenant(5, false), tenant(6, true)],
            });
            const { unmount } = renderStatistic();

            expect(await screen.findByText(totalNotice)).toBeInTheDocument();
            expect(screen.queryByText(rowNotice)).toBeNull();
            unmount();

            dashboardMock.mockResolvedValue({
                ...response,
                scope: 'PLATFORM',
                targets: [platform(false), tenant(5, false), tenant(6, true)],
            });
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
            fireEvent.focus(screen.getByRole('textbox', { name: 'Beratungsstellen oder Träger suchen' }));
            fireEvent.click(await screen.findByRole('option', { name: /Träger 6/ }));

            expect(await screen.findByText(rowNotice)).toBeInTheDocument();
            expect(screen.queryByText(totalNotice)).toBeNull();
        });

        it('does not render the tutorial section while the dashboard is unavailable', async () => {
            dashboardMock.mockRejectedValue(new Error(FETCH_ERRORS.SERVICE_UNAVAILABLE));
            renderStatistic();

            await screen.findByText(/vorübergehend nicht verfügbar/);
            expect(screen.queryByText('Tutorial-Abschlüsse')).toBeNull();
        });

        it('shows "temporarily unavailable" and no figures when the dashboard answers 503', async () => {
            dashboardMock.mockRejectedValue(new Error(FETCH_ERRORS.SERVICE_UNAVAILABLE));

            renderStatistic();

            expect(await screen.findByRole('alert')).toHaveTextContent('vorübergehend nicht verfügbar');
            expect(screen.queryByText('Statistikdaten konnten nicht geladen werden.')).toBeNull();
            expect(screen.queryByText('Statistik als CSV herunterladen')).toBeNull();
            expect(screen.queryByText('Ihr Dashboard füllt sich mit der ersten Beratung')).toBeNull();
            expect(screen.queryByText('noch keine Daten')).toBeNull();
            expect(document.querySelector('.statisticDashboard__summaryGrid')).toBeNull();
        });

        it('keeps the generic load error for other failures', async () => {
            dashboardMock.mockRejectedValue(new Error('API call error: 500 Internal Server Error'));

            renderStatistic();

            expect(await screen.findByText('Statistikdaten konnten nicht geladen werden.')).toBeInTheDocument();
            expect(screen.queryByText(/vorübergehend nicht verfügbar/)).toBeNull();
        });

        it('drops figures that were already loaded when a later refresh answers 503', async () => {
            const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
            dashboardMock.mockResolvedValue(response);
            renderStatistic(client);
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));

            dashboardMock.mockRejectedValue(new Error(FETCH_ERRORS.SERVICE_UNAVAILABLE));
            await client.invalidateQueries({ queryKey: ['ADMIN_STATISTICS_DASHBOARD'] });

            expect(await screen.findByText(/vorübergehend nicht verfügbar/)).toBeInTheDocument();
            expect(screen.queryByText('12')).toBeNull();
            expect(document.querySelector('.statisticDashboard__summaryGrid')).toBeNull();
        });
    });

    describe('configurable time windows (UserService#1544)', () => {
        const openCasePeriodSelect = async () => {
            fireEvent.click(await screen.findByRole('button', { name: 'Zeitraum für Beratungsfälle' }));
            return screen.getAllByRole('menuitemradio');
        };

        it('offers one requests-chart period per configured week plus a week overview', async () => {
            dashboardMock.mockResolvedValue({ ...response, chartWeeks: 8 });
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));

            const options = await openCasePeriodSelect();

            expect(options.map((option) => option.textContent)).toEqual([
                'diese Woche',
                'letzte Woche',
                'vor zwei Wochen',
                'vor drei Wochen',
                'vor vier Wochen',
                'vor 5 Wochen',
                'vor 6 Wochen',
                'vor 7 Wochen',
                '8 Wochen im Überblick',
            ]);
        });

        it("keeps today's five weeks when the backend does not report a window", async () => {
            dashboardMock.mockResolvedValue(response);
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));

            const options = await openCasePeriodSelect();

            expect(options).toHaveLength(6);
            expect(options[4]).toHaveTextContent('vor vier Wochen');
            expect(options[5]).toHaveTextContent('5 Wochen im Überblick');
        });

        it('shows one bar per configured week in the week overview', async () => {
            dashboardMock.mockResolvedValue({ ...response, chartWeeks: 12 });
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));
            expect(screen.getAllByRole('button', { name: /Beratungsfälle am/ })).toHaveLength(7);

            fireEvent.click((await openCasePeriodSelect()).at(-1) as HTMLElement);

            expect(screen.queryAllByRole('button', { name: /Beratungsfälle am/ })).toHaveLength(0);
            expect(screen.getAllByRole('button', { name: /Beratungsfälle in KW \d+/ })).toHaveLength(12);
        });

        it('lists one top-topic month per configured month in the metric menu', async () => {
            dashboardMock.mockResolvedValue({ ...response, topicMonths: 6 });
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));

            fireEvent.click(screen.getAllByRole('button', { name: 'Kennzahl in diesem Dashboard-Slot auswählen' })[0]);

            const labels = screen.getAllByRole('menuitemradio').map((option) => option.textContent ?? '');
            expect(labels.filter((label) => label.includes('Thema vor 5 Monaten'))).toHaveLength(1);
            expect(labels.filter((label) => /Thema vor 6 Monaten/.test(label))).toHaveLength(0);
        });

        it('describes an older topic month without calling it this month', async () => {
            dashboardMock.mockResolvedValue({ ...response, topicMonths: 6 });
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));

            fireEvent.click(screen.getAllByRole('button', { name: 'Kennzahl in diesem Dashboard-Slot auswählen' })[0]);

            const older = screen
                .getAllByRole('menuitemradio')
                .find((option) => (option.textContent ?? '').includes('Thema vor 5 Monaten'));
            expect(older).toBeDefined();
            expect(older).not.toHaveTextContent('in diesem Monat');
        });

        it('drops topic months beyond a shorter configured window', async () => {
            dashboardMock.mockResolvedValue({ ...response, topicMonths: 3 });
            renderStatistic();
            await waitFor(() => expect(screen.getAllByText('12').length).toBeGreaterThan(0));

            fireEvent.click(screen.getAllByRole('button', { name: 'Kennzahl in diesem Dashboard-Slot auswählen' })[0]);

            const labels = screen.getAllByRole('menuitemradio').map((option) => option.textContent ?? '');
            expect(labels.some((label) => label.includes('Thema vor 2 Monaten'))).toBe(true);
            expect(labels.some((label) => label.includes('Thema vor 3 Monaten'))).toBe(false);
        });
    });
});
