import { useQuery } from '@tanstack/react-query';
import {
    accountInvitesEndpoint,
    agencyEndpointBase,
    tenantAdminEndpoint,
    usersConsultantsSearchEndpoint,
} from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../../api/fetchData';
import type { AccountInviteListTab, PagedAccountInviteResponse } from '../../api/accountInvites/accountInvites';
import { USER_TABLE_API_SAFE_SORT } from '../../constants/userTableSort';
import getPublicTenantData from '../../api/tenant/getPublicTenantData';
import getTenantData from '../../api/tenant/getTenantData';
import { getSingleTenantData } from '../../api/tenant/getSingleTenantData';
import { useAppConfigContext } from '../../context/useAppConfig';
import { useDpaStatus } from '../../hooks/useDpaStatus.hook';
import removeEmbedded from '../../utils/removeEmbedded';
import { mapTenantDataToTenantAdminData } from '../../utils/mapTenantDataToTenantAdminData';
import type { DpaStatusFact, HomeFacts, HomeRole, OwnTenantFacts } from './homeModel';

/**
 * The counts Home shows (ORISO-Admin#1323). One request per fact, page size 1,
 * silent on failure: a count Home cannot load shows as unknown instead of
 * raising a toast on the start page.
 */
const getTotal = async (url: string): Promise<number | undefined> => {
    const result = await fetchData({
        url,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });

    return typeof result?.total === 'number' ? result.total : undefined;
};

