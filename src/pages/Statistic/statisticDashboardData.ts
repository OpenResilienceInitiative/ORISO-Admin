import type {
    AdminDashboardPeriodCounts,
    AdminDashboardStatisticsResponse,
    AdminDashboardTarget,
} from '../../api/statistic/getDashboardStatistics';
import type { CardMenuKey, CaseChartBar, CasePeriodKey, ConversationPeriodKey, PeriodOption, ScopeKey } from './types';

/**
 * Pure mapping from the UserService admin statistics response to the dashboard data
 * shapes. All numbers shown on the statistics dashboard originate here — there is no
 * mock data anymore. Metrics without an application-layer data source (messages, video
 * calls, voice messages, phone calls, live chat) are represented as `null` and rendered
 * as "Keine Daten".
 */

export type FilterTargetType = 'Träger' | 'Beratungsstelle';

export interface FilterTarget {
    id: string;
    label: string;
    type: FilterTargetType;
    detail: string;
}

export interface TopicStatistic {
    label: string;
    share: number;
}

export type MetricValue = number | null;

export interface FilterTargetMetricStats {
    activeAgencies: MetricValue;
    activeConversations: MetricValue;
    cases: MetricValue;
    conversationsTotal: MetricValue;
    counselors: MetricValue;
    groups: MetricValue;
    liveChat: MetricValue;
    messagesCounselors: MetricValue;
    messagesSeekers: MetricValue;
    oneToOne: MetricValue;
    phoneCalls: MetricValue;
    textMessagesTotal: MetricValue;
    videoCalls: MetricValue;
    voiceMessages: MetricValue;
    /** Top topic per month of the topic window; index 0 = this month, 1 = last month, … */
    topicsByMonth: TopicStatistic[];
}

export type ConversationValues = [number, number, number, number];

export interface FilterTargetStatistics {
    suppressed: boolean;
    enquiriesPreviousMonth: MetricValue;
    /** Seven daily values (Mon–Sun) per week of the chart window; index 0 = this week. */
    caseCharts: number[][];
    conversation: Record<ConversationPeriodKey, ConversationValues>;
    metrics: FilterTargetMetricStats;
}

export interface StatisticData {
    targetsByScope: Record<ScopeKey, FilterTarget[]>;
    fallbackIdsByScope: Record<ScopeKey, string[]>;
    statisticsById: Record<string, FilterTargetStatistics>;
    /** True when the backend skipped small-cell suppression (test environments only). */
    suppressionDisabled: boolean;
    /** Weeks of the requests chart, the current week included (global statistics setting). */
    chartWeeks: number;
    /** Months of the top-topic ranking, the current month included (global statistics setting). */
    topicMonths: number;
}

export interface StatisticNameLookups {
    agencyNamesById: Record<string, string>;
    tenantNamesById: Record<string, string>;
    topicNamesById: Record<string, string>;
}

export const NO_DATA_LABEL = 'Keine Daten';
export const SUPPRESSED_DETAIL = 'Statistik unterdrückt';

const noDataTopic = (): TopicStatistic => ({ label: NO_DATA_LABEL, share: 0 });

/** Today's fixed windows; used until the backend reports the configured ones (UserService#1544). */
export const DEFAULT_CHART_WEEKS = 5;
export const DEFAULT_TOPIC_MONTHS = 4;
// Upper bounds well above the server's options, only to keep a broken response from building huge charts.
const MAX_CHART_WEEKS = 53;
const MAX_TOPIC_MONTHS = 24;

const resolveWindow = (value: number | undefined, fallback: number, max: number) =>
    typeof value === 'number' && Number.isInteger(value) && value >= 1 ? Math.min(value, max) : fallback;

export const CASE_WEEK_OVERVIEW_KEY: CasePeriodKey = 'weekOverview';
export const casePeriodKeyForWeek = (weeksAgo: number): CasePeriodKey => `weeksAgo${weeksAgo}`;

const namedWeekLabels = ['diese Woche', 'letzte Woche', 'vor zwei Wochen', 'vor drei Wochen', 'vor vier Wochen'];

/** One option per week of the chart window, newest first, then the week overview. */
export const buildCasePeriodOptions = (chartWeeks: number): Array<PeriodOption<CasePeriodKey>> => [
    ...Array.from({ length: chartWeeks }, (unused, weeksAgo) => ({
        key: casePeriodKeyForWeek(weeksAgo),
        label: namedWeekLabels[weeksAgo] ?? `vor ${weeksAgo} Wochen`,
    })),
    { key: CASE_WEEK_OVERVIEW_KEY, label: `${chartWeeks} Wochen im Überblick` },
];

