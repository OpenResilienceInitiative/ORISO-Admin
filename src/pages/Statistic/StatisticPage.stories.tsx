import type { Meta, StoryObj } from '@storybook/react-vite';
import { delay, http, HttpResponse } from 'msw';
// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, within } from 'storybook/test';
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
    counselorCount: 1,
    suppressed: true,
    metrics: null,
    dailyNewSessions: [],
    monthlyTopTopics: [],
    sessionCountsByPeriod: null,
    groupChatCountsByPeriod: null,
});

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
    generatedAt: GENERATED_AT,
    scope: 'PLATFORM',
    snapshotInterval,
    chartWeeks: CHART_WEEKS,
    topicMonths: TOPIC_MONTHS,
    targets,
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
        await expect(await canvas.findByText('Anfragen gesamt')).toBeVisible();
        const bar = canvasElement.querySelector('.statisticDashboard__bar') as HTMLElement;
        await expect(Number.parseFloat(getComputedStyle(bar).animationDuration)).toBeLessThanOrEqual(0.48);
        const tooltip = canvasElement.querySelector('.statisticDashboard__barTooltip') as HTMLElement;
        await expect(getComputedStyle(tooltip).backgroundColor).toBe('rgb(27, 27, 28)');
    },
};
export const WeeklyStand: Story = { parameters: { msw: { handlers: fixedStand('WEEKLY') } } };
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
