import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FETCH_METHODS, fetchData } from '../../api/fetchData';
import getDashboardStatistics from '../../api/statistic/getDashboardStatistics';
import { agencyEndpointBase, tenantAdminEndpoint, topicAdminEndpoint } from '../../appConfig';
import removeEmbedded from '../../utils/removeEmbedded';
import { buildStatisticData, emptyStatisticData, StatisticData } from './statisticDashboardData';

const NAME_LOOKUP_PAGE_SIZE = 500;

interface StatisticDashboardDataResult {
    data: StatisticData;
    isLoading: boolean;
    isError: boolean;
}

/**
 * Name lookups are best effort and must NEVER break the dashboard. The shared api
 * modules (getAgencyData, searchTenantData, getTopicData) call fetchData with a
 * `responseHandling` option, which hard-redirects to /admin/access-denied on 403 —
 * that killed the whole statistics page when e.g. the topicadmin endpoint denied
 * access even though the dashboard data itself had loaded fine.
 *
 * We therefore call fetchData WITHOUT `responseHandling` here: a 403 (or any other
 * failure) rejects locally, is swallowed, and the dashboard falls back to showing
 * raw ids instead of display names.
 */
const fetchNameLookup = async (url: string): Promise<Record<string, string>> => {
    try {
        const result = await fetchData({
            url,
            method: FETCH_METHODS.GET,
            skipAuth: false,
        });
        const rows: Array<{ id?: number | string | null; name?: string }> = Array.isArray(result)
            ? result
            : removeEmbedded(result || {})?.data || [];

        const namesById: Record<string, string> = {};
        rows.forEach((row) => {
            if (row && row.id !== null && row.id !== undefined && row.name) {
                namesById[`${row.id}`] = row.name;
            }
        });

        return namesById;
    } catch {
        return {};
    }
};

const listQuery = `page=1&perPage=${NAME_LOOKUP_PAGE_SIZE}&order=ASC&field=NAME`;

const fetchAgencyNames = () => fetchNameLookup(`${agencyEndpointBase}/?q=${encodeURIComponent('*')}&${listQuery}`);

const fetchTenantNames = () =>
    fetchNameLookup(
        `${tenantAdminEndpoint}/search?page=1&perPage=${NAME_LOOKUP_PAGE_SIZE}&query=&field=NAME&order=ASC`,
    );

const fetchTopicNames = () => fetchNameLookup(`${topicAdminEndpoint}/?${listQuery}`);

/**
 * Loads the real statistics for the admin dashboard and resolves display names for
 * tenants, agencies and topics. Name lookups are non-fatal — when a lookup fails,
 * ids are shown as fallback labels instead. Only a failure of the dashboard endpoint
 * itself surfaces as an error state.
 */
export const useStatisticDashboardData = (): StatisticDashboardDataResult => {
    const dashboardQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_DASHBOARD'],
        queryFn: () => getDashboardStatistics(),
        staleTime: 60 * 1000,
    });

    const hasAgencyTargets = Boolean(dashboardQuery.data?.targets.some((target) => target.targetType === 'AGENCY'));
    const isPlatformScope = dashboardQuery.data?.scope === 'PLATFORM';

    const agenciesQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_AGENCY_NAMES'],
        queryFn: fetchAgencyNames,
        enabled: hasAgencyTargets,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const tenantsQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_TENANT_NAMES'],
        queryFn: fetchTenantNames,
        enabled: isPlatformScope,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const topicsQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_TOPIC_NAMES'],
        queryFn: fetchTopicNames,
        enabled: Boolean(dashboardQuery.data),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const data = useMemo(() => {
        if (!dashboardQuery.data) {
            return emptyStatisticData();
        }

        return buildStatisticData(dashboardQuery.data, {
            agencyNamesById: agenciesQuery.data || {},
            tenantNamesById: tenantsQuery.data || {},
            topicNamesById: topicsQuery.data || {},
        });
    }, [dashboardQuery.data, agenciesQuery.data, tenantsQuery.data, topicsQuery.data]);

    return {
        data,
        isLoading: dashboardQuery.isLoading,
        isError: dashboardQuery.isError,
    };
};
