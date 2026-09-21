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

const PAGE_SIZE = 10;

/**
 * Type-ahead search for EXISTING agencies (AgencyService#307): the regular admin
 * agency list, whose `q` also matches topic names and which leaves deleted
 * agencies out with `excludeDeleted=true`. The backend scopes the hits to what
 * the caller may see (own Träger / own agencies / everything for the platform
 * admin). An older AgencyService simply ignores the extra parameter and matches
 * names only, so the picker degrades instead of failing.
 */
export const searchInviteAgencies = async (query: string, tenantId?: number): Promise<InviteAgencyHit[]> => {
    const q = query.trim() === '' ? '*' : query.trim();
    const result = await fetchData({
        url: `${agencyEndpointBase}?q=${encodeURIComponent(
            q,
        )}&page=1&perPage=${PAGE_SIZE}&field=NAME&order=ASC&excludeDeleted=true`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
    });
    const { data } = removeEmbedded(result ?? {});
    return (
        (data as Array<Record<string, any>>)
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
            .filter((agency) => tenantId == null || agency.tenantId == null || agency.tenantId === tenantId)
    );
};
