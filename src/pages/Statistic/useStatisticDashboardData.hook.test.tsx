import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vite-plus/test';
import {
    agencyEndpointBase,
    statisticsAgencyNamesEndpoint,
    statisticsTenantNamesEndpoint,
    tenantAdminEndpoint,
    topicAdminEndpoint,
    topicEndpoint,
} from '../../appConfig';

const fetchData = vi.hoisted(() => vi.fn());
const getDashboardStatistics = vi.hoisted(() => vi.fn());

vi.mock('../../api/fetchData', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/fetchData')>()),
    fetchData,
}));
vi.mock('../../api/statistic/getDashboardStatistics', async (importOriginal) => ({
    ...(await importOriginal<typeof import('../../api/statistic/getDashboardStatistics')>()),
    default: getDashboardStatistics,
}));

// eslint-disable-next-line import/first
import { useStatisticAgencyDirectory, useStatisticDashboardData } from './useStatisticDashboardData.hook';

const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        {children}
    </QueryClientProvider>
);

const counts = { today: 0, yesterday: 0, thisWeek: 0, total: 1, thisYear: 1, lastYear: 0 };
const target = (targetType: 'PLATFORM' | 'TENANT', tenantId: number | null) => ({
    targetType,
    tenantId,
    agencyId: null,
    counselorCount: 1,
    suppressed: false,
    metrics: {},
    dailyNewSessions: [],
    monthlyTopTopics: [],
    sessionCountsByPeriod: counts,
    groupChatCountsByPeriod: counts,
});

const urls = () => fetchData.mock.calls.map(([options]) => options.url as string);

describe('statistics name lookups for a Statistik-Leser·in (ORISO-UserService#1666)', () => {
    beforeEach(() => {
        fetchData.mockReset();
        getDashboardStatistics.mockReset();
        getDashboardStatistics.mockResolvedValue({
            generatedAt: '2026-11-17T10:00:00Z',
            scope: 'PLATFORM',
            targets: [target('PLATFORM', null), target('TENANT', 1)],
        });
        fetchData.mockImplementation(({ url }: { url: string }) => {
            if (url === statisticsTenantNamesEndpoint) return Promise.resolve([{ id: 1, name: 'Caritas Köln' }]);
            if (url === statisticsAgencyNamesEndpoint)
                return Promise.resolve([{ id: 5, name: 'Beratungsstelle Nord', tenantId: 1 }]);
            return Promise.resolve([]);
        });
    });

    it('reads Träger, Beratungsstellen and topics from the names-only endpoints', async () => {
        const { result } = renderHook(() => useStatisticDashboardData({ isStatisticsReader: true }), { wrapper });

        await waitFor(() => expect(urls()).toContain(statisticsTenantNamesEndpoint));
        await waitFor(() => expect(urls()).toContain(statisticsAgencyNamesEndpoint));
        await waitFor(() => expect(urls()).toContain(`${topicEndpoint}public`));
        await waitFor(() =>
            expect(result.current.data.targetsByScope.tenant.map((entry) => entry.label)).toContain('Caritas Köln'),
        );
        expect(urls().some((url) => url.startsWith(tenantAdminEndpoint))).toBe(false);
        expect(urls().some((url) => url.startsWith(agencyEndpointBase))).toBe(false);
        expect(urls().some((url) => url.startsWith(topicAdminEndpoint))).toBe(false);
    });

    it('builds the Beratungsstellen directory from the names list in one request', async () => {
        const { result } = renderHook(() => useStatisticAgencyDirectory(true, true), { wrapper });

        await waitFor(() =>
            expect(result.current.data).toEqual([{ id: 5, name: 'Beratungsstelle Nord', tenantId: 1 }]),
        );
        expect(urls()).toEqual([statisticsAgencyNamesEndpoint]);
    });

    it('keeps the admin lookups for a platform admin', async () => {
        renderHook(() => useStatisticDashboardData(), { wrapper });

        await waitFor(() => expect(urls().some((url) => url.startsWith(`${tenantAdminEndpoint}/search`))).toBe(true));
        await waitFor(() => expect(urls().some((url) => url.startsWith(agencyEndpointBase))).toBe(true));
        await waitFor(() => expect(urls().some((url) => url.startsWith(topicAdminEndpoint))).toBe(true));
        expect(urls()).not.toContain(statisticsTenantNamesEndpoint);
        expect(urls()).not.toContain(statisticsAgencyNamesEndpoint);
    });
});
