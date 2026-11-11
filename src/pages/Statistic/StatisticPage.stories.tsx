import type { Meta, StoryObj } from '@storybook/react-vite';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { delay, http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, fireEvent, within, waitFor } from 'storybook/test';
import type {
    AdminDashboardPeriodCounts,
    AdminDashboardStatisticsResponse,
    AdminDashboardTarget,
    StatisticSnapshotInterval,
} from '../../api/statistic/getDashboardStatistics';
import { getSessionAccessToken, getSessionRefreshToken, setSessionTokens } from '../../api/auth/tokenSessionStore';
import {
    adminStatisticsDashboardEndpoint,
    agencyEndpointBase,
    tenantAdminEndpoint,
    topicAdminEndpoint,
    tutorialStatisticsEndpoint,
} from '../../appConfig';
import { Statistic } from '../Statistic';

const GENERATED_AT = '2026-11-06T05:00:00Z';
const CHART_WEEKS = 5;
const TOPIC_MONTHS = 4;

const periods = (total: number): AdminDashboardPeriodCounts => ({
    today: Math.round(total / 120),
    yesterday: Math.round(total / 60),
    thisWeek: Math.round(total / 12),
    total,
    thisYear: Math.round(total * 0.8),
    lastYear: Math.round(total * 0.2),
});

// Same sample numbers on every run, so screenshots stay comparable.
const dailySessions = (factor: number) =>
    Array.from({ length: CHART_WEEKS * 7 }, (_, index) => {
        const day = new Date(Date.UTC(2026, 10, 5 - index));
        return { date: day.toISOString().slice(0, 10), count: Math.round((((index * 7) % 11) + 2) * factor) };
    }).reverse();

const monthlyTopics = (factor: number) =>
    ['2026-08', '2026-09', '2026-10', '2026-11'].flatMap((month, monthIndex) =>
        [1, 2, 3].map((topicId) => ({
            month,
            topicId,
            sessionCount: Math.round((40 - topicId * 8 + monthIndex * 3) * factor),
            sharePercent: 50 - topicId * 10,
        })),
    );

const target = (
    targetType: AdminDashboardTarget['targetType'],
    tenantId: number | null,
    agencyId: number | null,
    factor: number,
): AdminDashboardTarget => ({
    targetType,
    tenantId,
    agencyId,
    counselorCount: Math.round(12 * factor),
    suppressed: false,
    metrics: {
        enquiriesCurrentMonth: Math.round(84 * factor),
        enquiriesPreviousMonth: Math.round(71 * factor),
        activeCases: Math.round(56 * factor),
        activeConversationsToday: Math.round(9 * factor),
        groupChatsTotal: Math.round(14 * factor),
    },
    dailyNewSessions: dailySessions(factor),
    monthlyTopTopics: monthlyTopics(factor),
    sessionCountsByPeriod: periods(Math.round(620 * factor)),
    groupChatCountsByPeriod: periods(Math.round(90 * factor)),
});

const suppressedTarget = (agencyId: number): AdminDashboardTarget => ({
    targetType: 'AGENCY',
    tenantId: 2,
    agencyId,
    counselorCount: 0,
    suppressed: true,
    metrics: null,
    dailyNewSessions: [],
    monthlyTopTopics: [],
    sessionCountsByPeriod: null,
    groupChatCountsByPeriod: null,
});

// What the server leaves out of a fixed stand: no "today", and no single days in a weekly one.
const asStand = (row: AdminDashboardTarget, snapshotInterval: StatisticSnapshotInterval): AdminDashboardTarget => {
    if (snapshotInterval === 'LIVE' || row.suppressed || !row.metrics) return row;
    const weekly = snapshotInterval === 'WEEKLY';
    const counts = (period: AdminDashboardPeriodCounts | null) =>
        period && { ...period, today: null, yesterday: weekly ? null : period.yesterday };
    return {
        ...row,
        metrics: { ...row.metrics, activeConversationsToday: null },
        dailyNewSessions: weekly ? [] : row.dailyNewSessions,
        weeklyNewSessions: weekly
            ? [-2, 5, 12, 19, 26].map((offset, index) => ({
                  weekStart: new Date(Date.UTC(2026, 9, offset)).toISOString().slice(0, 10),
                  count: Math.round(row.counselorCount * (index + 2)),
              }))
            : [],
        sessionCountsByPeriod: counts(row.sessionCountsByPeriod),
        groupChatCountsByPeriod: counts(row.groupChatCountsByPeriod),
    };
};

