import { agencyEndpointBase, tenantAdminEndpoint, accountStatusEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';

export type EntityKind = 'account' | 'tenant' | 'agency';
export interface AccountSecurityMetadata {
    username: string | null;
    createDate: string | null;
    updateDate: string | null;
    twoFactor: { required: boolean | null; configured: boolean | null; active: boolean | null };
}
export interface EntityStatusData {
    active: boolean | null;
    ownActive: boolean | null;
    restrictions: string[];
    account?: AccountSecurityMetadata;
}
const handling = [
    FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE,
    FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE,
    FETCH_ERRORS.CONFLICT_WITH_RESPONSE,
    FETCH_ERRORS.BAD_GATEWAY_WITH_RESPONSE,
    FETCH_ERRORS.NO_MATCH,
    FETCH_ERRORS.CATCH_ALL_SILENT,
];
const bool = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
const text = (value: unknown): string | null => (typeof value === 'string' && value !== '' ? value : null);
const endpoint = (kind: EntityKind, id: string) => {
    if (kind === 'account') return accountStatusEndpoint(id);
    if (kind === 'agency') return `${agencyEndpointBase}/${encodeURIComponent(id)}/status`;
    return `${tenantAdminEndpoint}/${encodeURIComponent(id)}`;
};

export const readEntityStatus = async (kind: EntityKind, id: string): Promise<EntityStatusData> => {
    const response = await fetchData({
        url: endpoint(kind, id),
        method: FETCH_METHODS.GET,
        skipAuth: false,
        responseHandling: handling,
    });
    const returnedId = { account: response?.accountId, agency: response?.agencyId, tenant: response?.id }[kind];
    if (String(returnedId) !== id) throw new Error('STATUS_RESPONSE_INVALID');
    const active = bool(response.active);
    let ownActive = active;
    if (kind === 'account') {
        const paused = bool(response.paused);
        ownActive = paused === null ? null : !paused;
    } else if (kind === 'agency') {
        ownActive = bool(response.ownActive);
    }
    const restrictions = Array.isArray(response.restrictions)
        ? response.restrictions.filter((reason: unknown): reason is string => typeof reason === 'string')
        : [];
    return {
        active,
        ownActive,
        restrictions,
        ...(kind === 'account'
            ? {
                  account: {
                      username: text(response.username),
                      createDate: text(response.createDate),
                      updateDate: text(response.updateDate),
                      twoFactor: {
                          required: bool(response.twoFactor?.required),
                          configured: bool(response.twoFactor?.configured),
                          active: bool(response.twoFactor?.active),
                      },
                  },
              }
            : {}),
    };
};

/** The command carries only the selected object's status; GET establishes the final truth. */
export const writeEntityStatus = async (kind: EntityKind, id: string, active: boolean): Promise<EntityStatusData> => {
    const url = kind === 'tenant' ? `${endpoint(kind, id)}/status` : endpoint(kind, id);
    await fetchData({
        url,
        method: FETCH_METHODS.PUT,
        skipAuth: false,
        bodyData: JSON.stringify({ active }),
        responseHandling: [...handling, FETCH_SUCCESS.CONTENT],
    });
    const confirmed = await readEntityStatus(kind, id);
    if (confirmed.ownActive !== active) throw new Error('STATUS_NOT_CONFIRMED');
    return confirmed;
};
