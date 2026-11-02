import { adminStatisticsDashboardEndpoint } from '../../appConfig';

import { FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';

export interface AdminDashboardPeriodCounts {
    /** Null in a fixed stand: the running day is never part of it. */
    today: number | null;
    /** The newest full day of a stand; null in a weekly stand, which has no single days. */
    yesterday: number | null;
    thisWeek: number;
    total: number;
    thisYear: number;
    lastYear: number;
}

export interface AdminDashboardMetrics {
    enquiriesCurrentMonth: number;
    enquiriesPreviousMonth: number;
    activeCases: number;
    /** Null in a fixed stand. */
    activeConversationsToday: number | null;
    groupChatsTotal: number;
}

export interface AdminDashboardWeeklyCount {
    weekStart: string;
    count: number;
}

export interface AdminDashboardDailyCount {
    date: string;
    count: number;
}

export interface AdminDashboardMonthlyTopic {
    month: string;
    topicId: number | null;
    sessionCount: number;
    sharePercent: number;
}

export interface AdminDashboardTarget {
    /** PLATFORM: the whole platform as one row, sent to platform admins only. */
    targetType: 'PLATFORM' | 'TENANT' | 'AGENCY';
    tenantId: number | null;
    agencyId: number | null;
    counselorCount: number;
    /**
     * KDG small-cell suppression: true when the target covers fewer counsellor accounts than the
     * minimum set for its level in the global statistics settings. All counselling metrics are
     * omitted by the backend in that case.
     */
    suppressed: boolean;
    metrics: AdminDashboardMetrics | null;
    dailyNewSessions: AdminDashboardDailyCount[];
    /** Filled instead of `dailyNewSessions` in a weekly stand. */
    weeklyNewSessions?: AdminDashboardWeeklyCount[];
    monthlyTopTopics: AdminDashboardMonthlyTopic[];
    sessionCountsByPeriod: AdminDashboardPeriodCounts | null;
    groupChatCountsByPeriod: AdminDashboardPeriodCounts | null;
}

export type StatisticSnapshotInterval = 'LIVE' | 'DAILY' | 'WEEKLY';

export interface AdminDashboardStatisticsResponse {
    generatedAt: string;
    scope: 'PLATFORM' | 'TENANT' | 'AGENCY';
    /**
     * How often this role gets a new stand (global statistics setting). A fixed stand keeps its
     * numbers and its `generatedAt` until the next cutoff, whatever the client asks for.
     */
    snapshotInterval?: StatisticSnapshotInterval;
    /** The newest full German day of a fixed stand (ISO date). Null or missing when live. */
    dataUntil?: string | null;
    /**
     * True only when the backend skipped KDG small-cell suppression — possible in
     * non-production environments only (fail-closed on the prod profile).
     */
    suppressionDisabled?: boolean;
    /**
     * Weeks covered by `dailyNewSessions`, the current week included (global statistics setting,
     * UserService#1544). Missing from older backends, which always sent five.
     */
    chartWeeks?: number;
    /** Months covered by `monthlyTopTopics`, the current month included. Older backends: four. */
    topicMonths?: number;
    targets: AdminDashboardTarget[];
}

/**
 * Retrieves real counselling statistics for the admin dashboard, scoped to the caller
 * (platform admin, tenant admin or agency admin). Served by the UserService from the
 * application-layer database only.
 */
const getDashboardStatistics = (): Promise<AdminDashboardStatisticsResponse> => {
    return fetchData({
        url: adminStatisticsDashboardEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_SUCCESS.CONTENT],
    });
};

export default getDashboardStatistics;
