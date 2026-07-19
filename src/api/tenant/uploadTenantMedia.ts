import { tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

export interface TenantMediaResponse {
    id: string;
    url: string;
    contentType: string;
}

/**
 * Uploads an editor image to the tenant media endpoint (WP-3a, TenantService#92).
 * `fetchData` keeps auth refresh/logout behavior consistent with the other Admin APIs
 * while omitting its JSON content type for FormData so the browser owns the boundary.
 */
export const uploadTenantMedia = async (file: File): Promise<TenantMediaResponse> => {
    const body = new FormData();
    body.append('file', file, file.name);

    return fetchData({
        url: `${tenantAdminEndpoint}/media`,
        method: FETCH_METHODS.POST,
        bodyData: body,
        responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_SUCCESS.CONTENT],
    });
};
