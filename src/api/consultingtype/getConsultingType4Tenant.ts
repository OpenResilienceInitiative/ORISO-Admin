import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';
import { consultingTypeEndpoint } from '../../appConfig';

/**
 * The modality a new agency gets when the create form supplied none. Previously this was whatever
 * the service happened to return first — it is now named rather than accidental.
 */
export const DEFAULT_CONSULTING_TYPE_ID = 1;

/**
 * Resolves the counselling modality for a new agency when the create form supplied none.
 *
 * `consulting_type` is **not** deprecated: it encodes the counselling/chat modality — live and
 * proximity chat, 1:1, internal chats, group chat, video — and `/service/consultingtypes/basic`
 * carries the per-modality flags (`groupChat.isGroupChat`, `isVideoCallAllowed`,
 * `isAnonymousConversationAllowed`). Registration filters agencies on `a.consulting_type`, so an
 * agency created with the wrong modality is silently invisible to help-seekers
 * (ORISO-Frontend#245).
 *
 * The previous implementation returned `consultingTypeResponse[0].id` under the comment "as
 * consulting types are not used anymore and will be removed in the future". Both were wrong and
 * load-bearing: reordering the endpoint's response would have changed which modality new agencies
 * receive, silently and with no error anywhere.
 *
 * Returns a **number**, matching what the agency API expects on the wire. The previous signature
 * claimed `Promise<string>` while the happy path handed back the service's numeric id and only the
 * catch returned `'1'` — the declaration was the inaccurate part, so it is the declaration that
 * changed rather than the values.
 */
export default async function getConsultingType4Tenant(): Promise<number> {
    try {
        const consultingTypeResponse = await fetchData({
            url: `${consultingTypeEndpoint}/basic`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.CATCH_ALL],
        });

        const offeredIds: number[] = (Array.isArray(consultingTypeResponse) ? consultingTypeResponse : [])
            .map((consultingType: { id?: unknown }) => Number(consultingType?.id))
            .filter((id: number) => Number.isFinite(id));

        if (offeredIds.includes(DEFAULT_CONSULTING_TYPE_ID)) {
            return DEFAULT_CONSULTING_TYPE_ID;
        }

        // The tenant does not offer the default modality — take the lowest offered one, so the
        // outcome is deterministic and inspectable instead of depending on response order.
        return offeredIds.length > 0 ? Math.min(...offeredIds) : DEFAULT_CONSULTING_TYPE_ID;
    } catch (error) {
        // Service unavailable — a new agency still needs a modality; the default keeps it reachable.
        return DEFAULT_CONSULTING_TYPE_ID;
    }
}