const namedTopicMenuKeys: CardMenuKey[] = ['topTopic', 'previousMonth', 'twoMonthsAgo', 'threeMonthsAgo'];

/** Metric-menu key of the top topic n months back; the first four keep their established names. */
export const topicMenuKeyForMonth = (monthsAgo: number): CardMenuKey =>
    namedTopicMenuKeys[monthsAgo] ?? `topicMonthsAgo${monthsAgo}`;

const conversationPeriodOrder: ConversationPeriodKey[] = [
    'today',
    'yesterday',
    'thisWeek',
    'total',
    'thisYear',
    'lastYear',
];

export const tenantTargetId = (tenantId: number) => `tenant-${tenantId}`;
export const agencyTargetId = (agencyId: number) => `agency-${agencyId}`;
/** The whole platform as one row (OBP #93); only platform admins receive it. */
export const PLATFORM_TOTAL_TARGET_ID = 'platform-total';

/* ---------- date helpers ---------- */

const dayInMs = 24 * 60 * 60 * 1000;

/** Monday 00:00 (local time) of the week containing the given date. */
export const getWeekStart = (now: Date): Date => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekday = (date.getDay() + 6) % 7; // Monday = 0

    return new Date(date.getTime() - weekday * dayInMs);
};

/** Monday 00:00 of this week and of each week before it; index = weeks back. */
export const getWeekStarts = (now: Date, chartWeeks: number): Date[] => {
    const currentWeekStart = getWeekStart(now);

    // via the calendar date, not milliseconds, so a daylight-saving switch cannot shift a Monday
    return Array.from(
        { length: chartWeeks },
        (unused, weeksAgo) =>
            new Date(
                currentWeekStart.getFullYear(),
                currentWeekStart.getMonth(),
                currentWeekStart.getDate() - weeksAgo * 7,
            ),
    );
};

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

const toIsoDate = (date: Date) =>
    `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

export const caseChartDayCodes = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'short' });
const shortDate = (date: Date) => `${date.getDate()} ${monthFormatter.format(date).replace('.', '')}`;

/** Real date labels per week (index = weeks back), e.g. "Do, 9 Jul" (day code is translated at render time). */
export const buildCaseChartDateLabels = (now: Date, chartWeeks: number = DEFAULT_CHART_WEEKS): string[][] =>
    getWeekStarts(now, chartWeeks).map((weekStart) =>
        caseChartDayCodes.map((dayCode, index) => `${dayCode}, ${shortDate(addDays(weekStart, index))}`),
    );

/** ISO 8601 calendar week of a date (weeks start on Monday, week 1 holds the first Thursday). */
export const getIsoWeek = (date: Date): number => {
    const day = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const weekday = day.getUTCDay() || 7; // Monday = 1 … Sunday = 7
    day.setUTCDate(day.getUTCDate() + 4 - weekday); // the Thursday of this week decides the year
    const yearStart = Date.UTC(day.getUTCFullYear(), 0, 1);

    return Math.ceil(((day.getTime() - yearStart) / dayInMs + 1) / 7);
};

/**
 * The week overview: one bar per week of the chart window, oldest first, each the sum of its seven
 * days. Bars are named by calendar week ("KW 28"); the current week is selected by default.
 */
export const buildCaseWeekOverview = (caseCharts: number[][], now: Date): CaseChartBar[] => {
    const weekStarts = getWeekStarts(now, caseCharts.length);

    return caseCharts
        .map((days, weeksAgo) => {
            const weekStart = weekStarts[weeksAgo];
            const calendarWeek = `KW ${getIsoWeek(weekStart)}`;

            return {
                day: calendarWeek,
                dateLabel: `${calendarWeek}, ${shortDate(weekStart)} – ${shortDate(addDays(weekStart, 6))}`,
                value: days.reduce((sum, value) => sum + value, 0),
                isDefaultSelected: weeksAgo === 0,
            };
        })
        .reverse();
};

/** German two-letter code of today's weekday, used as default-selected chart bar. */
export const getTodayDayCode = (now: Date): string => caseChartDayCodes[(now.getDay() + 6) % 7];

const buildCaseChartValues = (
    dailyNewSessions: AdminDashboardTarget['dailyNewSessions'],
    now: Date,
    chartWeeks: number,
): number[][] => {
    const countsByDate: Record<string, number> = {};
    dailyNewSessions.forEach(({ date, count }) => {
        countsByDate[date] = (countsByDate[date] || 0) + count;
    });

    return getWeekStarts(now, chartWeeks).map((weekStart) =>
        caseChartDayCodes.map((unusedDayCode, index) => countsByDate[toIsoDate(addDays(weekStart, index))] || 0),
    );
};

export const emptyCaseCharts = (chartWeeks: number): number[][] =>
    Array.from({ length: chartWeeks }, () => [0, 0, 0, 0, 0, 0, 0]);

export const noDataTopics = (topicMonths: number): TopicStatistic[] => Array.from({ length: topicMonths }, noDataTopic);

/* ---------- statistics mapping ---------- */

const isoMonth = (date: Date) => `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`;

const monthKeyWithOffset = (now: Date, monthsBack: number) =>
    isoMonth(new Date(now.getFullYear(), now.getMonth() - monthsBack, 1));

const buildTopicStatistic = (
    target: AdminDashboardTarget,
    monthKey: string,
    topicNamesById: Record<string, string>,
): TopicStatistic => {
    const monthlyTopic = target.monthlyTopTopics.find((topic) => topic.month === monthKey);

    if (!monthlyTopic || monthlyTopic.topicId === null) {
        return noDataTopic();
    }

    return {
        label: topicNamesById[`${monthlyTopic.topicId}`] || `#${monthlyTopic.topicId}`,
        share: monthlyTopic.sharePercent,
    };
};

