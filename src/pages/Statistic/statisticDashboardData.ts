import type {
    AdminDashboardPeriodCounts,
    AdminDashboardStatisticsResponse,
    AdminDashboardTarget,
} from '../../api/statistic/getDashboardStatistics';
import type { CasePeriodKey, ConversationPeriodKey, ScopeKey } from './types';

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
    topTopic: TopicStatistic;
    previousMonth: TopicStatistic;
    twoMonthsAgo: TopicStatistic;
    threeMonthsAgo: TopicStatistic;
}

export type ConversationValues = [number, number, number, number];

export interface FilterTargetStatistics {
    suppressed: boolean;
    enquiriesPreviousMonth: MetricValue;
    caseCharts: Record<CasePeriodKey, number[]>;
    conversation: Record<ConversationPeriodKey, ConversationValues>;
    metrics: FilterTargetMetricStats;
}

export interface StatisticData {
    targetsByScope: Record<ScopeKey, FilterTarget[]>;
    fallbackIdsByScope: Record<ScopeKey, string[]>;
    statisticsById: Record<string, FilterTargetStatistics>;
    /** True when the backend skipped small-cell suppression (test environments only). */
    suppressionDisabled: boolean;
}

export interface StatisticNameLookups {
    agencyNamesById: Record<string, string>;
    tenantNamesById: Record<string, string>;
    topicNamesById: Record<string, string>;
}

export const NO_DATA_LABEL = 'Keine Daten';
export const SUPPRESSED_DETAIL = 'Statistik unterdrückt';

const noDataTopic = (): TopicStatistic => ({ label: NO_DATA_LABEL, share: 0 });

export const casePeriodOrder: CasePeriodKey[] = [
    'thisWeek',
    'lastWeek',
    'twoWeeksAgo',
    'threeWeeksAgo',
    'fourWeeksAgo',
];

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

/* ---------- date helpers ---------- */

const dayInMs = 24 * 60 * 60 * 1000;

/** Monday 00:00 (local time) of the week containing the given date. */
export const getWeekStart = (now: Date): Date => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekday = (date.getDay() + 6) % 7; // Monday = 0

    return new Date(date.getTime() - weekday * dayInMs);
};

export const getWeekStartsByPeriod = (now: Date): Record<CasePeriodKey, Date> => {
    const currentWeekStart = getWeekStart(now);
    const weekStartMinusWeeks = (weeks: number) => new Date(currentWeekStart.getTime() - weeks * 7 * dayInMs);

    return {
        thisWeek: currentWeekStart,
        lastWeek: weekStartMinusWeeks(1),
        twoWeeksAgo: weekStartMinusWeeks(2),
        threeWeeksAgo: weekStartMinusWeeks(3),
        fourWeeksAgo: weekStartMinusWeeks(4),
    };
};

const toIsoDate = (date: Date) =>
    `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')}`;

export const caseChartDayCodes = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

/** Real date labels per period, e.g. "Do, 9 Jul" (day code is translated at render time). */
export const buildCaseChartDateLabels = (now: Date): Record<CasePeriodKey, string[]> => {
    const weekStarts = getWeekStartsByPeriod(now);
    const monthFormatter = new Intl.DateTimeFormat('de-DE', { month: 'short' });

    return casePeriodOrder.reduce(
        (labels, periodKey) => ({
            ...labels,
            [periodKey]: caseChartDayCodes.map((dayCode, index) => {
                const date = new Date(weekStarts[periodKey].getTime() + index * dayInMs);
                const monthShort = monthFormatter.format(date).replace('.', '');

                return `${dayCode}, ${date.getDate()} ${monthShort}`;
            }),
        }),
        {} as Record<CasePeriodKey, string[]>,
    );
};

/** German two-letter code of today's weekday, used as default-selected chart bar. */
export const getTodayDayCode = (now: Date): string => caseChartDayCodes[(now.getDay() + 6) % 7];

const buildCaseChartValues = (
    dailyNewSessions: AdminDashboardTarget['dailyNewSessions'],
    now: Date,
): Record<CasePeriodKey, number[]> => {
    const weekStarts = getWeekStartsByPeriod(now);
    const countsByDate: Record<string, number> = {};
    dailyNewSessions.forEach(({ date, count }) => {
        countsByDate[date] = (countsByDate[date] || 0) + count;
    });

    return casePeriodOrder.reduce(
        (charts, periodKey) => ({
            ...charts,
            [periodKey]: caseChartDayCodes.map((unusedDayCode, index) => {
                const date = new Date(weekStarts[periodKey].getTime() + index * dayInMs);

                return countsByDate[toIsoDate(date)] || 0;
            }),
        }),
        {} as Record<CasePeriodKey, number[]>,
    );
};

const emptyCaseCharts = (): Record<CasePeriodKey, number[]> =>
    casePeriodOrder.reduce(
        (charts, periodKey) => ({ ...charts, [periodKey]: [0, 0, 0, 0, 0, 0, 0] }),
        {} as Record<CasePeriodKey, number[]>,
    );

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
            // segments: [Nähe (1:1), Live, Gesprächskreise, Interna] — Live and Interna
            // have no application-layer data source yet
            [periodKey]: [sessionCounts?.[periodKey] || 0, 0, chatCounts?.[periodKey] || 0, 0],
        }),
        {} as Record<ConversationPeriodKey, ConversationValues>,
    );

const buildTargetStatistics = (
    target: AdminDashboardTarget,
    agencyRowCount: number,
    topicNamesById: Record<string, string>,
    now: Date,
): FilterTargetStatistics => {
    if (target.suppressed) {
        return {
            suppressed: true,
            enquiriesPreviousMonth: null,
            caseCharts: emptyCaseCharts(),
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
                topTopic: noDataTopic(),
                previousMonth: noDataTopic(),
                twoMonthsAgo: noDataTopic(),
                threeMonthsAgo: noDataTopic(),
            },
        };
    }

    return {
        suppressed: false,
        enquiriesPreviousMonth: target.metrics?.enquiriesPreviousMonth ?? null,
        caseCharts: buildCaseChartValues(target.dailyNewSessions, now),
        conversation: buildConversationValues(target.sessionCountsByPeriod, target.groupChatCountsByPeriod),
        metrics: {
            activeAgencies: target.targetType === 'TENANT' ? agencyRowCount || null : 1,
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
            topTopic: buildTopicStatistic(target, monthKeyWithOffset(now, 0), topicNamesById),
            previousMonth: buildTopicStatistic(target, monthKeyWithOffset(now, 1), topicNamesById),
            twoMonthsAgo: buildTopicStatistic(target, monthKeyWithOffset(now, 2), topicNamesById),
            threeMonthsAgo: buildTopicStatistic(target, monthKeyWithOffset(now, 3), topicNamesById),
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
});

export const buildStatisticData = (
    response: AdminDashboardStatisticsResponse | undefined,
    lookups: StatisticNameLookups,
    now: Date = new Date(),
): StatisticData => {
    if (!response) {
        return emptyStatisticData();
    }

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
        return {
            targetsByScope: { platform: tenantTargets, tenant: tenantTargets, agency: [] },
            fallbackIdsByScope: {
                platform: tenantTargets.map((target) => target.id),
                tenant: tenantTargets.map((target) => target.id),
                agency: [],
            },
            statisticsById,
            suppressionDisabled,
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
    };
};
