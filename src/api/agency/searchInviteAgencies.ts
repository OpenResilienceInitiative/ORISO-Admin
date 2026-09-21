import { agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import removeEmbedded from '../../utils/removeEmbedded';
import { isActiveDeleteDate } from '../../utils/deleteDate';

/** One hit of the invite-bar agency picker (#1026 slice 2). */
export interface InviteAgencyHit {
    id: number;
    name?: string;
    tenantId?: number;
    tenantName?: string;
    /** Topic (Fachbereich) names — the search matches them too. */
    topics: string[];
}

/** One page of picker hits. `hasMore` follows the server's `total`, not the (Träger-filtered) hit count. */
export interface InviteAgencyPage {
    hits: InviteAgencyHit[];
    /** The server's full hit count for this query (before the client-side Träger filter). */
    total: number;
    hasMore: boolean;
}

export const INVITE_AGENCY_PAGE_SIZE = 10;

/**
 * Type-ahead search for EXISTING agencies (AgencyService#307): the regular admin
 * agency list, whose `q` also matches topic names and which leaves deleted
 * agencies out with `excludeDeleted=true`. The backend scopes the hits to what
 * the caller may see (own Träger / own agencies / everything for the platform
 * admin). An older AgencyService simply ignores the extra parameter and matches
 * names only, so the picker degrades instead of failing.
 *
 * Paged (#1026): the endpoint has no perPage cap and reports the full hit count
 * in `total`; the picker asks for the next page when the admin wants more, so
 * every agency in scope is reachable — not just the first 10.
 */
export const searchInviteAgencies = async (query: string, tenantId?: number, page = 1): Promise<InviteAgencyPage> => {
    const q = query.trim() === '' ? '*' : query.trim();
    const result = await fetchData({
        url: `${agencyEndpointBase}?q=${encodeURIComponent(
            q,
        )}&page=${page}&perPage=${INVITE_AGENCY_PAGE_SIZE}&field=NAME&order=ASC&excludeDeleted=true`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
    const { data, total: rawTotal } = removeEmbedded(result ?? {});
    const rows = (data ?? []) as Array<Record<string, any>>;
    const total = Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : rows.length;
    const hits = rows
        // AgencyService sends an unset deleteDate as the STRING "null" (seen on
        // Pre-Dev); the shared helper knows that, a truthiness check did not.
        .filter((agency) => agency?.id != null && isActiveDeleteDate(agency.deleteDate))
        .map((agency) => ({
            id: Number(agency.id),
            name: agency.name ?? undefined,
            tenantId: agency.tenantId != null ? Number(agency.tenantId) : undefined,
            tenantName: agency.tenantName ?? undefined,
            topics: (agency.topics ?? [])
                .map((topic: { name?: string }) => topic?.name)
                .filter((name: unknown): name is string => typeof name === 'string' && name !== ''),
        }))
        .filter((agency) => tenantId == null || agency.tenantId == null || agency.tenantId === tenantId);
    return { hits, total, hasMore: page * INVITE_AGENCY_PAGE_SIZE < total };
};