const buildConversationValues = (
    sessionCounts: AdminDashboardPeriodCounts | null,
    chatCounts: AdminDashboardPeriodCounts | null,
): Record<ConversationPeriodKey, ConversationValues> =>
    conversationPeriodOrder.reduce(
        (conversation, periodKey) => ({
            ...conversation,
            // segments: [Mail (1:1), Live, Gesprächskreise, Interna] — Live and Interna
            // have no application-layer data source yet
            [periodKey]: [sessionCounts?.[periodKey] || 0, 0, chatCounts?.[periodKey] || 0, 0],
        }),
        {} as Record<ConversationPeriodKey, ConversationValues>,
    );

interface TimeWindows {
    chartWeeks: number;
    topicMonths: number;
}

const buildTargetStatistics = (
    target: AdminDashboardTarget,
    agencyRowCount: number,
    topicNamesById: Record<string, string>,
    now: Date,
    windows: TimeWindows,
): FilterTargetStatistics => {
    if (target.suppressed) {
        return {
            suppressed: true,
            enquiriesPreviousMonth: null,
            caseCharts: emptyCaseCharts(windows.chartWeeks),
            conversation: buildConversationValues(null, null),
            metrics: {
                activeAgencies: null,
                activeConversations: null,
                cases: null,
                conversationsTotal: null,
                counselors: target.counselorCount,
                groups: null,
                liveChat: null,
                messagesCounselors: null,
                messagesSeekers: null,
                oneToOne: null,
                phoneCalls: null,
                textMessagesTotal: null,
                videoCalls: null,
                voiceMessages: null,
                topicsByMonth: noDataTopics(windows.topicMonths),
            },
        };
    }

    return {
        suppressed: false,
        enquiriesPreviousMonth: target.metrics?.enquiriesPreviousMonth ?? null,
        caseCharts: buildCaseChartValues(target.dailyNewSessions, now, windows.chartWeeks),
        conversation: buildConversationValues(target.sessionCountsByPeriod, target.groupChatCountsByPeriod),
        metrics: {
            activeAgencies: target.targetType === 'AGENCY' ? 1 : agencyRowCount || null,
            activeConversations: target.metrics?.activeConversationsToday ?? null,
            cases: target.metrics?.activeCases ?? null,
            conversationsTotal: target.sessionCountsByPeriod?.total ?? null,
            counselors: target.counselorCount,
            groups: target.groupChatCountsByPeriod?.total ?? null,
            liveChat: null,
            messagesCounselors: null,
            messagesSeekers: null,
            oneToOne: target.metrics?.enquiriesCurrentMonth ?? null,
            phoneCalls: null,
            textMessagesTotal: null,
            videoCalls: null,
            voiceMessages: null,
            topicsByMonth: Array.from({ length: windows.topicMonths }, (unused, monthsAgo) =>
                buildTopicStatistic(target, monthKeyWithOffset(now, monthsAgo), topicNamesById),
            ),
        },
    };
};

/* ---------- target mapping ---------- */

