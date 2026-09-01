import { message } from 'antd';
import i18next from 'i18next';
import { getAccessTokenForRequests, tryRefreshAccessToken } from './auth/auth';
import generateCsrfToken from '../utils/generateCsrfToken';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../utils/language';

import logout from './auth/logout';
import routePathNames, { CSRF_WHITELIST_HEADER } from '../appConfig';

const isLocalDevelopment = import.meta.env.DEV;

export const FETCH_METHODS = {
    DELETE: 'DELETE',
    GET: 'GET',
    POST: 'POST',
    PUT: 'PUT',
    PATCH: 'PATCH',
};

export const FETCH_ERRORS = {
    ABORT: 'ABORT',
    BAD_REQUEST: 'BAD_REQUEST',
    BAD_REQUEST_WITH_RESPONSE: 'BAD_REQUEST_WITH_RESPONSE',
    CATCH_ALL: 'CATCH_ALL',
    CATCH_ALL_SILENT: 'CATCH_ALL_SILENT',
    // Opt-in only: skips the global `/admin/access-denied` redirect for this one call so the
    // caller can render its own inline access-denied state. Additive — every existing caller
    // that doesn't pass this flag keeps the redirect exactly as before.
    FORBIDDEN_SILENT: 'FORBIDDEN_SILENT',
    // Opt-in: reject a 403 with the RAW Response (like CONFLICT_WITH_RESPONSE) so the
    // caller can surface the backend's own explanation (e.g. "Only platform admins can
    // create administrative accounts", UserService#1006) instead of a generic toast.
    // Also skips the global access-denied redirect for this one call.
    FORBIDDEN_WITH_RESPONSE: 'FORBIDDEN_WITH_RESPONSE',
    CONFLICT: 'CONFLICT',
    CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
    EMPTY: 'EMPTY',
    FORBIDDEN: 'FORBIDDEN',
    NO_MATCH: 'NO_MATCH',
    TIMEOUT: 'TIMEOUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PRECONDITION_FAILED: 'PRECONDITION FAILED',
    NOT_ALLOWED: 'NOT_ALLOWED',
    X_REASON: 'X-Reason',
};

export const X_REASON = {
    EMAIL_NOT_AVAILABLE: 'EMAIL_NOT_AVAILABLE',
    USERNAME_NOT_AVAILABLE: 'USERNAME_NOT_AVAILABLE',
    NUMBER_OF_LICENSES_EXCEEDED: 'NUMBER_OF_LICENSES_EXCEEDED',
    SUBDOMAIN_NOT_UNIQUE: 'SUBDOMAIN_NOT_UNIQUE',
    CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS: 'CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS',
    CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE:
        'CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE',
    PASSWORD_NOT_VALID: 'PASSWORD_NOT_VALID',
};

export const FETCH_SUCCESS = {
    CONTENT: 'CONTENT',
};

export class FetchErrorWithOptions extends Error {
    options = {};

    constructor(errorMessage: string, options: {}) {
        super(errorMessage);

        this.options = { ...options };
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, FetchErrorWithOptions.prototype);
    }
}

interface FetchDataProps {
    url: string;
    method: string;
    headersData?: object;
    bodyData?: BodyInit;
    skipAuth?: boolean;
    responseHandling?: string[];
    timeout?: number;
    signal?: AbortSignal;
    // Internal flag: set on the single automatic retry after a token refresh so a
    // genuinely-unauthenticated request cannot loop. Not part of the public API.
    retriedAfterRefresh?: boolean;
}

