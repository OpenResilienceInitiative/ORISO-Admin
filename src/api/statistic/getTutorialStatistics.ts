import { tutorialStatisticsEndpoint } from '../../appConfig';

import { FETCH_ERRORS, FETCH_METHODS, fetchData, FETCH_SUCCESS } from '../fetchData';

export interface TutorialStatisticsCount {
    surface: string;
    tourId: string;
    tourVersion: number;
    status: 'not_started' | 'in_progress' | 'completed' | 'skipped';
    total: number;
}

export interface TutorialStatisticsTenant {
    tenantId: number | null;
    counts: TutorialStatisticsCount[];
}

export interface TutorialStatisticsResponse {
    generatedAt: string;
    scope: 'PLATFORM' | 'TENANT';
    tenants: TutorialStatisticsTenant[];
}

/**
 * Retrieves aggregate tutorial-completion counts (epic TOUR-06/07), scoped by the
 * backend to the caller: platform admins receive global counts grouped per tenant,
 * tenant admins only their own tenant. The response never contains per-user records.
 * A 403 rejects locally with {@link FETCH_ERRORS.FORBIDDEN} so the dashboard can show
 * an in-place "no access" state instead of redirecting the whole page.
 */
const getTutorialStatistics = (): Promise<TutorialStatisticsResponse> => {
    return fetchData({
        url: tutorialStatisticsEndpoint,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_SUCCESS.CONTENT, FETCH_ERRORS.FORBIDDEN],
    });
};

export default getTutorialStatistics;