const buildFilterTarget = (target: AdminDashboardTarget, lookups: StatisticNameLookups): FilterTarget | null => {
    if (target.targetType === 'TENANT' && target.tenantId !== null) {
        return {
            id: tenantTargetId(target.tenantId),
            label: lookups.tenantNamesById[`${target.tenantId}`] || `Träger ${target.tenantId}`,
            type: 'Träger',
            detail: target.suppressed ? SUPPRESSED_DETAIL : '',
        };
    }
    if (target.targetType === 'AGENCY' && target.agencyId !== null) {
        const tenantName = target.tenantId !== null ? lookups.tenantNamesById[`${target.tenantId}`] : undefined;

        return {
            id: agencyTargetId(target.agencyId),
            label: lookups.agencyNamesById[`${target.agencyId}`] || `Beratungsstelle ${target.agencyId}`,
            type: 'Beratungsstelle',
            detail: target.suppressed ? SUPPRESSED_DETAIL : tenantName || '',
        };
    }

    return null;
};

export const emptyStatisticData = (): StatisticData => ({
    targetsByScope: { platform: [], tenant: [], agency: [] },
    fallbackIdsByScope: { platform: [], tenant: [], agency: [] },
    statisticsById: {},
    suppressionDisabled: false,
    chartWeeks: DEFAULT_CHART_WEEKS,
    topicMonths: DEFAULT_TOPIC_MONTHS,
});

export const buildStatisticData = (
    response: AdminDashboardStatisticsResponse | undefined,
    lookups: StatisticNameLookups,
    now: Date = new Date(),
): StatisticData => {
    if (!response) {
        return emptyStatisticData();
    }

    const windows: TimeWindows = {
        chartWeeks: resolveWindow(response.chartWeeks, DEFAULT_CHART_WEEKS, MAX_CHART_WEEKS),
        topicMonths: resolveWindow(response.topicMonths, DEFAULT_TOPIC_MONTHS, MAX_TOPIC_MONTHS),
    };
    const tenantRows = response.targets.filter((target) => target.targetType === 'TENANT');
    const agencyRows = response.targets.filter((target) => target.targetType === 'AGENCY');

    const statisticsById: Record<string, FilterTargetStatistics> = {};
    const targetIdsInOrder: string[] = [];
    response.targets.forEach((target) => {
        const filterTarget = buildFilterTarget(target, lookups);

        if (filterTarget) {
            statisticsById[filterTarget.id] = buildTargetStatistics(
                target,
                agencyRows.length,
                lookups.topicNamesById,
                now,
                windows,
            );
            targetIdsInOrder.push(filterTarget.id);
        }
    });

    const tenantTargets = tenantRows
        .map((target) => buildFilterTarget(target, lookups))
        .filter((target): target is FilterTarget => Boolean(target));
    const agencyTargets = agencyRows
        .map((target) => buildFilterTarget(target, lookups))
        .filter((target): target is FilterTarget => Boolean(target));

    const suppressionDisabled = Boolean(response.suppressionDisabled);

    if (response.scope === 'PLATFORM') {
        // The backend's platform total is suppressed only when the platform itself is below its
        // threshold. Adding up unsuppressed Träger instead would hide the whole platform as soon
        // as every single Träger is small (OBP #93).
        const platformRow = response.targets.find((target) => target.targetType === 'PLATFORM');
        if (platformRow) {
            statisticsById[PLATFORM_TOTAL_TARGET_ID] = buildTargetStatistics(
                platformRow,
                agencyRows.length,
                lookups.topicNamesById,
                now,
                windows,
            );
        }

        return {
            targetsByScope: { platform: tenantTargets, tenant: tenantTargets, agency: [] },
            fallbackIdsByScope: {
                platform: platformRow ? [PLATFORM_TOTAL_TARGET_ID] : tenantTargets.map((target) => target.id),
                tenant: tenantTargets.map((target) => target.id),
                agency: [],
            },
            statisticsById,
            suppressionDisabled,
            ...windows,
        };
    }

    if (response.scope === 'TENANT') {
        const tenantFallback = tenantTargets.length ? [tenantTargets[0].id] : agencyTargets.map((target) => target.id);

        return {
            targetsByScope: { platform: [], tenant: agencyTargets, agency: agencyTargets },
            fallbackIdsByScope: {
                platform: [],
                tenant: tenantFallback,
                agency: agencyTargets.map((target) => target.id),
            },
            statisticsById,
            suppressionDisabled,
            ...windows,
        };
    }

    return {
        targetsByScope: { platform: [], tenant: [], agency: agencyTargets },
        fallbackIdsByScope: {
            platform: [],
            tenant: [],
            agency: agencyTargets.map((target) => target.id),
        },
        statisticsById,
        suppressionDisabled,
        ...windows,
    };
};
