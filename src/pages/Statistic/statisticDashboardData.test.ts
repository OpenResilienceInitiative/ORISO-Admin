import { describe, expect, it } from 'vitest';
import type {
    AdminDashboardStatisticsResponse,
    AdminDashboardTarget,
} from '../../api/statistic/getDashboardStatistics';
import {
    buildCaseChartDateLabels,
    buildStatisticData,
    emptyStatisticData,
    getTodayDayCode,
    getWeekStart,
    NO_DATA_LABEL,
    SUPPRESSED_DETAIL,
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
        expect(stats.metrics.topTopic.label).toBe(NO_DATA_LABEL);
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
        expect(caseCharts.thisWeek).toEqual([2, 0, 0, 0, 0, 3, 0]);
        expect(caseCharts.lastWeek).toEqual([0, 0, 1, 0, 0, 0, 0]);
        expect(caseCharts.fourWeeksAgo).toEqual([0, 0, 0, 0, 0, 0, 0]);
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
        expect(metrics.topTopic).toEqual({ label: 'Schulden', share: 75 });
        expect(metrics.previousMonth).toEqual({ label: '#200', share: 50 });
        expect(metrics.twoMonthsAgo.label).toBe(NO_DATA_LABEL);
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

    it('passes the suppressionDisabled flag through from the backend', () => {
        const withFlag = { ...tenantScopeResponse([agencyTarget()]), suppressionDisabled: true };

        expect(buildStatisticData(withFlag, emptyLookups, now).suppressionDisabled).toBe(true);
        expect(buildStatisticData(tenantScopeResponse([agencyTarget()]), emptyLookups, now).suppressionDisabled).toBe(
            false,
        );
    });

    it('computes week starts and day codes', () => {
        expect(getWeekStart(now).getDate()).toBe(6); // Monday, 6 July 2026
        expect(getTodayDayCode(now)).toBe('Sa');

        const labels = buildCaseChartDateLabels(now);
        expect(labels.thisWeek[0]).toMatch(/^Mo, 6 Jul/);
        expect(labels.lastWeek[0]).toMatch(/^Mo, 29 Jun/);
    });
});
