import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import i18next from 'i18next';
import {
    getAgencyContactCandidates,
    getAgencyContactPerson,
    getTenantContactCandidates,
    getTenantContactPerson,
    postAgencyContactCoverage,
    putAgencyContactPerson,
    putTenantContactPerson,
} from '../api/contactPerson/contactPersonApi';
import { FETCH_ERRORS } from '../api/fetchData';
import { snackbar } from '../components/Snackbar';
import type { AgencyContactPersonAdmin, ContactPersonUpdate, TenantContactPersonUpdate } from '../types/contactPerson';

/**
 * Query and save hooks for the contact person of a Beratungsstelle and the
 * Träger default (ORISO-Admin#1534). `tenantId` goes on the URL only for
 * platform admins; the service ignores it for everybody else.
 */

const STALE = 30_000;
const validId = (id?: number | null): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0;

/** fetchData already shows a toast for CATCH_ALL; transport failures and 400s stay silent otherwise. */
export const reportContactSaveError = (error: unknown) => {
    if (error instanceof Error && error.message === FETCH_ERRORS.CATCH_ALL) return;
    snackbar.error({ content: i18next.t('contactPerson.saveFailed') as string });
};

/** A 204 or an unparsed body is not a stored pair; never put it into the cache. */
const isStored = (saved: unknown): saved is object =>
    typeof saved === 'object' && saved !== null && !(typeof Response !== 'undefined' && saved instanceof Response);

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
        // Returning the refetch keeps the mutation pending until the stored pair is back, so the
        // tile stays locked until its key (and with it the form) has settled.
        onSuccess: async (saved) => {
            queryClient.invalidateQueries({ queryKey: ['CONTACT_PERSON', 'COVERAGE'] });
            if (isStored(saved)) queryClient.setQueryData(contactPersonKeys.agency(agencyId), saved);
            else await queryClient.invalidateQueries({ queryKey: contactPersonKeys.agency(agencyId) });
        },
        onError: reportContactSaveError,
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
        // As above: a body-less answer keeps the tile locked until the refetch is back.
        onSuccess: async (saved) => {
            // A changed Träger default changes what every centre without its own contact shows.
            queryClient.invalidateQueries({ queryKey: ['CONTACT_PERSON', 'AGENCY'] });
            queryClient.invalidateQueries({ queryKey: ['CONTACT_PERSON', 'COVERAGE'] });
            if (isStored(saved)) queryClient.setQueryData(contactPersonKeys.tenant(tenantId), saved);
            else await queryClient.invalidateQueries({ queryKey: contactPersonKeys.tenant(tenantId) });
        },
        onError: reportContactSaveError,
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
 * of an admin. A centre that fails to load is missing from `pairs` and listed
 * in `failedIds`; `retryFailed` loads those again.
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
    const failedIds: number[] = [];
    results.forEach((result, index) => {
        if (result.data) pairs[agencies[index].id] = result.data;
        else if (result.isError) failedIds.push(agencies[index].id);
    });
    const retryFailed = () =>
        results.forEach((result) => {
            if (result.isError) result.refetch();
        });
    return { pairs, failedIds, retryFailed, isLoading: results.some((result) => result.isLoading) };
};
