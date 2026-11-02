import { describe, expect, it, vi } from 'vitest';
import type {
    AdminDashboardStatisticsResponse,
    AdminDashboardTarget,
} from '../../api/statistic/getDashboardStatistics';
import {
    buildCaseChartDateLabels,
    buildCasePeriodOptions,
    buildCaseWeekOverview,
    buildStatisticData,
    emptyStatisticData,
    getIsoWeek,
    getTodayDayCode,
    getWeekStart,
    NO_DATA_LABEL,
    SUPPRESSED_DETAIL,
    formatStandDay,
} from './statisticDashboardData';

// Saturday, 11 July 2026 (local time)
const now = new Date(2026, 6, 11, 12, 0, 0);

const emptyLookups = { agencyNamesById: {}, tenantNamesById: {}, topicNamesById: {} };

const periodCounts = (values: Partial<Record<string, number>> = {}) => ({
    today: values.today ?? 0,
    yesterday: values.yesterday ?? 0,
    thisWeek: values.thisWeek ?? 0,
    total: values.total ?? 0,
    thisYear: values.thisYear ?? 0,
    lastYear: values.lastYear ?? 0,
});

const agencyTarget = (overrides: Partial<AdminDashboardTarget> = {}): AdminDashboardTarget => ({
    targetType: 'AGENCY',
    tenantId: 5,
    agencyId: 11,
    counselorCount: 3,
    suppressed: false,
    metrics: {
        enquiriesCurrentMonth: 4,
        enquiriesPreviousMonth: 2,
        activeCases: 7,
        activeConversationsToday: 1,
        groupChatsTotal: 2,
    },
    dailyNewSessions: [],
    monthlyTopTopics: [],
    sessionCountsByPeriod: periodCounts({ today: 1, total: 20 }),
    groupChatCountsByPeriod: periodCounts({ today: 1, total: 2 }),
    ...overrides,
});

const tenantScopeResponse = (targets: AdminDashboardTarget[]): AdminDashboardStatisticsResponse => ({
    generatedAt: '2026-07-11T10:00:00Z',
    scope: 'TENANT',
    targets,
});