const getInvitePhases = async (tab: AccountInviteListTab) => {
    const result: PagedAccountInviteResponse = await fetchData({
        url: `${accountInvitesEndpoint}?page=0&size=1&tab=${tab}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    });

    return result?.phaseCounts;
};

const OPEN_PHASES = ['PREPARED', 'INVITED', 'ACCOUNT_CREATED'] as const;

/** Cache key of one Home fact. Scoped by tenant, so a later sign-in never reads another tenant's facts. */
export const homeFactKey = (tenantId: number | null, key: string) => ['HOME_FACT', tenantId ?? 'none', key];

/**
 * A fact that could not be read is cached as `null`: React Query rejects `undefined`
 * as query data (and logs an error for it). Home itself reads both as "unknown".
 */
const useFact = <T>(
    tenantId: number | null,
    key: string,
    enabled: boolean,
    load: () => Promise<T | undefined>,
    { staleTime = 60_000 }: { staleTime?: number } = {},
) =>
    useQuery({
        queryKey: homeFactKey(tenantId, key),
        queryFn: async () => (await load()) ?? null,
        enabled,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime,
    }).data ?? undefined;

const hasText = (value: unknown): boolean => {
    if (typeof value === 'string') return value.trim() !== '';
    if (value && typeof value === 'object') return Object.values(value).some(hasText);
    return false;
};

/** The few things Home needs from a tenant record; tolerant of missing blocks. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- public and admin tenant payloads differ
export const summariseOwnTenant = (tenant: any): OwnTenantFacts | undefined => {
    if (!tenant || (tenant.id == null && !tenant.name)) return undefined;
    const smtp = tenant.settings?.smtp;

    const masterDataComplete = hasText(tenant.name) && hasText(tenant.content?.claim);

    return {
        appearanceComplete: masterDataComplete && hasText(tenant.theming?.logo),
        masterDataComplete,
        smtpMode: tenant.settings?.smtpMode ?? null,
        smtpComplete: smtp ? hasText(smtp.host) && hasText(smtp.from) && smtp.passwordSet === true : undefined,
    };
};

/**
 * A Beratungsstelle counts as complete with a postcode and — when the list
 * carries topics at all — at least one topic.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- list payload, only two fields read
export const isAgencyComplete = (agency: any): boolean =>
    hasText(agency?.postcode) && (!Array.isArray(agency?.topics) || agency.topics.length > 0);

/**
 * Complete only when every centre was inspected: with more centres than one
 * page holds, or no total to compare with, the state stays unknown instead of
 * claiming "done" or "open".
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- list payload, only two fields read
export const agencyPageComplete = (agencies: any[], total?: number): boolean | null => {
    // Without a numeric total the page cannot prove it holds every centre.
    if (typeof total !== 'number' || total > agencies.length) return null;
    return agencies.length > 0 && agencies.every(isAgencyComplete);
};

export interface HomeFactAccess {
    role: HomeRole;
    /** From the token: 0 for the platform admin, null for an unreadable or missing claim. */
    tenantId?: number | null;
    canReadTenants: boolean;
    canReadAgencies: boolean;
    canReadConsultants: boolean;
    canInviteTenants: boolean;
    canInviteCounsellors: boolean;
}

export const useHomeFacts = (access: HomeFactAccess): HomeFacts => {
    const { settings } = useAppConfigContext();
    const tenantId = access.tenantId ?? null;
    const ownTenant = useFact(
        tenantId,
        'own-tenant',
        access.role === 'platform' || access.role === 'tenant',
        async () => {
            // The admin endpoint carries the SMTP block; fall back to the public
            // tenant (always reachable) for name, claim and logo.
            const adminRecord =
                access.role === 'tenant' && tenantId != null
                    ? await getSingleTenantData(tenantId, { silent: true }).catch(() => undefined)
                    : undefined;
            const summary = summariseOwnTenant(adminRecord);
            if (summary) return summary;
            const publicTenant = await getPublicTenantData(settings).catch(() => undefined);
            const record = publicTenant
                ? await getTenantData(publicTenant, settings.multitenancyWithSingleDomainEnabled).catch(() => undefined)
                : undefined;
            // Same normalisation as the settings editor (claim may come top-level).
            return (record ? summariseOwnTenant(mapTenantDataToTenantAdminData(record)) : undefined) ?? null;
        },
        // Re-read on every visit: settings are edited on other pages, and the
        // checklist must show a save as soon as the admin comes back.
        { staleTime: 0 },
    );
    // Observe the DPA gate's own query (no second cache): a signature the gate
    // sees — e.g. by the forwarded signatory — updates the checklist too.
    const { data: dpaInfo } = useDpaStatus(tenantId ?? 0, access.role === 'tenant' && tenantId != null, {
        dropCacheOnMount: false,
    });
    const dpaStatus = dpaInfo?.status as DpaStatusFact | undefined;
    const agencyComplete = useFact(
        tenantId,
        'agency-complete',
        access.role === 'agency' && access.canReadAgencies,
        async () => {
            const result = await fetchData({
                url: `${agencyEndpointBase}?q=*&page=1&perPage=20&order=ASC&field=NAME`,
                method: FETCH_METHODS.GET,
                skipAuth: false,
                responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
            }).catch(() => undefined);
            const page = result ? removeEmbedded(result) : undefined;
            const agencies = page?.data;
            if (!Array.isArray(agencies)) return null;
            return agencyPageComplete(agencies, page?.total);
        },
        // Same as the own tenant: the step links to the agency editor, so a save
        // there must show as soon as the admin comes back to Home.
        { staleTime: 0 },
    );
    const tenants = useFact(tenantId, 'tenants', access.role === 'platform' && access.canReadTenants, () =>
        getTotal(`${tenantAdminEndpoint}/search?page=1&perPage=1&query=*&field=NAME&order=ASC`),
    );
    const agencies = useFact(tenantId, 'agencies', access.canReadAgencies, () =>
        getTotal(`${agencyEndpointBase}?q=*&page=1&perPage=1&order=ASC&field=NAME`),
    );
    const consultants = useFact(tenantId, 'consultants', access.canReadConsultants, () =>
        getTotal(
            `${usersConsultantsSearchEndpoint}?query=*&page=1&perPage=1&order=ASC&field=${USER_TABLE_API_SAFE_SORT}`,
        ),
    );
    const tenantInvites = useFact(tenantId, 'invites-tenant', access.canInviteTenants, () => getInvitePhases('TENANT'));
    const unitInvites = useFact(tenantId, 'invites-unit', access.canInviteCounsellors, () => getInvitePhases('UNIT'));

    const sum = (phases: Array<string>, ...counts: Array<Partial<Record<string, number>> | undefined>) =>
        counts.every((count) => count === undefined)
            ? undefined
            : counts.reduce((total, count) => total + phases.reduce((part, p) => part + (count?.[p] ?? 0), 0), 0);

    return {
        ownTenant: ownTenant ?? undefined,
        dpaStatus,
        agencyComplete: agencyComplete ?? undefined,
        tenants,
        agencies,
        consultants,
        acceptedTenantInvites: tenantInvites ? tenantInvites.DONE ?? 0 : undefined,
        acceptedCounsellorInvites: unitInvites ? unitInvites.DONE ?? 0 : undefined,
        openInvites: sum([...OPEN_PHASES], tenantInvites, unitInvites),
        needsActionInvites: sum(['NEEDS_ACTION'], tenantInvites, unitInvites),
    };
};