const statistics = (
    snapshotInterval: StatisticSnapshotInterval,
    targets: AdminDashboardTarget[] = [
        target('PLATFORM', null, null, 4),
        target('TENANT', 2, null, 2),
        target('TENANT', 3, null, 1),
        target('AGENCY', 2, 11, 1),
        target('AGENCY', 2, 12, 0.5),
        target('AGENCY', 3, 13, 0.75),
    ],
): AdminDashboardStatisticsResponse => ({
    generatedAt: snapshotInterval === 'WEEKLY' ? '2026-11-02T05:00:00Z' : GENERATED_AT,
    dataUntil: { LIVE: null, DAILY: '2026-11-05', WEEKLY: '2026-11-01' }[snapshotInterval],
    scope: 'PLATFORM',
    snapshotInterval,
    chartWeeks: CHART_WEEKS,
    topicMonths: TOPIC_MONTHS,
    targets: targets.map((row) => asStand(row, snapshotInterval)),
});

const named = (rows: { id: number; name: string }[]) => HttpResponse.json({ total: rows.length, _embedded: rows });

const handlers = (dashboard: () => Response | Promise<Response>) => [
    http.get(`${adminStatisticsDashboardEndpoint}*`, dashboard),
    http.get(`${agencyEndpointBase}/*`, () =>
        named([
            { id: 11, name: 'Beratungsstelle Musterstadt' },
            { id: 12, name: 'Beratungsstelle Beispielort' },
            { id: 13, name: 'Beratungsstelle Testheim' },
        ]),
    ),
    http.get(`${tenantAdminEndpoint}/search*`, () =>
        named([
            { id: 2, name: 'Träger Musterland' },
            { id: 3, name: 'Träger Beispielregion' },
        ]),
    ),
    http.get(`${topicAdminEndpoint}/*`, () =>
        named([
            { id: 1, name: 'Schwangerschaft' },
            { id: 2, name: 'Schulden' },
            { id: 3, name: 'Sucht' },
        ]),
    ),
    http.get(`${tutorialStatisticsEndpoint}*`, () =>
        HttpResponse.json({ generatedAt: GENERATED_AT, scope: 'PLATFORM', tenants: [] }),
    ),
];

const fixedStand = (snapshotInterval: StatisticSnapshotInterval) =>
    handlers(() => HttpResponse.json(statistics(snapshotInterval)));

const meta = {
    title: 'Pages/Statistic',
    component: Statistic,
    parameters: { layout: 'fullscreen', msw: { handlers: fixedStand('DAILY') } },
    // Its own cache per story: the page keeps its data for a minute, so the shared client of the
    // preview would show the previous story's numbers.
    decorators: [
        (Story, { id }) => (
            <QueryClientProvider key={id} client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <Story />
            </QueryClientProvider>
        ),
    ],
    beforeEach: () => {
        const previousAccess = getSessionAccessToken();
        const previousRefresh = getSessionRefreshToken();
        // A platform admin sees all three levels; the token only drives the UI here, MSW answers.
        const claims = { tenantId: 0, realm_access: { roles: ['agency-admin', 'tenant-admin'] } };
        setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
        return () => setSessionTokens(previousAccess, previousRefresh);
    },
} satisfies Meta<typeof Statistic>;
export default meta;
type Story = StoryObj<typeof meta>;

