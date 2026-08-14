/**
 * DPA forward-to-authorised-signer client (epic ORISO-Admin#722, #723/#724).
 *
 * Covers both surfaces of the forward flow:
 *
 *  - PUBLIC (wizard, unauthenticated): the onboarding invite token is the only
 *    credential — the tenant does not exist yet, its ID is merely reserved.
 *    {@link DpaForwardClient} creates the single-use sign link and delivers
 *    the `DPA_FORWARD` mail through the public-token variant of the invite
 *    endpoint (TenantService epic sub-issue ORISO-TenantService#179).
 *  - AUTHENTICATED (post-login, #724): {@link getActiveDpaForward} resolves
 *    whether an undecided tenant currently has a pending forwarded signature,
 *    so the gate can soften the hard blocker into the friendly dialog.
 *
 * TODO(TS#179 contract alignment): the exact endpoint paths and response
 * shapes below are the best-guess contract; ORISO-TenantService#179 will post
 * the authoritative contract as a comment titled "Backend contract for the
 * wizard forward dialog" on ORISO-Admin#723. Revisit this module (and ONLY
 * this module — every caller runs against the typed interface) once that
 * comment exists. Error semantics reuse the onboarding conventions: dead
 * links reject with {@link InviteLinkError}, everything else stays a generic
 * retryable error.
 */

