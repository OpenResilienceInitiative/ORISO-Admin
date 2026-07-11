import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import getAgencyData from '../../api/agency/getAgencyData';
import getDashboardStatistics from '../../api/statistic/getDashboardStatistics';
import { searchTenantData } from '../../api/tenant/searchTenantData';
import getTopicData from '../../api/topic/getTopicData';
import { buildStatisticData, emptyStatisticData, StatisticData } from './statisticDashboardData';

const NAME_LOOKUP_PAGE_SIZE = 500;

interface StatisticDashboardDataResult {
    data: StatisticData;
    isLoading: boolean;
    isError: boolean;
}

/**
 * Loads the real statistics for the admin dashboard and resolves display names for
 * tenants, agencies and topics via the existing admin APIs. Name lookups are best
 * effort — when a lookup fails, ids are shown as fallback labels instead.
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
        queryFn: () => getAgencyData({ current: 1, pageSize: NAME_LOOKUP_PAGE_SIZE }),
        enabled: hasAgencyTargets,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const tenantsQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_TENANT_NAMES'],
        queryFn: () => searchTenantData({ page: 1, perPage: NAME_LOOKUP_PAGE_SIZE }),
        enabled: isPlatformScope,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const topicsQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_TOPIC_NAMES'],
        queryFn: () => getTopicData({ current: 1, pageSize: NAME_LOOKUP_PAGE_SIZE }),
        enabled: Boolean(dashboardQuery.data),
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

    const data = useMemo(() => {
        if (!dashboardQuery.data) {
            return emptyStatisticData();
        }

        const agencyNamesById: Record<string, string> = {};
        (agenciesQuery.data?.data || []).forEach((agency) => {
            if (agency.id !== null && agency.id !== undefined) {
                agencyNamesById[`${agency.id}`] = agency.name;
            }
        });

        const tenantNamesById: Record<string, string> = {};
        (tenantsQuery.data?.data || []).forEach((tenant: { id?: number | string | null; name?: string }) => {
            if (tenant.id !== null && tenant.id !== undefined && tenant.name) {
                tenantNamesById[`${tenant.id}`] = tenant.name;
            }
        });

        const topicNamesById: Record<string, string> = {};
        (topicsQuery.data?.data || []).forEach((topic) => {
            if (topic.id !== null && topic.id !== undefined && topic.name) {
                topicNamesById[`${topic.id}`] = topic.name;
            }
        });

        return buildStatisticData(dashboardQuery.data, { agencyNamesById, tenantNamesById, topicNamesById });
    }, [dashboardQuery.data, agenciesQuery.data, tenantsQuery.data, topicsQuery.data]);

    return {
        data,
        isLoading: dashboardQuery.isLoading,
        isError: dashboardQuery.isError,
    };
};