export const DailyStand: Story = {
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const heading = await canvas.findByText('Anfragen gesamt');
        // The dashboard fades in, so the text is in the DOM before it is visible.
        await waitFor(() => expect(heading).toBeVisible());
        const bar = canvasElement.querySelector('.statisticDashboard__bar') as HTMLElement;
        await expect(Number.parseFloat(getComputedStyle(bar).animationDuration)).toBeLessThanOrEqual(0.48);
        const tooltip = canvasElement.querySelector('.statisticDashboard__barTooltip') as HTMLElement;
        await expect(getComputedStyle(tooltip).backgroundColor).toBe('rgb(27, 27, 28)');
    },
};
export const WeeklyStand: Story = {
    parameters: { msw: { handlers: fixedStand('WEEKLY') } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect(await canvas.findAllByRole('button', { name: /Beratungsfälle in KW/ })).toHaveLength(CHART_WEEKS);
        const notice = canvas.getByText(/^Zahlen bis einschließlich 01\.11\.2026\./);
        // The page fades in, so the notice is only visible once that has settled.
        await waitFor(() => expect(notice).toBeVisible());
        await expect(getComputedStyle(notice).marginBottom).toBe('16px');
        // The newest week is the tallest bar: its tooltip must stay clear of the period menu above it.
        const tooltip = canvasElement.querySelector('.statisticDashboard__barTooltip') as HTMLElement;
        const menu = canvas.getByText('5 Wochen im Überblick');
        await expect(tooltip.getBoundingClientRect().top).toBeGreaterThanOrEqual(menu.getBoundingClientRect().bottom);
    },
};
export const Live: Story = { parameters: { msw: { handlers: fixedStand('LIVE') } } };
export const WithSuppressedCentre: Story = {
    parameters: {
        msw: {
            handlers: handlers(() =>
                HttpResponse.json(
                    statistics('DAILY', [
                        target('PLATFORM', null, null, 4),
                        target('TENANT', 2, null, 2),
                        target('AGENCY', 2, 11, 1),
                        suppressedTarget(12),
                    ]),
                ),
            ),
        },
    },
};
// A Träger admin sees the rows of the own centres, one of them hidden next to a shown one.
export const HiddenRowNextToShownRow: Story = {
    parameters: {
        msw: {
            handlers: handlers(() =>
                HttpResponse.json({
                    ...statistics('DAILY', [
                        target('TENANT', 2, null, 2),
                        target('AGENCY', 2, 11, 1),
                        suppressedTarget(12),
                    ]),
                    scope: 'TENANT',
                }),
            ),
        },
    },
    beforeEach: () => {
        const claims = { tenantId: 2, realm_access: { roles: ['tenant-admin'] } };
        setSessionTokens(`${btoa('{}')}.${btoa(JSON.stringify(claims))}.fixture`, 'storybook-refresh-fixture');
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        fireEvent.click(await canvas.findByText('Auf Beratungsstellenebene'));
        const notice = await canvas.findByText(/kann auch einen größeren Bereich treffen/);
        await waitFor(() => expect(notice).toBeVisible());
        await expect(canvas.queryByText(/Die Gesamtzahl wird aus Datenschutzgründen nicht angezeigt/)).toBeNull();
        await expect(canvas.getByText('Statistik als CSV herunterladen')).toBeVisible();
    },
};
// The total itself is hidden (UserService#1567): it would reveal a small row, or rests on too few people.
export const HiddenTotal: Story = {
    parameters: {
        msw: {
            handlers: handlers(() =>
                HttpResponse.json(
                    statistics('DAILY', [
                        { ...suppressedTarget(0), targetType: 'PLATFORM', tenantId: null, agencyId: null },
                        target('TENANT', 2, null, 2),
                        target('AGENCY', 2, 11, 1),
                    ]),
                ),
            ),
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const notice = await canvas.findByText(/Die Gesamtzahl wird aus Datenschutzgründen nicht angezeigt/);
        // The page fades in, so the notice is only visible once that has settled.
        await waitFor(() => expect(notice).toBeVisible());
        await expect(canvas.getAllByText('Statistik unterdrückt').length).toBeGreaterThan(0);
        // a chart of zeros would read as "nothing happened"
        await expect(canvasElement.querySelector('.statisticDashboard__chartGrid')).toBeNull();
        await expect(canvas.queryByText('Statistik als CSV herunterladen')).toBeNull();
    },
};
const withoutCases = (row: AdminDashboardTarget): AdminDashboardTarget => ({
    ...row,
    metrics: {
        enquiriesCurrentMonth: 0,
        enquiriesPreviousMonth: 0,
        activeCases: 0,
        activeConversationsToday: 0,
        groupChatsTotal: 0,
    },
    dailyNewSessions: [],
    monthlyTopTopics: [],
    sessionCountsByPeriod: periods(0),
    groupChatCountsByPeriod: periods(0),
});
export const StandWithoutCases: Story = {
    parameters: {
        msw: {
            handlers: handlers(() =>
                HttpResponse.json(
                    statistics('DAILY', [
                        withoutCases(target('PLATFORM', null, null, 4)),
                        withoutCases(target('TENANT', 2, null, 2)),
                        withoutCases(target('AGENCY', 2, 11, 1)),
                    ]),
                ),
            ),
        },
    },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        await expect((await canvas.findAllByText('0')).length).toBeGreaterThan(0);
        await expect(canvas.queryByText('Ihr Dashboard füllt sich mit der ersten Beratung')).toBeNull();
    },
};
export const NoData: Story = {
    parameters: { msw: { handlers: handlers(() => HttpResponse.json(statistics('DAILY', []))) } },
};
export const Loading: Story = {
    parameters: {
        msw: {
            handlers: handlers(async () => {
                await delay('infinite');
                return HttpResponse.json(statistics('DAILY'));
            }),
        },
    },
};
export const LoadError: Story = {
    parameters: { msw: { handlers: handlers(() => new HttpResponse(null, { status: 500 })) } },
};
// The settings behind the statistics cannot be read (UserService#1568): no figures, not even old ones.
export const TemporarilyUnavailable: Story = {
    parameters: { msw: { handlers: handlers(() => new HttpResponse(null, { status: 503 })) } },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const notice = await canvas.findByText(/vorübergehend nicht verfügbar/);
        // The page fades in, so the notice is only visible once that has settled.
        await waitFor(() => expect(notice).toBeVisible());
        await expect(canvas.queryByText('Statistik als CSV herunterladen')).toBeNull();
        await expect(canvasElement.querySelector('.statisticDashboard__summaryGrid')).toBeNull();
    },
};
