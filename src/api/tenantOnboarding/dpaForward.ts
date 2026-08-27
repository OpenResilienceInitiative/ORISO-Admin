/**
 * DPA forward-to-authorised-signer client (epic ORISO-Admin#722, #723/#724).
 *
 * Contract: ORISO-TenantService#191 (public forward endpoint, link lifecycle,
 * audit fields) + ORISO-UserService#1031 (`DPA_SIGNED_NOTICE`), as published on
 * ORISO-Admin#723 including the correction of 2026-08-15.
 *
 * The wizard talks to **UserService only** — it already holds the onboarding
 * invite token, and UserService performs the TenantService call server-side.
 * The public `POST /tenant/public/dpa/forward` endpoint is never called by the
 * browser.
 *
 * Waiting state (per the correction): there is NO `PENDING_FORWARDED` status
 * value. "Forwarded, awaiting signature" is orthogonal to the signature state
 * and travels as an additive boolean — `forwardPending` on the status DTO and
 * `dpaForwardPending` on the gate DTO. See {@link isAwaitingForwardedSignature}.
 */

import { appURL, publicAccountInvitesEndpoint } from '../../appConfig';
import { DpaGateStatus, TenantDpaStatusInfo } from '../../types/dpa';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import { InviteLinkError, InviteLinkErrorReason } from './tenantOnboarding';

/** A created single-use public DPA sign link. */
export interface DpaForwardLink {
    /** The public standalone signing page carrying the raw token. Never logged. */
    signUrl: string;
    /** ISO local date-time, 14-day validity window; null when unbounded. */
    expiresAt: string | null;
}

export interface DpaForwardRequest {
    /**
     * Optional. When present the `DPA_FORWARD` mail is sent to that address;
     * when absent no mail goes out and the link is only returned for manual
     * sharing.
     */
    recipientEmail?: string;
}

/**
 * Outcome of a forward call. `mailFailed` marks the 502 case: the mail could
 * not be handed to the SMTP server, but the LINK WAS STILL CREATED — the UI
 * must show the copyable link plus a "mail not sent" notice rather than a
 * total failure.
 */
export interface DpaForwardOutcome {
    link: DpaForwardLink;
    mailFailed: boolean;
}

/** Why a forward call failed in a way the dialog must phrase specifically. */
export type DpaForwardFailureKind =
    /** 404 — unknown invite token. */
    | 'UNKNOWN_TOKEN'
    /** 409 — the platform operator has published no DPA, nothing to forward. */
    | 'NO_DPA_PUBLISHED'
    /** 429 — this onboarding already holds the maximum of outstanding sign links. */
    | 'TOO_MANY_LINKS'
    /** Anything else — retryable/technical. */
    | 'TECHNICAL';

export class DpaForwardError extends Error {
    readonly kind: DpaForwardFailureKind;

    constructor(kind: DpaForwardFailureKind) {
        super(`DPA_FORWARD_${kind}`);
        this.kind = kind;
        Object.setPrototypeOf(this, DpaForwardError.prototype);
    }
}

/** The sign URL may come back relative; public signing belongs to the App origin. */
export const resolveDpaForwardSignLink = (signUrl: string, configuredAppUrl = appURL) =>
    new URL(signUrl, `${configuredAppUrl.replace(/\/$/, '')}/`).toString();

/**
 * "Forwarded — awaiting signature" for either DTO. Never true for VALID,
 * MISSING or INCONSISTENT (guaranteed by the backend, asserted here so a
 * malformed answer cannot soften the gate).
 */
export const isAwaitingForwardedSignature = (
    dto:
        | Pick<TenantDpaStatusInfo, 'status' | 'forwardPending'>
        | Pick<DpaGateStatus, 'dpaSigned' | 'dpaForwardPending'>,
): boolean => {
    if ('dpaForwardPending' in dto || 'dpaSigned' in dto) {
        const gate = dto as Pick<DpaGateStatus, 'dpaSigned' | 'dpaForwardPending'>;
        return gate.dpaForwardPending === true && gate.dpaSigned !== true;
    }
    const status = dto as Pick<TenantDpaStatusInfo, 'status' | 'forwardPending'>;
    return status.forwardPending === true && (status.status === 'UNSIGNED' || status.status === 'OUTDATED');
};

const isInviteLinkErrorReason = (value: unknown): value is InviteLinkErrorReason =>
    value === 'CONSUMED' || value === 'REVOKED' || value === 'EXPIRED' || value === 'INVALID';

/**
 * 410 carries `{ reason }` — mapped body-first, exactly like `…/onboarding`.
 * `SUPERSEDED`/`NOT_ACTIVE` are link deaths the wizard has no distinct state
 * for; they collapse onto the terminal INVALID state.
 */
const toLinkDeath = async (response: Response): Promise<InviteLinkError> => {
    try {
        const reason = (await response.clone().json())?.reason;
        if (isInviteLinkErrorReason(reason)) {
            return new InviteLinkError(reason);
        }
    } catch {
        // No JSON body — fall through to the generic link death.
    }
    return new InviteLinkError('INVALID');
};