const executeFetchData = (props: FetchDataProps): Promise<any> =>
    new Promise((resolve, reject) => {
        const accessToken = getAccessTokenForRequests();
        // Check if manual authorization header is provided in headersData
        const manualAuth = (props.headersData as any)?.Authorization;

        let authorization = null;
        if (!props.skipAuth) {
            if (manualAuth) {
                authorization = { Authorization: manualAuth }; // Use manual auth header if provided
            } else {
                authorization = { Authorization: `Bearer ${accessToken}` }; // Fall back to cookie-based auth
            }
        }

        const csrfToken = generateCsrfToken();

        const localDevelopmentHeader =
            isLocalDevelopment && CSRF_WHITELIST_HEADER ? { [CSRF_WHITELIST_HEADER]: csrfToken } : null;

        const controller = new AbortController();
        const timeoutMs = props.timeout ?? 30_000;
        setTimeout(() => controller.abort(), timeoutMs);
        if (props.signal) {
            props.signal.addEventListener('abort', () => controller.abort());
        }

        // Remove Authorization from headersData if it exists to avoid duplication
        const { Authorization: removedAuth, ...otherHeadersData } = (props.headersData as any) || {};

        const normalizedLanguage = normalizeLanguage(i18next.resolvedLanguage || i18next.language) || DEFAULT_LANGUAGE;

        const isMultipartBody = typeof FormData !== 'undefined' && props.bodyData instanceof FormData;
        const req = new Request(props.url, {
            method: props.method,
            headers: {
                ...(isMultipartBody ? {} : { 'Content-Type': 'application/json' }),
                'cache-control': 'no-cache',
                'Accept-Language': normalizedLanguage,
                ...authorization,
                'X-CSRF-TOKEN': csrfToken,
                ...otherHeadersData,
                ...localDevelopmentHeader,
            },
            credentials: 'include',
            body: props.bodyData,
            signal: controller.signal,
        });

        fetch(req)
            .then((response) => {
                if (response.status === 204) {
                    resolve(response);
                } else if (response.status >= 200 && response.status < 300) {
                    const data =
                        props.method === FETCH_METHODS.GET ||
                        (props.responseHandling && props.responseHandling.includes(FETCH_SUCCESS.CONTENT))
                            ? response.json()
                            : response;
                    resolve(data);
                } else if (props.responseHandling) {
                    if (
                        response.status === 400 &&
                        (props.responseHandling.includes(FETCH_ERRORS.BAD_REQUEST) ||
                            props.responseHandling.includes(FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE))
                    ) {
                        reject(
                            props.responseHandling.includes(FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE)
                                ? response
                                : new Error(FETCH_ERRORS.BAD_REQUEST),
                        );
                    } else if (response.status === 404 && props.responseHandling.includes(FETCH_ERRORS.NO_MATCH)) {
                        reject(new Error(FETCH_ERRORS.NO_MATCH));
                    } else if (response.status === 405 && props.responseHandling.includes(FETCH_ERRORS.NOT_ALLOWED)) {
                        reject(new Error(FETCH_ERRORS.NOT_ALLOWED));
                    } else if (
                        response.status === 409 &&
                        (props.responseHandling.includes(FETCH_ERRORS.CONFLICT) ||
                            props.responseHandling.includes(FETCH_ERRORS.CONFLICT_WITH_RESPONSE))
                    ) {
                        reject(
                            props.responseHandling.includes(FETCH_ERRORS.CONFLICT_WITH_RESPONSE)
                                ? response
                                : new Error(FETCH_ERRORS.CONFLICT),
                        );
                    } else if (
                        response.status === 403 &&
                        props.responseHandling.includes(FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE)
                    ) {
                        // Reject with the raw response so the caller can read the backend's
                        // message (see FORBIDDEN_WITH_RESPONSE above). No redirect.
                        reject(response);
                    } else if (response.status === 403 && props.responseHandling.includes(FETCH_ERRORS.FORBIDDEN)) {
                        // Reject locally so the caller can render an in-place "no access"
                        // state instead of losing the whole page to the redirect below.
                        reject(new Error(FETCH_ERRORS.FORBIDDEN));
                    } else if (response.status === 403) {
                        if (props.responseHandling.includes(FETCH_ERRORS.FORBIDDEN_SILENT)) {
                            reject(new Error(FETCH_ERRORS.NOT_ALLOWED));
                        } else {
                            window.location.href = '/admin/access-denied';
                            reject(new Error(FETCH_ERRORS.NOT_ALLOWED));
                        }
                    } else if (response.status === 401) {
                        // Don't force a logout here. fetchData()'s wrapper attempts a single
                        // token refresh + retry before falling back to logout, so a lapsed or
                        // empty access token self-heals instead of dropping the user on the
                        // login page mid-action (e.g. while creating an agency).
                        reject(new Error(FETCH_ERRORS.UNAUTHORIZED));
                    } else if (props.responseHandling.includes(FETCH_ERRORS.CATCH_ALL_SILENT)) {
                        // Reject without showing a toast so the caller can decide how to handle it.
                        reject(response);
                    } else if (props.responseHandling.includes(FETCH_ERRORS.CATCH_ALL)) {
                        message.error({
                            content: i18next.t([
                                `message.error.${response.headers.get(FETCH_ERRORS.X_REASON)}`,
                                'message.error.default',
                            ]) as string,
                            duration: 8,
                        });

                        reject(new Error(FETCH_ERRORS.CATCH_ALL));
                    } else {
                        reject(new Error(`API call error: ${response.status} ${response.statusText}`));
                    }
                } else {
                    // Handle unhandled response status - reject with appropriate error
                    // console.error(`Unhandled response status: ${response.status} for URL: ${props.url}`);
                    reject(new Error(`API call error: ${response.status} ${response.statusText}`));
                }
            })
            .catch((error) => {
                if (props.signal?.aborted && error.name === 'AbortError') {
                    reject(new Error(FETCH_ERRORS.ABORT));
                } else if (error.name === 'AbortError') {
                    reject(new Error(FETCH_ERRORS.TIMEOUT));
                } else {
                    reject(error);
                }
            });
    });

/**
 * Public request helper. Wraps {@link executeFetchData} with a self-healing 401
 * handler: when an authenticated request comes back 401 (typically a lapsed or
 * empty access token in this tab), refresh the token via the BFF and retry the
 * request exactly once. Only if the retry is still unauthorized — or there is no
 * valid session to refresh — do we fall back to logging the user out. This stops
 * the "logged out while creating an agency" forced-logout.
 */
export const fetchData = async (props: FetchDataProps): Promise<any> => {
    try {
        return await executeFetchData(props);
    } catch (error) {
        const isUnauthorized = error instanceof Error && error.message === FETCH_ERRORS.UNAUTHORIZED;

        if (isUnauthorized && !props.skipAuth && !props.retriedAfterRefresh) {
            const refreshed = await tryRefreshAccessToken();
            if (refreshed) {
                // Retry once through fetchData (not executeFetchData) so a retry that
                // is still unauthorized also runs the logout fallback below.
                return fetchData({ ...props, retriedAfterRefresh: true });
            }
        }

        if (isUnauthorized && !props.skipAuth) {
            // Tell the user WHY they are being taken to the login page. Without this,
            // a dead session ended an in-progress action (e.g. sending a Träger-admin
            // invite) with nothing but a spinner and a silent redirect.
            // Stable key: concurrent 401s (a page with many active queries) all reach
            // this fallback once the shared refresh has failed — antd collapses repeats
            // with the same key into ONE toast instead of stacking identical ones.
            message.error({
                content: i18next.t('message.error.sessionExpired') as string,
                duration: 8,
                key: 'session-expired',
            });
            logout(true, routePathNames.login);
        }

        throw error;
    }
};
