import { tenantAdminEndpoint } from '../../appConfig';
import { DpaGateStatus } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import { isFutureSigningDeadline } from '../../utils/dpaSigningDeadline';

/** Publishes a deadline-governed DPA through the additive v2 contract. */
export const publishDpa = (tenantId: number, contentByLanguage: Record<string, string>, signingDeadlineAt: string) => {
    if (!isFutureSigningDeadline(signingDeadlineAt)) return Promise.reject(new Error('INVALID_SIGNING_DEADLINE'));
    return fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa/v2?${new URLSearchParams({ signingDeadlineAt })}`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(contentByLanguage),
        // CATCH_ALL_SILENT: reject without fetchData's generic message.error toast —
        // the card keeps one inline error and its editable draft.
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_SUCCESS.CONTENT],
    }) as Promise<DpaGateStatus>;
};
