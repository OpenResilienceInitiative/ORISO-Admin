import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import {
    getAgencyContactCandidates,
    getAgencyContactPerson,
    getTenantContactCandidates,
    getTenantContactPerson,
    postAgencyContactCoverage,
    putAgencyContactPerson,
    putTenantContactPerson,
} from '../api/contactPerson/contactPersonApi';
import type { AgencyContactPersonAdmin, ContactPersonUpdate, TenantContactPersonUpdate } from '../types/contactPerson';

/**
 * Query and save hooks for the contact person of a Beratungsstelle and the
 * Träger default (ORISO-Admin#1534). `tenantId` goes on the URL only for
 * platform admins; the service ignores it for everybody else.
 */

const STALE = 30_000;
const validId = (id?: number | null): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0;

export const contactPersonKeys = {
    agency: (agencyId?: number | null) => ['CONTACT_PERSON', 'AGENCY', agencyId ?? null] as const,
    agencyCandidates: (agencyId?: number | null) => ['CONTACT_PERSON', 'AGENCY_CANDIDATES', agencyId ?? null] as const,
    tenant: (tenantId?: number | null) => ['CONTACT_PERSON', 'TENANT', tenantId ?? null] as const,
    tenantCandidates: (tenantId?: number | null) => ['CONTACT_PERSON', 'TENANT_CANDIDATES', tenantId ?? null] as const,
    coverage: (agencyIds: number[]) => ['CONTACT_PERSON', 'COVERAGE', [...agencyIds].sort((a, b) => a - b)] as const,
};

export const useAgencyContactPerson = (agencyId?: number | null, tenantId?: number | null, enabled = true) =>
    useQuery({
        queryKey: contactPersonKeys.agency(agencyId),
        queryFn: () => getAgencyContactPerson(agencyId as number, tenantId),
        enabled: enabled && validId(agencyId),
        staleTime: STALE,
    });

export const useAgencyContactCandidates = (agencyId?: number | null, tenantId?: number | null, enabled = true) =>
    useQuery({
        queryKey: contactPersonKeys.agencyCandidates(agencyId),
        queryFn: () => getAgencyContactCandidates(agencyId as number, tenantId),
        enabled: enabled && validId(agencyId),
        staleTime: STALE,
    });

export const useSaveAgencyContactPerson = (agencyId?: number | null, tenantId?: number | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (update: ContactPersonUpdate) => putAgencyContactPerson(agencyId as number, update, tenantId),
        onSuccess: (saved) => {
            if (saved) queryClient.setQueryData(contactPersonKeys.agency(agencyId), saved);
            queryClient.invalidateQueries({ queryKey: ['CONTACT_PERSON', 'COVERAGE'] });
        },
    });
};

export const useTenantContactPerson = (tenantId?: number | null, enabled = true) =>
    useQuery({
        queryKey: contactPersonKeys.tenant(tenantId),
        queryFn: () => getTenantContactPerson(tenantId as number),
        enabled: enabled && validId(tenantId),
        staleTime: STALE,
    });

export const useTenantContactCandidates = (tenantId?: number | null, enabled = true) =>
    useQuery({
        queryKey: contactPersonKeys.tenantCandidates(tenantId),
        queryFn: () => getTenantContactCandidates(tenantId as number),
        enabled: enabled && validId(tenantId),
        staleTime: STALE,
    });

export const useSaveTenantContactPerson = (tenantId?: number | null) => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (update: TenantContactPersonUpdate) => putTenantContactPerson(tenantId as number, update),
        onSuccess: (saved) => {
            if (saved) queryClient.setQueryData(contactPersonKeys.tenant(tenantId), saved);
            // A changed Träger default changes what every centre without its own contact shows.
            queryClient.invalidateQueries({ queryKey: ['CONTACT_PERSON', 'AGENCY'] });
            queryClient.invalidateQueries({ queryKey: ['CONTACT_PERSON', 'COVERAGE'] });
        },
    });
};

/** Coverage of the given centres; an empty list makes no call. */
export const useAgencyContactCoverage = (
    agencyIds: number[],
    tenantIdsByAgency?: Record<number, number>,
    enabled = true,
) =>
    useQuery({
        queryKey: contactPersonKeys.coverage(agencyIds),
        queryFn: () => postAgencyContactCoverage(agencyIds, tenantIdsByAgency),
        enabled: enabled && agencyIds.length > 0,
        staleTime: STALE,
    });

/**
 * The stored pair of each given centre, for the section "Ansprechperson für"
 * of an admin. A centre that fails to load is missing from `pairs`.
 */
export const useAgencyContactPairs = (
    agencies: Array<{ id: number }>,
    { enabled = true }: { enabled?: boolean } = {},
) => {
    const results = useQueries({
        queries: agencies.map(({ id }) => ({
            queryKey: contactPersonKeys.agency(id),
            // No tenant hint: the service resolves the centre's Träger itself.
            queryFn: () => getAgencyContactPerson(id),
            enabled: enabled && validId(id),
            staleTime: STALE,
        })),
    });
    const pairs: Record<number, AgencyContactPersonAdmin | undefined> = {};
    results.forEach((result, index) => {
        if (result.data) pairs[agencies[index].id] = result.data;
    });
    return { pairs, isLoading: results.some((result) => result.isLoading) };
};
