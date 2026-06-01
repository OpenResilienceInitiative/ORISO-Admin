import { mainURL } from '../../appConfig';
import { parseUserAuthInfo } from '../../utils/parseUserAuthInfo';

/** POST/GET {{baseUrl}}/useradmin/invitelinks — see invite-link-apis.json */
export const invitelinksEndpoint = `${mainURL}/service/useradmin/invitelinks`;

export interface PagedInviteLinksResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    page: number;
    size: number;
}

/** Authorization + X-Tenant-Id (Postman collection headers). */
export const inviteLinkHeaders = (tenantIdOverride?: number): Record<string, string> => {
    if (tenantIdOverride != null && tenantIdOverride > 0) {
        return { 'X-Tenant-Id': String(tenantIdOverride) };
    }

    const { tenantId } = parseUserAuthInfo();
    const resolvedTenantId = tenantId && tenantId > 0 ? tenantId : 1;
    return { 'X-Tenant-Id': String(resolvedTenantId) };
};

export const buildListQueryString = (page: number, size: number): string => {
    const search = new URLSearchParams();
    search.set('page', String(page));
    search.set('size', String(size));
    return search.toString();
};

export const normalizeListResponse = <T>(
    raw: PagedInviteLinksResponse<T> | T[],
    page: number,
    size: number,
): PagedInviteLinksResponse<T> => {
    if (Array.isArray(raw)) {
        return {
            content: raw,
            totalElements: raw.length,
            totalPages: 1,
            page,
            size,
        };
    }

    return {
        content: raw.content ?? [],
        totalElements: raw.totalElements ?? 0,
        totalPages: raw.totalPages ?? 0,
        page: raw.page ?? page,
        size: raw.size ?? size,
    };
};
