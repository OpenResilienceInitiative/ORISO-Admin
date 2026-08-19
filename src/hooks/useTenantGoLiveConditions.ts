import { useQuery } from '@tanstack/react-query';
import getAgencyData from '../api/agency/getAgencyData';
import { useDpaGate } from './useDpaGate.hook';
import { AgencyData } from '../types/agency';

export interface TenantGoLiveConditions {
    contractSigned: boolean;
    hasAgency: boolean;
    hasLiveAgency: boolean;
    allMet: boolean;
    isLoading: boolean;
}

const belongsToTenant = (agency: AgencyData, tenantId: number) =>
    // Tenant-scoped admins get a pre-filtered list (no tenantId comparison
    // possible when the row omits it); super admins see every tenant's rows.
    agency.tenantId === undefined || Number(agency.tenantId) === tenantId;

/**
 * The Träger go-live chain (concept 2026-08-19): contract documents signed
 * (showstopper) → at least one Beratungsstelle created → at least one of them
 * live. There is no Träger switch — the last step happens on the agency.
 */
export const useTenantGoLiveConditions = (tenantId: number, enabled = true) => {
    const { data: dpaGate, isLoading: isDpaLoading } = useDpaGate(tenantId, enabled && tenantId > 0);

    const { data: agenciesResult, isLoading: isAgenciesLoading } = useQuery({
        queryKey: ['TENANT_GO_LIVE_AGENCIES', tenantId],
        queryFn: () => getAgencyData({ current: 1, pageSize: 1000 } as any),
        enabled: enabled && tenantId > 0,
        staleTime: 30_000,
    });

    const tenantAgencies = (agenciesResult?.data ?? []).filter((agency) => belongsToTenant(agency, tenantId));
    const contractSigned = dpaGate?.dpaSigned === true;
    const hasAgency = tenantAgencies.length > 0;
    const hasLiveAgency = tenantAgencies.some((agency) => !agency.offline);

    return {
        contractSigned,
        hasAgency,
        hasLiveAgency,
        allMet: contractSigned && hasAgency && hasLiveAgency,
        isLoading: isDpaLoading || isAgenciesLoading,
    } as TenantGoLiveConditions;
};