import { appURL, publicAccountInvitesEndpoint, tenantAdminEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import { InviteLinkError, InviteLinkErrorReason } from './tenantOnboarding';

/** A created (or re-issued) single-use public DPA sign link. */
export interface DpaForwardInvite {
    /** Absolute or app-relative public signing URL (`/dpa-sign/{token}`). */
    signLink: string;
    /** ISO timestamp after which the link expires; null = no expiry. */
    expiresAt: string | null;
}

export interface DpaForwardEmailRequest {
    recipientEmail: string;
    /** Optional salutation name shown in the DPA_FORWARD mail. */
    recipientName?: string;
}

/**
 * Typed seam between the wizard forward dialog and the backend. Both methods
 * reject with {@link InviteLinkError} when the onboarding link is dead.
 */
export interface DpaForwardClient {
    /**
     * Declares "not authorised to sign" and creates (or returns the still
     * active) forward sign link for the invite's reserved tenant. Idempotent
     * per invite: repeated calls return the same active link.
     */
    createForwardInvite(inviteToken: string): Promise<DpaForwardInvite>;
    /** Sends the DPA_FORWARD mail carrying the active sign link. */
    sendForwardEmail(inviteToken: string, request: DpaForwardEmailRequest): Promise<void>;
}

/** The sign link may come back relative; public signing belongs to the App origin. */
export const resolveDpaForwardSignLink = (signLink: string, configuredAppUrl = appURL) =>
    new URL(signLink, `${configuredAppUrl.replace(/\/$/, '')}/`).toString();

/** Status → link-error mapping shared with the onboarding endpoints (U3/U6). */
const LINK_ERROR_BY_STATUS: Record<number, InviteLinkErrorReason> = {
    404: 'INVALID',
    409: 'CONSUMED',
    410: 'EXPIRED',
    423: 'REVOKED',
};

const toForwardError = (error: unknown): unknown => {
    if (!(error instanceof Response)) {
        return error;
    }
    const mapped = LINK_ERROR_BY_STATUS[error.status];
    if (mapped) {
        return new InviteLinkError(mapped);
    }
    return new Error(`DPA_FORWARD_HTTP_${error.status}`);
};

// CATCH_ALL_SILENT: reject with the raw Response (no global toast); the dialog
// renders its own inline error. FORBIDDEN_SILENT: never bounce the public
// visitor to the authenticated access-denied page.
const PUBLIC_RESPONSE_HANDLING = [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT];

const forwardUrl = (inviteToken: string, suffix = '') =>
    `${publicAccountInvitesEndpoint}/${encodeURIComponent(inviteToken)}/onboarding/dpa/forward${suffix}`;

/** Production client against the public-token forward endpoints (TS#179). */
export const createHttpDpaForwardClient = (): DpaForwardClient => {
    const run = async <T>(request: () => Promise<T>): Promise<T> => {
        try {
            return await request();
        } catch (error) {
            throw toForwardError(error);
        }
    };

    return {
        createForwardInvite: (inviteToken) =>
            run(() =>
                fetchData({
                    url: forwardUrl(inviteToken),
                    method: FETCH_METHODS.POST,
                    skipAuth: true,
                    responseHandling: [...PUBLIC_RESPONSE_HANDLING, FETCH_SUCCESS.CONTENT],
                    bodyData: JSON.stringify({}),
                }),
            ),

        sendForwardEmail: async (inviteToken, request) => {
            await run(() =>
                fetchData({
                    url: forwardUrl(inviteToken, '/email'),
                    method: FETCH_METHODS.POST,
                    skipAuth: true,
                    responseHandling: PUBLIC_RESPONSE_HANDLING,
                    bodyData: JSON.stringify(request),
                }),
            );
        },
    };
};

/**
 * Pending forwarded signature of an authenticated tenant admin's own tenant
 * (#724). `null` = no forward was ever declared (or it was resolved) — the
 * strict gate from #572 stays in charge.
 */
export interface ActiveDpaForward {
    signLink: string;
    expiresAt: string | null;
    /** Recipient of the last DPA_FORWARD mail, when one was sent. */
    recipientEmail?: string | null;
}

/**
 * Resolves the tenant's active forward sign invite. 404 = no active forward
 * (mapped to `null`, NOT an error); every other failure rejects so the gate
 * can fail closed to the hard blocker.
 */
export const getActiveDpaForward = async (tenantId: number): Promise<ActiveDpaForward | null> => {
    try {
        return (await fetchData({
            url: `${tenantAdminEndpoint}/${tenantId}/dpa/forward`,
            method: FETCH_METHODS.GET,
            skipAuth: false,
            responseHandling: [FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_ERRORS.CATCH_ALL_SILENT],
        })) as ActiveDpaForward;
    } catch (error) {
        if (error instanceof Response && error.status === 404) {
            return null;
        }
        throw error;
    }
};

/** Whether the active forward link's validity window has passed (#724). */
export const isDpaForwardExpired = (forward: Pick<ActiveDpaForward, 'expiresAt'>, now: Date = new Date()): boolean => {
    if (!forward.expiresAt) return false;
    const expiry = new Date(forward.expiresAt);
    return !Number.isNaN(expiry.getTime()) && expiry.getTime() <= now.getTime();
};

export interface StubDpaForwardOptions {
    /** Simulated network latency. Default 0 (tests); stories may raise it. */
    latencyMs?: number;
    /** Forces both calls to reject (retryable error state). */
    failing?: boolean;
    invite?: Partial<DpaForwardInvite>;
}

const STUB_FORWARD_INVITE: DpaForwardInvite = {
    signLink: 'https://app.example.org/dpa-sign/stub-forward-token',
    expiresAt: '2026-08-28T12:00:00Z',
};

const wait = (ms: number) =>
    ms > 0
        ? new Promise<void>((resolve) => {
              setTimeout(resolve, ms);
          })
        : Promise.resolve();

/**
 * In-memory stand-in for tests and Storybook ONLY — never the production
 * default. Mirrors the contract where the UI depends on it: idempotent link
 * creation and a rejecting variant for the error states.
 */
export const createStubDpaForwardClient = (options: StubDpaForwardOptions = {}): DpaForwardClient => {
    const { latencyMs = 0, failing = false } = options;
    const invite: DpaForwardInvite = { ...STUB_FORWARD_INVITE, ...options.invite };
    const sentTo: string[] = [];

    return {
        createForwardInvite: async () => {
            await wait(latencyMs);
            if (failing) {
                throw new Error('DPA_FORWARD_HTTP_500');
            }
            return invite;
        },
        sendForwardEmail: async (_inviteToken, request) => {
            await wait(latencyMs);
            if (failing) {
                throw new Error('DPA_FORWARD_HTTP_500');
            }
            sentTo.push(request.recipientEmail);
        },
    };
};
