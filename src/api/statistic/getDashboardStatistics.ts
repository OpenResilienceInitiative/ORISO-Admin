import { adminStatisticsDashboardEndpoint } from '../../appConfig';

import { FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';

export interface AdminDashboardPeriodCounts {
    today: number;
    yesterday: number;
    thisWeek: number;
    total: number;
    thisYear: number;
    lastYear: number;
}

export interface AdminDashboardMetrics {
    enquiriesCurrentMonth: number;
    enquiriesPreviousMonth: number;
    activeCases: number;
    activeConversationsToday: number;
    groupChatsTotal: number;
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
    targetType: 'TENANT' | 'AGENCY';
    tenantId: number | null;
    agencyId: number | null;
    counselorCount: number;
    /**
     * KDG small-cell suppression: true when the target covers fewer than two counsellor
     * accounts. All counselling metrics are omitted by the backend in that case.
     */
    suppressed: boolean;
    metrics: AdminDashboardMetrics | null;
    dailyNewSessions: AdminDashboardDailyCount[];
    monthlyTopTopics: AdminDashboardMonthlyTopic[];
    sessionCountsByPeriod: AdminDashboardPeriodCounts | null;
    groupChatCountsByPeriod: AdminDashboardPeriodCounts | null;
}

export interface AdminDashboardStatisticsResponse {
    generatedAt: string;
    scope: 'PLATFORM' | 'TENANT' | 'AGENCY';
    /**
     * True only when the backend skipped KDG small-cell suppression — possible in
     * non-production environments only (fail-closed on the prod profile).
     */
    suppressionDisabled?: boolean;
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