describe('statisticDashboardData', () => {
    it('returns empty data when no response is available', () => {
        expect(buildStatisticData(undefined, emptyLookups, now)).toEqual(emptyStatisticData());
    });

    it('maps tenant scope to a tenant fallback and selectable agency targets', () => {
        const tenantRow: AdminDashboardTarget = agencyTarget({
            targetType: 'TENANT',
            agencyId: null,
            counselorCount: 4,
        });
        const data = buildStatisticData(
            tenantScopeResponse([tenantRow, agencyTarget(), agencyTarget({ agencyId: 12 })]),
            {
                ...emptyLookups,
                agencyNamesById: { '11': 'U25 Düsseldorf' },
            },
            now,
        );

        expect(data.fallbackIdsByScope.tenant).toEqual(['tenant-5']);
        expect(data.targetsByScope.tenant.map((target) => target.id)).toEqual(['agency-11', 'agency-12']);
        expect(data.fallbackIdsByScope.agency).toEqual(['agency-11', 'agency-12']);
        expect(data.targetsByScope.tenant[0].label).toBe('U25 Düsseldorf');
        // unresolved names fall back to the id
        expect(data.targetsByScope.tenant[1].label).toBe('Beratungsstelle 12');
        expect(data.statisticsById['tenant-5'].metrics.cases).toBe(7);
        expect(data.statisticsById['agency-11'].metrics.oneToOne).toBe(4);
        expect(data.statisticsById['agency-11'].enquiriesPreviousMonth).toBe(2);
    });

    it('marks suppressed targets and hides all counselling metrics', () => {
        const suppressed = agencyTarget({
            agencyId: 12,
            counselorCount: 1,
            suppressed: true,
            metrics: null,
            sessionCountsByPeriod: null,
            groupChatCountsByPeriod: null,
        });
        const data = buildStatisticData(tenantScopeResponse([suppressed]), emptyLookups, now);

        const stats = data.statisticsById['agency-12'];
        expect(stats.suppressed).toBe(true);
        expect(stats.metrics.cases).toBeNull();
        expect(stats.metrics.oneToOne).toBeNull();
        expect(stats.metrics.counselors).toBe(1);
        expect(stats.metrics.topicsByMonth[0].label).toBe(NO_DATA_LABEL);
        expect(data.targetsByScope.agency[0].detail).toBe(SUPPRESSED_DETAIL);
    });

    it('buckets daily session counts into calendar weeks', () => {
        const target = agencyTarget({
            dailyNewSessions: [
                { date: '2026-07-06', count: 2 }, // Monday of the current week
                { date: '2026-07-11', count: 3 }, // Saturday (today)
                { date: '2026-07-01', count: 1 }, // Wednesday of last week
            ],
        });
        const data = buildStatisticData(tenantScopeResponse([target]), emptyLookups, now);

        const { caseCharts } = data.statisticsById['agency-11'];
        expect(caseCharts[0]).toEqual([2, 0, 0, 0, 0, 3, 0]);
        expect(caseCharts[1]).toEqual([0, 0, 1, 0, 0, 0, 0]);
        expect(caseCharts[4]).toEqual([0, 0, 0, 0, 0, 0, 0]);
    });

    it('maps conversation donut values to sessions and group chats per period', () => {
        const target = agencyTarget({
            sessionCountsByPeriod: periodCounts({ today: 3, total: 40 }),
            groupChatCountsByPeriod: periodCounts({ today: 1, total: 5 }),
        });
        const data = buildStatisticData(tenantScopeResponse([target]), emptyLookups, now);

        const { conversation } = data.statisticsById['agency-11'];
        expect(conversation.today).toEqual([3, 0, 1, 0]);
        expect(conversation.total).toEqual([40, 0, 5, 0]);
    });

    it('resolves monthly top topics by calendar month with topic names', () => {
        const target = agencyTarget({
            monthlyTopTopics: [
                { month: '2026-07', topicId: 100, sessionCount: 3, sharePercent: 75 },
                { month: '2026-06', topicId: 200, sessionCount: 2, sharePercent: 50 },
            ],
        });
        const data = buildStatisticData(
            tenantScopeResponse([target]),
            { ...emptyLookups, topicNamesById: { '100': 'Schulden' } },
            now,
        );

        const { metrics } = data.statisticsById['agency-11'];
        expect(metrics.topicsByMonth[0]).toEqual({ label: 'Schulden', share: 75 });
        expect(metrics.topicsByMonth[1]).toEqual({ label: '#200', share: 50 });
        expect(metrics.topicsByMonth[2].label).toBe(NO_DATA_LABEL);
    });

    it('feeds platform and tenant scope with tenant rows for platform admins', () => {
        const response: AdminDashboardStatisticsResponse = {
            generatedAt: '2026-07-11T10:00:00Z',
            scope: 'PLATFORM',
            targets: [
                agencyTarget({ targetType: 'TENANT', tenantId: 1, agencyId: null, counselorCount: 5 }),
                agencyTarget({ targetType: 'TENANT', tenantId: 2, agencyId: null, counselorCount: 3 }),
            ],
        };
        const data = buildStatisticData(response, { ...emptyLookups, tenantNamesById: { '1': 'Caritas NRW' } }, now);

        expect(data.targetsByScope.platform.map((target) => target.id)).toEqual(['tenant-1', 'tenant-2']);
        expect(data.targetsByScope.tenant.map((target) => target.id)).toEqual(['tenant-1', 'tenant-2']);
        expect(data.fallbackIdsByScope.platform).toEqual(['tenant-1', 'tenant-2']);
        expect(data.targetsByScope.platform[0].label).toBe('Caritas NRW');
        expect(data.targetsByScope.platform[1].label).toBe('Träger 2');
    });

    it('uses the platform total for the platform view, not the sum of unsuppressed Träger (OBP #93)', () => {
        const response: AdminDashboardStatisticsResponse = {
            generatedAt: '2026-07-11T10:00:00Z',
            scope: 'PLATFORM',
            targets: [
                agencyTarget({ targetType: 'PLATFORM', tenantId: null, agencyId: null, counselorCount: 12 }),
                agencyTarget({
                    targetType: 'TENANT',
                    tenantId: 1,
                    agencyId: null,
                    counselorCount: 3,
                    suppressed: true,
                    metrics: null,
                }),
                agencyTarget({
                    targetType: 'TENANT',
                    tenantId: 2,
                    agencyId: null,
                    counselorCount: 4,
                    suppressed: true,
                    metrics: null,
                }),
            ],
        };
        const data = buildStatisticData(response, emptyLookups, now);

        // the platform total is the default view; the Träger stay selectable one by one
        expect(data.fallbackIdsByScope.platform).toEqual(['platform-total']);
        expect(data.statisticsById['platform-total'].suppressed).toBe(false);
        expect(data.statisticsById['platform-total'].metrics.cases).toBe(7);
        expect(data.targetsByScope.platform.map((target) => target.id)).toEqual(['tenant-1', 'tenant-2']);
        expect(data.fallbackIdsByScope.tenant).toEqual(['tenant-1', 'tenant-2']);
    });

    it('passes the suppressionDisabled flag through from the backend', () => {
        const withFlag = { ...tenantScopeResponse([agencyTarget()]), suppressionDisabled: true };

        expect(buildStatisticData(withFlag, emptyLookups, now).suppressionDisabled).toBe(true);
        expect(buildStatisticData(tenantScopeResponse([agencyTarget()]), emptyLookups, now).suppressionDisabled).toBe(
            false,
        );
    });

    describe('fixed stand (UserService#1547)', () => {
        const standAt = '2026-10-26T05:00:00Z';
        const readLater = new Date('2026-11-02T04:00:00Z');
        const topicRow = agencyTarget({
            monthlyTopTopics: [{ month: '2026-10', topicId: 100, sessionCount: 3, sharePercent: 75 }],
        });

        it('reads a stand from the time it was calculated, not from today', () => {
            const data = buildStatisticData(
                {
                    generatedAt: standAt,
                    dataUntil: standAt.slice(0, 10),
                    scope: 'TENANT',
                    snapshotInterval: 'WEEKLY',
                    targets: [topicRow],
                },
                { ...emptyLookups, topicNamesById: { '100': 'Schulden' } },
                readLater,
            );

            expect(data.statisticsById['agency-11'].metrics.topicsByMonth[0].label).toBe('Schulden');
            expect(data.generatedAt).toBe(standAt);
            expect(data.snapshotInterval).toBe('WEEKLY');
        });

        it('puts the chart on the week of the stand, wherever the browser is', () => {
            vi.stubEnv('TZ', 'America/Los_Angeles');
            try {
                const { statisticsById } = buildStatisticData(
                    {
                        generatedAt: '2026-11-03T05:00:00Z',
                        dataUntil: '2026-11-02',
                        scope: 'TENANT',
                        snapshotInterval: 'DAILY',
                        targets: [agencyTarget({ dailyNewSessions: [{ date: '2026-11-02', count: 7 }] })],
                    },
                    emptyLookups,
                    readLater,
                );

                expect(statisticsById['agency-11'].caseCharts[0][0]).toBe(7);
            } finally {
                vi.unstubAllEnvs();
            }
        });

        it('reads a stand from its newest full day, wherever the browser is', () => {
            vi.stubEnv('TZ', 'America/Los_Angeles');
            try {
                const { referenceDate, dataUntil } = buildStatisticData(
                    {
                        generatedAt: '2026-11-02T05:00:00Z',
                        dataUntil: '2026-11-01',
                        scope: 'TENANT',
                        snapshotInterval: 'WEEKLY',
                        targets: [],
                    },
                    emptyLookups,
                    readLater,
                );

                expect(dataUntil).toBe('2026-11-01');
                expect(referenceDate?.getFullYear()).toBe(2026);
                expect(referenceDate?.getMonth()).toBe(10);
                expect(referenceDate?.getDate()).toBe(1);
            } finally {
                vi.unstubAllEnvs();
            }
        });

        it('puts the weeks of a weekly stand into the week overview', () => {
            const { statisticsById, referenceDate } = buildStatisticData(
                {
                    generatedAt: '2026-11-02T05:00:00Z',
                    dataUntil: '2026-11-01',
                    scope: 'TENANT',
                    snapshotInterval: 'WEEKLY',
                    chartWeeks: 2,
                    targets: [
                        {
                            ...topicRow,
                            dailyNewSessions: [],
                            weeklyNewSessions: [
                                { weekStart: '2026-10-19', count: 4 },
                                { weekStart: '2026-10-26', count: 9 },
                            ],
                        },
                    ],
                },
                emptyLookups,
                readLater,
            );

            const bars = buildCaseWeekOverview(statisticsById['agency-11'].caseCharts, referenceDate as Date);
            expect(bars.map((bar) => bar.value)).toEqual([4, 9]);
            expect(bars[1].isDefaultSelected).toBe(true);
        });

        it('falls back to today when a stand has no readable time', () => {
            const { referenceDate } = buildStatisticData(
                {
                    generatedAt: '2026-11-02T05:00:00Z',
                    dataUntil: 'not a date',
                    scope: 'TENANT',
                    snapshotInterval: 'WEEKLY',
                    targets: [],
                },
                emptyLookups,
                readLater,
            );

            expect(referenceDate).toEqual(readLater);
        });

        it('keeps reading live numbers from today', () => {
            const data = buildStatisticData(
                { generatedAt: standAt, scope: 'TENANT', snapshotInterval: 'LIVE', targets: [topicRow] },
                emptyLookups,
                readLater,
            );

            expect(data.referenceDate).toEqual(readLater);
            expect(data.snapshotInterval).toBe('LIVE');
        });

        it('treats a backend without the field as live', () => {
            const data = buildStatisticData(
                { generatedAt: standAt, scope: 'TENANT', targets: [topicRow] },
                emptyLookups,
                readLater,
            );

            expect(data.referenceDate).toEqual(readLater);
            expect(data.snapshotInterval).toBe('LIVE');
        });
    });

    it('shows an unreadable stand day as it came, instead of crashing the page', () => {
        expect(formatStandDay('not a date', 'de')).toBe('not a date');
        expect(formatStandDay('2026-11-01', 'de')).toBe('01.11.2026');
    });

    it('computes week starts and day codes', () => {
        expect(getWeekStart(now).getDate()).toBe(6); // Monday, 6 July 2026
        expect(getTodayDayCode(now)).toBe('Sa');
        expect(getIsoWeek(new Date(2026, 6, 6))).toBe(28);
        expect(getIsoWeek(new Date(2026, 0, 1))).toBe(1); // Thursday
        expect(getIsoWeek(new Date(2027, 0, 1))).toBe(53); // Friday, still week 53 of 2026

        const labels = buildCaseChartDateLabels(now);
        expect(labels[0][0]).toMatch(/^Mo, 6 Jul/);
        expect(labels[1][0]).toMatch(/^Mo, 29 Jun/);
    });
});