const toForwardError = async (error: unknown): Promise<unknown> => {
    if (!(error instanceof Response)) {
        return error;
    }
    // 400 deliberately has NO mapping of its own. It used to become
    // INVALID_EMAIL, which told the user their address was wrong for any
    // server-side rejection — the owner hit exactly that with a valid address
    // while the real cause was a missing APP_BASE_URL two services away. The
    // body is empty, so a 400 cannot be discriminated here anyway, and the
    // dialog already blocks malformed addresses client-side via { type: 'email' }.
    switch (error.status) {
        case 404:
            return new DpaForwardError('UNKNOWN_TOKEN');
        case 409:
            return new DpaForwardError('NO_DPA_PUBLISHED');
        case 429:
            return new DpaForwardError('TOO_MANY_LINKS');
        case 410:
            return toLinkDeath(error);
        default:
            return new DpaForwardError('TECHNICAL');
    }
};

// CATCH_ALL_SILENT: reject with the raw Response (no global toast) so the
// dialog can map statuses itself. FORBIDDEN_SILENT: never bounce a public
// visitor to the authenticated access-denied page.
const PUBLIC_RESPONSE_HANDLING = [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT];

const forwardUrl = (inviteToken: string) =>
    `${publicAccountInvitesEndpoint}/${encodeURIComponent(inviteToken)}/onboarding/dpa-forward`;

/**
 * Typed seam between the forward dialog and the backend. Rejects with
 * {@link InviteLinkError} on link death and {@link DpaForwardError} otherwise.
 */
export interface DpaForwardClient {
    /**
     * Creates a sign link and — when `recipientEmail` is present — sends the
     * `DPA_FORWARD` mail. Repeating the call issues a NEW link; every link
     * stays valid until a signature lands, at which point all of them die.
     */
    forward(inviteToken: string, request?: DpaForwardRequest): Promise<DpaForwardOutcome>;
}

/** Production client against the public UserService forward endpoint. */
export const createHttpDpaForwardClient = (): DpaForwardClient => {
    const call = (inviteToken: string, request: DpaForwardRequest) =>
        fetchData({
            url: forwardUrl(inviteToken),
            method: FETCH_METHODS.POST,
            skipAuth: true,
            responseHandling: [...PUBLIC_RESPONSE_HANDLING, FETCH_SUCCESS.CONTENT],
            bodyData: JSON.stringify(request),
        }) as Promise<{ signUrl: string; expiresAt?: string | null; mailSent?: boolean }>;

    const toLink = (dto: { signUrl: string; expiresAt?: string | null }): DpaForwardLink => ({
        signUrl: resolveDpaForwardSignLink(dto.signUrl),
        expiresAt: dto.expiresAt ?? null,
    });

    return {
        forward: async (inviteToken, request = {}) => {
            // The backend answers 200 with the link even when the mail could not
            // be delivered, flagging it as `mailSent: false`. The old 502 branch
            // fetched a link with a SECOND call — and every call mints a new
            // link, so a failed send cost two of the five allowed outstanding
            // links instead of none. The flag now travels in the first response.
            //
            // An older server omits `mailSent`. Reading that as "not sent" only
            // ever shows the copyable link; the opposite default would claim a
            // success that never happened and hide the link the user needs.
            const dto = await call(inviteToken, request).catch(async (error: unknown) => {
                throw await toForwardError(error);
            });
            return {
                link: toLink(dto),
                mailFailed: !!request.recipientEmail && dto.mailSent !== true,
            };
        },
    };
};

export interface StubDpaForwardOptions {
    /** Simulated network latency. Default 0 (tests); stories may raise it. */
    latencyMs?: number;
    /** Rejects every call with this failure kind. */
    failWith?: DpaForwardFailureKind;
    /** Mimics the 502 case: link created, mail not sent. */
    mailFails?: boolean;
    link?: Partial<DpaForwardLink>;
}

const STUB_LINK: DpaForwardLink = {
    signUrl: 'https://app.example.org/dpa-sign/stub-forward-token',
    expiresAt: '2026-08-29T14:31:07',
};

const wait = (ms: number) =>
    ms > 0
        ? new Promise<void>((resolve) => {
              setTimeout(resolve, ms);
          })
        : Promise.resolve();

/**
 * In-memory stand-in for tests and Storybook ONLY — never the production
 * default. Mirrors the contract where the UI depends on it: a fresh link per
 * call, the 502 link-created-but-mail-failed case, and the typed failures.
 */
export const createStubDpaForwardClient = (options: StubDpaForwardOptions = {}): DpaForwardClient => {
    const { latencyMs = 0, failWith, mailFails = false } = options;
    const link: DpaForwardLink = { ...STUB_LINK, ...options.link };

    return {
        forward: async (_inviteToken, request = {}) => {
            await wait(latencyMs);
            if (failWith) {
                throw new DpaForwardError(failWith);
            }
            return { link, mailFailed: mailFails && !!request.recipientEmail };
        },
    };
};
