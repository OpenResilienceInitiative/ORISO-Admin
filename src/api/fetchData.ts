import i18next from 'i18next';
import { getAccessTokenForRequests, tryRefreshAccessToken } from './auth/auth';
import generateCsrfToken from '../utils/generateCsrfToken';
import { DEFAULT_LANGUAGE, normalizeLanguage } from '../utils/language';
import { captureTransportFeedback, type TransportFeedback } from './transportFeedback';

import logout from './auth/logout';
import { CSRF_WHITELIST_HEADER } from '../appConfig';

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
    // A follow-up read can report its failure locally, including 401 and 403,
    // while the user is still looking at the result of the preceding action.
    LOCAL_FAILURE_WITH_RESPONSE: 'LOCAL_FAILURE_WITH_RESPONSE',
    // Opt-in only: skips the global `/admin/access-denied` redirect for this one call so the
    // caller can render its own inline access-denied state. Additive — every existing caller
    // that doesn't pass this flag keeps the redirect exactly as before.
    FORBIDDEN_SILENT: 'FORBIDDEN_SILENT',
    // Opt-in: reject a 403 with the RAW Response (like CONFLICT_WITH_RESPONSE) so the
    // caller can surface the backend's own explanation (e.g. "Only platform admins can
    // create administrative accounts", UserService#1006) instead of a generic toast.
    // Also skips the global access-denied redirect for this one call.
    FORBIDDEN_WITH_RESPONSE: 'FORBIDDEN_WITH_RESPONSE',
    // Opt-in: reject a 502 with the RAW Response so the caller can read the
    // gateway's machine-readable `reason`/`detail` body. UserService answers
    // 502 `{"reason":"SMTP_SEND_FAILED","detail":"<category>"}` when an invite
    // mail could not be handed to SMTP (UserService#1160) — without this the
    // call fell into CATCH_ALL and the admin saw "something went wrong"
    // instead of "mail delivery is misconfigured". Must be checked BEFORE
    // CATCH_ALL so no generic toast is stacked on top of the specific one.
    BAD_GATEWAY_WITH_RESPONSE: 'BAD_GATEWAY_WITH_RESPONSE',
    CONFLICT: 'CONFLICT',
    CONFLICT_WITH_RESPONSE: 'CONFLICT_WITH_RESPONSE',
    EMPTY: 'EMPTY',
    FORBIDDEN: 'FORBIDDEN',
    NO_MATCH: 'NO_MATCH',
    // Opt-in: reject a 503 locally so the caller can say "temporarily unavailable". The
    // statistics dashboard answers 503 when its settings cannot be read (UserService#1568);
    // without this code it was indistinguishable from any other failure.
    SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
    TIMEOUT: 'TIMEOUT',
    // The auth server refused because a limit was hit, not because the credentials
    // were wrong: Keycloak answers 429 both for "too many codes requested" and for
    // "too many failed attempts on this code" (ORISO-UserService#1338). Without this
    // code a 429 fell into the catch-all and the login screen said "network error".
    TOO_MANY_REQUESTS: 'TOO_MANY_REQUESTS',
    UNAUTHORIZED: 'UNAUTHORIZED',
    PRECONDITION_FAILED: 'PRECONDITION FAILED',
    NOT_ALLOWED: 'NOT_ALLOWED',
    X_REASON: 'X-Reason',
};

export const X_REASON = {
    EMAIL_NOT_AVAILABLE: 'EMAIL_NOT_AVAILABLE',
    USERNAME_NOT_AVAILABLE: 'USERNAME_NOT_AVAILABLE',
    // The name belongs to a counsellor whose deletion is still running; it becomes free once the
    // hard deletion has run after the safeguard window (ORISO-Admin#1489).
    USERNAME_IN_DELETION: 'USERNAME_IN_DELETION',
    NUMBER_OF_LICENSES_EXCEEDED: 'NUMBER_OF_LICENSES_EXCEEDED',
    TENANT_LICENSING_NOT_CONFIGURED: 'TENANT_LICENSING_NOT_CONFIGURED',
    SUBDOMAIN_NOT_UNIQUE: 'SUBDOMAIN_NOT_UNIQUE',
    // TenantService answers 400 (not 409) for a subdomain that cannot appear in a host
    // name; `SubdomainValidator` there mirrors this app's own `SUBDOMAIN_PATTERN`. The
    // caller must declare BAD_REQUEST_WITH_RESPONSE, or the reason never reaches it.
    SUBDOMAIN_INVALID: 'SUBDOMAIN_INVALID',
    CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS: 'CONSULTANT_HAS_ACTIVE_OR_ARCHIVE_SESSIONS',
    CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE:
        'CONSULTANT_IS_THE_LAST_OF_AGENCY_AND_AGENCY_IS_STILL_ACTIVE',
    PASSWORD_NOT_VALID: 'PASSWORD_NOT_VALID',
    // AgencyService 409: the global one-topic-per-agency switch rejected the save (UserService#1264).
    ONE_TOPIC_PER_AGENCY: 'ONE_TOPIC_PER_AGENCY',
    // AgencyService 503: the switch could not be read, so a topic-adding save is refused; retry helps.
    SETTINGS_UNAVAILABLE: 'SETTINGS_UNAVAILABLE',
};

