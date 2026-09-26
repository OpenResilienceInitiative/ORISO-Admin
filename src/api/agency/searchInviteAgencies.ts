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

const TOPIC_PERMISSIONS: InviteTopicPermission[] = ['NONE', 'SELECT_EXISTING', 'CREATE'];

/** The agency's `settings.counsellorTopicPermission`, or `undefined` when absent or unknown. */
export const agencyTopicPermission = (agency: Record<string, any> | undefined): InviteTopicPermission | undefined => {
    const value = agency?.settings?.counsellorTopicPermission;
    return TOPIC_PERMISSIONS.includes(value) ? value : undefined;
};

const PAGE_SIZE = 10;

// `q` also matches topic names; an older AgencyService ignores `excludeDeleted`,
// so deleted agencies are filtered here too.
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
            // AgencyService sends an unset deleteDate as the string "null".
            .filter((agency) => agency?.id != null && isActiveDeleteDate(agency.deleteDate))
            .map((agency) => ({
                id: Number(agency.id),
                name: agency.name ?? undefined,
                tenantId: agency.tenantId != null ? Number(agency.tenantId) : undefined,
                tenantName: agency.tenantName ?? undefined,
                topicPermission: agencyTopicPermission(agency),
                topics: (agency.topics ?? [])
                    .map((topic: { name?: string }) => topic?.name)
                    .filter((name: unknown): name is string => typeof name === 'string' && name !== ''),
            }))
            .filter((agency) => tenantId == null || agency.tenantId == null || agency.tenantId === tenantId)
    );
};
