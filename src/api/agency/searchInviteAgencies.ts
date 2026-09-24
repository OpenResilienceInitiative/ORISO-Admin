import { agencyEndpointBase } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import removeEmbedded from '../../utils/removeEmbedded';
import { isActiveDeleteDate } from '../../utils/deleteDate';
import type { InviteTopicPermission } from '../accountInvites/accountInvites';

export interface InviteAgencyHit {
    id: number;
    name?: string;
    tenantId?: number;
    tenantName?: string;
    /** Topic (Fachbereich) names — the search matches them too. */
    topics: string[];
    /** Agency default for invited counsellors, when the server sends settings. */
    topicPermission?: InviteTopicPermission;
}

/** One page of picker hits; `page` is the last server page read (it may read ahead past empty ones). */
export interface InviteAgencyPage {
    hits: InviteAgencyHit[];
    /** The server's full hit count, before the client-side Träger filter. */
    total: number;
    hasMore: boolean;
    page: number;
}

export const INVITE_AGENCY_PAGE_SIZE = 10;
// Cap on read-ahead so a Träger without matches cannot page through everything at once.
const MAX_READ_AHEAD = 20;

const TOPIC_PERMISSIONS: InviteTopicPermission[] = ['NONE', 'SELECT_EXISTING', 'CREATE'];

/** The agency's `settings.counsellorTopicPermission`, or `undefined` when absent or unknown. */
export const agencyTopicPermission = (agency: Record<string, any> | undefined): InviteTopicPermission | undefined => {
    const value = agency?.settings?.counsellorTopicPermission;
    return TOPIC_PERMISSIONS.includes(value) ? value : undefined;
};

const fetchAgencyPage = async (q: string, page: number) => {
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
    return { rows, total: Number.isFinite(Number(rawTotal)) ? Number(rawTotal) : rows.length };
};

const toHit = (agency: Record<string, any>): InviteAgencyHit => ({
    id: Number(agency.id),
    name: agency.name ?? undefined,
    tenantId: agency.tenantId != null ? Number(agency.tenantId) : undefined,
    tenantName: agency.tenantName ?? undefined,
    topicPermission: agencyTopicPermission(agency),
    topics: (agency.topics ?? [])
        .map((topic: { name?: string }) => topic?.name)
        .filter((name: unknown): name is string => typeof name === 'string' && name !== ''),
});

// `q` also matches topic names; an older AgencyService ignores `excludeDeleted`, so deleted agencies are
// filtered here too. The server cannot filter by Träger, so a filtered page reads ahead until it has hits.
export const searchInviteAgencies = async (query: string, tenantId?: number, page = 1): Promise<InviteAgencyPage> => {
    const q = query.trim() === '' ? '*' : query.trim();
    let current = page;
    for (;;) {
        // eslint-disable-next-line no-await-in-loop -- each page decides whether the next is needed
        const { rows, total } = await fetchAgencyPage(q, current);
        const hits = rows
            // AgencyService sends an unset deleteDate as the string "null".
            .filter((agency) => agency?.id != null && isActiveDeleteDate(agency.deleteDate))
            .map(toHit)
            .filter((agency) => tenantId == null || agency.tenantId == null || agency.tenantId === tenantId);
        const hasMore = current * INVITE_AGENCY_PAGE_SIZE < total;
        if (hits.length > 0 || !hasMore || current - page + 1 >= MAX_READ_AHEAD) {
            return { hits, total, hasMore, page: current };
        }
        current += 1;
    }
};