describe('configurable time windows (UserService#1544)', () => {
    const withWindows = (
        targets: AdminDashboardTarget[],
        windows: Partial<Pick<AdminDashboardStatisticsResponse, 'chartWeeks' | 'topicMonths'>>,
    ): AdminDashboardStatisticsResponse => ({ ...tenantScopeResponse(targets), ...windows });

    it("defaults to today's five weeks and four months when the backend does not report windows", () => {
        const data = buildStatisticData(tenantScopeResponse([agencyTarget()]), emptyLookups, now);

        expect(data.chartWeeks).toBe(5);
        expect(data.topicMonths).toBe(4);
        expect(data.statisticsById['agency-11'].caseCharts).toHaveLength(5);
        expect(data.statisticsById['agency-11'].metrics.topicsByMonth).toHaveLength(4);
    });

    it('builds one seven-day chart per configured week', () => {
        const target = agencyTarget({
            dailyNewSessions: [
                { date: '2026-07-06', count: 2 }, // Monday of the current week
                { date: '2026-04-22', count: 1 }, // Wednesday, eleven weeks before
            ],
        });
        const data = buildStatisticData(withWindows([target], { chartWeeks: 12 }), emptyLookups, now);

        const { caseCharts } = data.statisticsById['agency-11'];
        expect(data.chartWeeks).toBe(12);
        expect(caseCharts).toHaveLength(12);
        expect(caseCharts[0]).toEqual([2, 0, 0, 0, 0, 0, 0]);
        expect(caseCharts[11]).toEqual([0, 0, 1, 0, 0, 0, 0]);
    });

    it('resolves one top topic per configured month', () => {
        const target = agencyTarget({
            monthlyTopTopics: [{ month: '2025-08', topicId: 300, sessionCount: 2, sharePercent: 40 }],
        });
        const data = buildStatisticData(withWindows([target], { topicMonths: 12 }), emptyLookups, now);

        const { topicsByMonth } = data.statisticsById['agency-11'].metrics;
        expect(data.topicMonths).toBe(12);
        expect(topicsByMonth).toHaveLength(12);
        expect(topicsByMonth[11]).toEqual({ label: '#300', share: 40 });
        expect(topicsByMonth[0].label).toBe(NO_DATA_LABEL);
    });

    it('keeps suppressed targets at the configured window length without numbers', () => {
        const target = agencyTarget({ suppressed: true, metrics: null });
        const data = buildStatisticData(withWindows([target], { chartWeeks: 26, topicMonths: 3 }), emptyLookups, now);

        const stats = data.statisticsById['agency-11'];
        expect(stats.caseCharts).toHaveLength(26);
        expect(stats.caseCharts.flat().every((value) => value === 0)).toBe(true);
        expect(stats.metrics.topicsByMonth.map((topic) => topic.label)).toEqual([
            NO_DATA_LABEL,
            NO_DATA_LABEL,
            NO_DATA_LABEL,
        ]);
    });

    it('labels one chart period per configured week plus a week overview', () => {
        expect(buildCasePeriodOptions(8).map((option) => option.label)).toEqual([
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
        expect(new Set(buildCasePeriodOptions(8).map((option) => option.key)).size).toBe(9);
    });

    it('sums every configured week into one overview bar, oldest first', () => {
        const weeks = Array.from({ length: 12 }, (unused, weeksAgo) =>
            weeksAgo === 0 ? [1, 2, 0, 0, 0, 3, 0] : [0, 0, weeksAgo, 0, 0, 0, 0],
        );

        const bars = buildCaseWeekOverview(weeks, now);

        expect(bars).toHaveLength(12);
        expect(bars[11]).toMatchObject({ day: 'KW 28', value: 6, isDefaultSelected: true });
        expect(bars[11].dateLabel).toMatch(/^KW 28, 6 Jul\S* – 12 Jul/);
        expect(bars[0]).toMatchObject({ day: 'KW 17', value: 11, isDefaultSelected: false });
    });
});
