import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../../api/fetchData';
import getDashboardStatistics from '../../api/statistic/getDashboardStatistics';
import { agencyEndpointBase, tenantAdminEndpoint, topicAdminEndpoint } from '../../appConfig';
import removeEmbedded from '../../utils/removeEmbedded';
import {
    buildStatisticData,
    emptyStatisticData,
    StatisticData,
    type StatisticAgencyEntry,
    withAgencyDrill,
} from './statisticDashboardData';

export type { StatisticAgencyEntry };

const NAME_LOOKUP_PAGE_SIZE = 500;

interface StatisticDashboardDataResult {
    data: StatisticData;
    isLoading: boolean;
    isError: boolean;
    /**
     * The backend answered 503 (its settings cannot be read, UserService#1568). Kept apart from
     * `isError`, and `data` is empty then: figures from an earlier load must not stay on screen.
     */
    isUnavailable: boolean;
    /**
     * A platform admin's look into one Träger (`drillTenantId`): `loading` while its dashboard comes,
     * `unsupported` when the backend answered without that Träger's Beratungsstellen (an older
     * UserService ignores `?tenantId=`), `failed` on an error, `idle` when nothing was asked.
     */
    drill: 'idle' | 'loading' | 'ready' | 'unsupported' | 'failed';
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

/** Every Beratungsstelle with its Träger (best effort, like the name lookups): what a platform admin can pick. */
const fetchAgencyDirectory = async (): Promise<StatisticAgencyEntry[]> => {
    try {
        const result = await fetchData({
            url: `${agencyEndpointBase}/?q=${encodeURIComponent('*')}&${listQuery}`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
        });
        const rows: Array<{ id?: number | null; name?: string; tenantId?: number | null }> = Array.isArray(result)
            ? result
            : removeEmbedded(result || {})?.data || [];

        return rows
            .filter((row) => row && row.id != null && row.tenantId != null && row.name)
            .map((row) => ({ id: Number(row.id), name: String(row.name), tenantId: Number(row.tenantId) }));
    } catch {
        return [];
    }
};

/** The Beratungsstellen a platform admin can look into. Off for every other role (their dashboard has them). */
export const useStatisticAgencyDirectory = (enabled: boolean) =>
    useQuery({
        queryKey: ['ADMIN_STATISTICS_AGENCY_DIRECTORY'],
        queryFn: fetchAgencyDirectory,
        enabled,
        staleTime: 5 * 60 * 1000,
        retry: false,
    });

const fetchTopicNames = () => fetchNameLookup(`${topicAdminEndpoint}/?${listQuery}`);

/**
 * Loads the real statistics for the admin dashboard and resolves display names for
 * tenants, agencies and topics. Name lookups are non-fatal — when a lookup fails,
 * ids are shown as fallback labels instead. Only a failure of the dashboard endpoint
 * itself surfaces as an error state.
 */
export const useStatisticDashboardData = ({
    drillTenantId,
}: { drillTenantId?: number } = {}): StatisticDashboardDataResult => {
    const dashboardQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_DASHBOARD'],
        queryFn: () => getDashboardStatistics(),
        staleTime: 60 * 1000,
    });

    const isPlatformScope = dashboardQuery.data?.scope === 'PLATFORM';
    const drillQuery = useQuery({
        queryKey: ['ADMIN_STATISTICS_DASHBOARD', drillTenantId],
        queryFn: () => getDashboardStatistics(drillTenantId),
        enabled: isPlatformScope && drillTenantId != null,
        staleTime: 60 * 1000,
        retry: false,
    });
    const drillAnswered = drillQuery.data?.scope === 'TENANT';

    const hasAgencyTargets = Boolean(
        dashboardQuery.data?.targets.some((target) => target.targetType === 'AGENCY') ||
            drillQuery.data?.targets.some((target) => target.targetType === 'AGENCY'),
    );

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

    const isUnavailable =
        dashboardQuery.isError &&
        dashboardQuery.error instanceof Error &&
        dashboardQuery.error.message === FETCH_ERRORS.SERVICE_UNAVAILABLE;

    const data = useMemo(() => {
        // a failed refresh keeps the last data in the query; after a 503 it is not shown
        if (!dashboardQuery.data || isUnavailable) {
            return emptyStatisticData();
        }

        const lookups = {
            agencyNamesById: agenciesQuery.data || {},
            tenantNamesById: tenantsQuery.data || {},
            topicNamesById: topicsQuery.data || {},
        };
        const platform = buildStatisticData(dashboardQuery.data, lookups);

        return drillAnswered && drillQuery.data
            ? withAgencyDrill(platform, buildStatisticData(drillQuery.data, lookups))
            : platform;
    }, [
        dashboardQuery.data,
        drillAnswered,
        drillQuery.data,
        isUnavailable,
        agenciesQuery.data,
        tenantsQuery.data,
        topicsQuery.data,
    ]);

    let drill: StatisticDashboardDataResult['drill'] = 'idle';
    if (isPlatformScope && drillTenantId != null) {
        if (drillQuery.isError) drill = 'failed';
        else if (drillQuery.isLoading) drill = 'loading';
        else drill = drillAnswered ? 'ready' : 'unsupported';
    }

    return {
        data,
        isLoading: dashboardQuery.isLoading,
        isError: dashboardQuery.isError && !isUnavailable,
        isUnavailable,
        drill,
    };
};