export const FETCH_SUCCESS = {
    CONTENT: 'CONTENT',
    TEXT: 'TEXT',
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

const readResponse = (response: Response, props: FetchDataProps, report: TransportFeedback) => {
    const { status } = response;
    const handling = props.responseHandling;
    if (status === 204) return response;
    if (status >= 200 && status < 300) {
        if (handling?.includes(FETCH_SUCCESS.TEXT)) return response.text();
        if (props.method === FETCH_METHODS.GET || handling?.includes(FETCH_SUCCESS.CONTENT)) return response.json();
        return response;
    }

    if (handling) {
        if (handling.includes(FETCH_ERRORS.LOCAL_FAILURE_WITH_RESPONSE)) return Promise.reject(response);
        if (status === 400) {
            if (handling.includes(FETCH_ERRORS.BAD_REQUEST_WITH_RESPONSE)) return Promise.reject(response);
            if (handling.includes(FETCH_ERRORS.BAD_REQUEST)) throw new Error(FETCH_ERRORS.BAD_REQUEST);
        }
        if (status === 404 && handling.includes(FETCH_ERRORS.NO_MATCH)) throw new Error(FETCH_ERRORS.NO_MATCH);
        if (status === 405 && handling.includes(FETCH_ERRORS.NOT_ALLOWED)) throw new Error(FETCH_ERRORS.NOT_ALLOWED);
        if (status === 409) {
            if (handling.includes(FETCH_ERRORS.CONFLICT_WITH_RESPONSE)) return Promise.reject(response);
            if (handling.includes(FETCH_ERRORS.CONFLICT)) throw new Error(FETCH_ERRORS.CONFLICT);
        }
        if (status === 403) {
            if (handling.includes(FETCH_ERRORS.FORBIDDEN_WITH_RESPONSE)) return Promise.reject(response);
            if (handling.includes(FETCH_ERRORS.FORBIDDEN)) throw new Error(FETCH_ERRORS.FORBIDDEN);
            if (!handling.includes(FETCH_ERRORS.FORBIDDEN_SILENT)) window.location.href = '/admin/access-denied';
            throw new Error(FETCH_ERRORS.NOT_ALLOWED);
        }
        if (status === 502 && handling.includes(FETCH_ERRORS.BAD_GATEWAY_WITH_RESPONSE))
            return Promise.reject(response);
        if (status === 503 && handling.includes(FETCH_ERRORS.SERVICE_UNAVAILABLE)) {
            throw new Error(FETCH_ERRORS.SERVICE_UNAVAILABLE);
        }
        if (status === 401) throw new Error(FETCH_ERRORS.UNAUTHORIZED);
        if (handling.includes(FETCH_ERRORS.CATCH_ALL_SILENT)) return Promise.reject(response);
        if (handling.includes(FETCH_ERRORS.CATCH_ALL)) {
            report({
                content: i18next.t([
                    `message.error.${response.headers.get(FETCH_ERRORS.X_REASON)}`,
                    'message.error.default',
                ]) as string,
                duration: 8,
            });
            throw new Error(FETCH_ERRORS.CATCH_ALL);
        }
    }
    throw new Error(`API call error: ${status} ${response.statusText}`);
};

const executeFetchData = async (props: FetchDataProps, report: TransportFeedback): Promise<any> => {
    if (props.signal?.aborted) throw new Error(FETCH_ERRORS.ABORT);

    const accessToken = getAccessTokenForRequests();
    const { Authorization: manualAuth, ...otherHeadersData } = (props.headersData as any) || {};
    const authorization = props.skipAuth ? null : { Authorization: manualAuth || `Bearer ${accessToken}` };
    const csrfToken = generateCsrfToken();
    const localDevelopmentHeader =
        isLocalDevelopment && CSRF_WHITELIST_HEADER ? { [CSRF_WHITELIST_HEADER]: csrfToken } : null;
    const normalizedLanguage = normalizeLanguage(i18next.resolvedLanguage || i18next.language) || DEFAULT_LANGUAGE;
    const isMultipartBody = typeof FormData !== 'undefined' && props.bodyData instanceof FormData;
    const controller = new AbortController();
    const request = new Request(props.url, {
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

    if (props.signal?.aborted) throw new Error(FETCH_ERRORS.ABORT);
    let interruption: string | undefined;
    const cancel = (cause: string) => {
        if (controller.signal.aborted) return;
        interruption = cause;
        controller.abort();
    };
    const abort = () => cancel(FETCH_ERRORS.ABORT);
    const deadline = setTimeout(() => cancel(FETCH_ERRORS.TIMEOUT), props.timeout ?? 30_000);
    props.signal?.addEventListener('abort', abort);

    try {
        const response = await fetch(request);
        if (interruption) throw new Error(interruption);
        // Keep cancellation active while reading a body owned by this helper.
        return await readResponse(response, props, report);
    } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(interruption ?? FETCH_ERRORS.TIMEOUT);
        }
        throw error;
    } finally {
        clearTimeout(deadline);
        props.signal?.removeEventListener('abort', abort);
    }
};

const refreshForRequest = (signal?: AbortSignal): Promise<boolean> => {
    if (!signal) return tryRefreshAccessToken();
    if (signal.aborted) return Promise.reject(new Error(FETCH_ERRORS.ABORT));
    return new Promise((resolve, reject) => {
        const abort = () => reject(new Error(FETCH_ERRORS.ABORT));
        signal.addEventListener('abort', abort, { once: true });
        // This caller can stop waiting without interrupting the shared refresh.
        tryRefreshAccessToken()
            .finally(() => signal.removeEventListener('abort', abort))
            .then(resolve, reject);
    });
};

/**
 * Public request helper. Wraps {@link executeFetchData} with a self-healing 401
 * handler: when an authenticated request comes back 401 (typically a lapsed or
 * empty access token in this tab), refresh the token via the BFF and retry the
 * request exactly once. Only if the retry is still unauthorized — or there is no
 * valid session to refresh — do we fall back to logging the user out. This stops
 * the "logged out while creating an agency" forced-logout.
 */
const fetchWithFeedback = async (props: FetchDataProps, report: TransportFeedback): Promise<any> => {
    try {
        return await executeFetchData(props, report);
    } catch (error) {
        const isUnauthorized = error instanceof Error && error.message === FETCH_ERRORS.UNAUTHORIZED;
        if (isUnauthorized && props.signal?.aborted) throw new Error(FETCH_ERRORS.ABORT);

        if (isUnauthorized && !props.skipAuth && !props.retriedAfterRefresh) {
            const refreshed = await refreshForRequest(props.signal);
            if (props.signal?.aborted) throw new Error(FETCH_ERRORS.ABORT);
            if (refreshed) {
                // Retry once through this private wrapper (not executeFetchData) so a retry that
                // is still unauthorized also runs the logout fallback below.
                return fetchWithFeedback({ ...props, retriedAfterRefresh: true }, report);
            }
        }

        if (isUnauthorized && !props.skipAuth) {
            // Tell the user WHY they are being taken to the login page. Without this,
            // a dead session ended an in-progress action (e.g. sending a Träger-admin
            // invite) with nothing but a spinner and a silent redirect.
            // Stable key: concurrent 401s (a page with many active queries) all reach
            // this fallback once the shared refresh has failed — the snackbar channel collapses
            // repeats with the same key into ONE snackbar instead of stacking identical ones.
            report({
                content: i18next.t('message.error.sessionExpired') as string,
                duration: 8,
                key: 'session-expired',
            });
            logout(true);
        }

        throw error;
    }
};

// Capture at the public request boundary, once for the original and its private retry.
export const fetchData = (props: FetchDataProps): Promise<any> => fetchWithFeedback(props, captureTransportFeedback());
