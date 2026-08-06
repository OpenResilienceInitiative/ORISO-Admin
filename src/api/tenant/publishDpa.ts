import { tenantAdminEndpoint } from '../../appConfig';
import { DpaGateStatus } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, fetchData } from '../fetchData';

/** Publishes the tenant DPA (per-language HTML map) and stamps a new version. */
export const publishDpa = (tenantId: number, contentByLanguage: Record<string, string>) =>
    fetchData({
        url: `${tenantAdminEndpoint}/${tenantId}/dpa`,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify(contentByLanguage),
        // CATCH_ALL_SILENT: reject without fetchData's generic message.error toast —
        // usePublishDpa surfaces a DPA-specific notification.error instead, so a
        // failed publish shows one clear message rather than two stacked toasts.
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT],
    }) as Promise<DpaGateStatus>;
