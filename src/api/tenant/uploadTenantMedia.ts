import { tenantAdminEndpoint } from '../../appConfig';
import { getAccessTokenForRequests } from '../auth/auth';
import generateCsrfToken from '../../utils/generateCsrfToken';

export interface TenantMediaResponse {
    id: string;
    url: string;
    contentType: string;
}

/**
 * Uploads an editor image to the tenant media endpoint (WP-3a, TenantService#92).
 * Deliberately not routed through `fetchData`: multipart bodies must let the browser
 * set the boundary content type, which fetchData hardwires to application/json.
 */
export const uploadTenantMedia = async (file: File): Promise<TenantMediaResponse> => {
    const body = new FormData();
    body.append('file', file, file.name);

    const response = await fetch(`${tenantAdminEndpoint}/media`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${getAccessTokenForRequests()}`,
            'X-CSRF-TOKEN': generateCsrfToken(),
        },
        credentials: 'include',
        body,
    });
    if (!response.ok) {
        throw new Error(`media upload failed with status ${response.status}`);
    }
    return response.json();
};
