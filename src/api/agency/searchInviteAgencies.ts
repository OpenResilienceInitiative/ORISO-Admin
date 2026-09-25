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

/** One page of picker hits; `page` is the last server page read (it may read ahead past deleted-only ones). */
export interface InviteAgencyPage {
    hits: InviteAgencyHit[];
    /** The server's full hit count; with a Träger, that Träger's count. */
    total: number;
    hasMore: boolean;
    page: number;
}

export const INVITE_AGENCY_PAGE_SIZE = 10;
// Cap on read-ahead so a run of deleted agencies cannot page through everything at once.
const MAX_READ_AHEAD = 20;

const TOPIC_PERMISSIONS: InviteTopicPermission[] = ['NONE', 'SELECT_EXISTING', 'CREATE'];

/** The agency's `settings.counsellorTopicPermission`, or `undefined` when absent or unknown. */
export const agencyTopicPermission = (agency: Record<string, any> | undefined): InviteTopicPermission | undefined => {
    const value = agency?.settings?.counsellorTopicPermission;
    return TOPIC_PERMISSIONS.includes(value) ? value : undefined;
};

const fetchAgencyPage = async (q: string, page: number, tenantId?: number, signal?: AbortSignal) => {
    const tenantFilter = tenantId == null ? '' : `&tenantId=${tenantId}`;
    const result = await fetchData({
        url: `${agencyEndpointBase}?q=${encodeURIComponent(
            q,
        )}&page=${page}&perPage=${INVITE_AGENCY_PAGE_SIZE}&field=NAME&order=ASC&excludeDeleted=true${tenantFilter}`,
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: [FETCH_ERRORS.CATCH_ALL],
        signal,
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

const readPage = async (
    q: string,
    page: number,
    tenantId?: number,
    signal?: AbortSignal,
): Promise<InviteAgencyPage> => {
    const { rows, total } = await fetchAgencyPage(q, page, tenantId, signal);
    const hits = rows
        // AgencyService sends an unset deleteDate as the string "null".
        .filter((agency) => agency?.id != null && isActiveDeleteDate(agency.deleteDate))
        .map(toHit)
        // No-op on a current AgencyService; an older one ignores `tenantId` and must not leak other Träger.
        .filter((agency) => tenantId == null || agency.tenantId == null || agency.tenantId === tenantId);
    return { hits, total, hasMore: page * INVITE_AGENCY_PAGE_SIZE < total, page };
};

// With a Träger the server filters and counts, so one page is one request. Without one, read ahead past
// deleted-only pages (an older AgencyService ignores `excludeDeleted`); `signal` stops that on a newer query.
export const searchInviteAgencies = async (
    query: string,
    tenantId?: number,
    page = 1,
    signal?: AbortSignal,
): Promise<InviteAgencyPage> => {
    const q = query.trim() === '' ? '*' : query.trim();
    if (tenantId != null) return readPage(q, page, tenantId, signal);
    let current = page;
    for (;;) {
        signal?.throwIfAborted();
        // eslint-disable-next-line no-await-in-loop -- each page decides whether the next is needed
        const result = await readPage(q, current, undefined, signal);
        if (result.hits.length > 0 || !result.hasMore || current - page + 1 >= MAX_READ_AHEAD) return result;
        current += 1;
    }
};
