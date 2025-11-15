import { message } from 'antd';
import i18next from 'i18next';
import { getValueFromCookie } from './auth/accessSessionCookie';
import generateCsrfToken from '../utils/generateCsrfToken';

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
    CONFLICT: 'CONFLICT',
    CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
    EMPTY: 'EMPTY',
    NO_MATCH: 'NO_MATCH',
    TIMEOUT: 'TIMEOUT',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PRECONDITION_FAILED: 'PRECONDITION FAILED',
    NOT_ALLOWED: 'NOT_ALLOWED',
    X_REASON: 'X-Reason',
};

export const X_REASON = {
    EMAIL_NOT_AVAILABLE: 'EMAIL_NOT_AVAILABLE',
    NUMBER_OF_LICENSES_EXCEEDED: 'NUMBER_OF_LICENSES_EXCEEDED',
    SUBDOMAIN_NOT_UNIQUE: 'SUBDOMAIN_NOT_UNIQUE',
    CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS: 'CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS',
    CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE:
        'CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE',
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
    rcValidation?: boolean;
    bodyData?: string;
    skipAuth?: boolean;
    responseHandling?: string[];
    timeout?: number;
    signal?: AbortSignal;
}

export const fetchData = (props: FetchDataProps): Promise<any> =>
    new Promise((resolve, reject) => {
        const accessToken = getValueFromCookie('keycloak');
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

        const rcHeaders = props.rcValidation
            ? {
                  rcToken: getValueFromCookie('rc_token'),
                  rcUserId: getValueFromCookie('rc_uid'),
              }
            : null;

        const localDevelopmentHeader = isLocalDevelopment ? { [CSRF_WHITELIST_HEADER]: csrfToken } : null;

        const controller = new AbortController();
        if (props.timeout) {
            setTimeout(() => controller.abort(), props.timeout);
        }
        if (props.signal) {
            props.signal.addEventListener('abort', () => controller.abort());
        }

        // Remove Authorization from headersData if it exists to avoid duplication
        const { Authorization: removedAuth, ...otherHeadersData } = (props.headersData as any) || {};

        const req = new Request(props.url, {
            method: props.method,
            headers: {
                'Content-Type': 'application/json',
                'cache-control': 'no-cache',
                ...authorization,
                'X-CSRF-TOKEN': csrfToken,
                ...otherHeadersData,
                ...rcHeaders,
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
                    } else if (response.status === 403) {
                        // Temporarily disabled to allow admin pages to work while we fix role mapping
                        // window.location.href = '/admin/access-denied';
                        reject(new Error('403 Forbidden'));
                    } else if (response.status === 401) {
                        console.log('🔍 fetchData: 401 Unauthorized - session expired, logging out');
                        logout(true, routePathNames.login);
                        reject(new Error(FETCH_ERRORS.UNAUTHORIZED));
                    } else if (props.responseHandling.includes(FETCH_ERRORS.CATCH_ALL)) {
                        message.error({
                            content: i18next.t([
                                `message.error.${response.headers.get(FETCH_ERRORS.X_REASON)}`,
                                'message.error.default',
                            ]),
                            duration: 3,
                        });

                        reject(new Error(FETCH_ERRORS.CATCH_ALL));
                    }
                } else {
                    // Handle unhandled response status - reject with appropriate error
                    console.error(`Unhandled response status: ${response.status} for URL: ${props.url}`);
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
