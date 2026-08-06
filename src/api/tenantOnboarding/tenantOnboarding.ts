/**
 * Public tenant-admin onboarding client (TEN-INV U8, ORISO-Admin#571).
 *
 * Semantics (parent #569): the invite only RESERVED the tenant ID
 * (TenantService `/tenantadmin/tenant-ids/reservations`, U1). Completing this
 * flow creates the still-inactive tenant and consumes the reservation
 * atomically — the tenant is created with the reserved ID plus the matching
 * `tenantIdReservationToken` (see `MultilingualTenantDTO.tenantIdReservationToken`
 * in the TenantService API: a reserved ID without the matching token is
 * rejected with a conflict).
 *
 * The aggregated public endpoints live in UserService (U3/U6) under
 * {@link publicAccountInvitesEndpoint} (`…/{token}/onboarding[...]`, same
 * convention as the existing public `{token}/accept` endpoint); the page runs
 * against {@link createHttpTenantAdminOnboardingClient} in production.
 * {@link createStubTenantAdminOnboardingClient} exists for tests and Storybook
 * only and must never be the default on the public route. The request/response
 * shapes are pinned to the TenantService avv-fix contract:
 *  - `reservedTenantId`  ↔ `TenantIdReservationDTO.tenantId`
 *  - `tenantIdReservationToken` ↔ `TenantIdReservationDTO.token` (max 36 chars),
 *    passed through into the tenant-creating call as
 *    `MultilingualTenantDTO.tenantIdReservationToken`.
 */

import { publicAccountInvitesEndpoint } from '../../appConfig';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import { TwoFactorCodeInvalidError } from './TwoFactorCodeInvalidError';

/** Why an invite link cannot (or can no longer) be used. */
export type InviteLinkErrorReason = 'CONSUMED' | 'REVOKED' | 'EXPIRED' | 'INVALID';

/** The link is not usable — consumed, revoked, expired or unknown. */
export class InviteLinkError extends Error {
    readonly reason: InviteLinkErrorReason;

    constructor(reason: InviteLinkErrorReason) {
        super(`INVITE_LINK_${reason}`);
        this.reason = reason;
        Object.setPrototypeOf(this, InviteLinkError.prototype);
    }
}

export { TwoFactorCodeInvalidError };

/** Resolved state of a tenant-admin invite link, keyed by the raw invite token. */
export interface TenantAdminOnboardingInviteDTO {
    recipientEmail: string;
    firstName: string | null;
    lastName: string | null;
    /** The tenant ID the invite reserved (TenantIdReservationDTO.tenantId). */
    reservedTenantId: number;
    /**
     * TenantIdReservationDTO.token — proves ownership of the reservation and is
     * sent back on registration, where the backend forwards it as
     * MultilingualTenantDTO.tenantIdReservationToken so creation + consumption
     * happen atomically.
     */
    tenantIdReservationToken: string;
    /** ISO timestamp after which the link expires; null = no expiry. */
    expiresAt: string | null;
    /**
     * Published DPA/AVV text as stored by the tenant service: a JSON
     * language -> HTML map (or legacy plain HTML). Rendered read-only —
     * the wording is never authored in this flow.
     */
    dpaContent: string | null;
    /**
     * Onboarding phase per the UserService resume contract (#569 hardening):
     * `PENDING_2FA_ACTIVATION` = the invite was already accepted/registered
     * but the mandatory 2FA activation is still open — the flow re-enters at
     * the 2FA step instead of the CONSUMED dead end. Absent/undefined = the
     * registration has not happened yet (normal step 1 entry).
     */
    phase?: 'PENDING_2FA_ACTIVATION';
    /**
     * TOTP setup material re-issued for a resumable link (the raw token is
     * the only credential, so re-showing it to the token holder exposes
     * nothing new). `null`/absent when the backend does not re-issue it — the
     * 2FA step then renders the verify-only variant.
     */
    twoFactor?: { secret: string; qrCodeBase64: string | null } | null;
}

export interface OrganisationData {
    name: string;
    subdomain: string;
    address: string;
}

/** Mirrors the existing DpaSignature signer fields (src/types/dpa.ts). */
export interface DpaAcceptanceData {
    accepted: boolean;
    signerName: string;
    signerPosition: string;
    signerEmail: string;
    signerOrganisation: string;
}

export interface TenantAdminRegistrationRequest {
    organisation: OrganisationData;
    dpa: DpaAcceptanceData;
    account: {
        password: string;
    };
    /** Echoed reservation pair — see module docs for the TenantService mapping. */
    reservedTenantId: number;
    tenantIdReservationToken: string;
}

export interface TenantAdminRegistrationResultDTO {
    /** The created (inactive) tenant — equals the reserved ID. */
    tenantId: number;
    twoFactor: {
        /** Base32 TOTP secret to show/link in the authenticator app. */
        secret: string;
        /** QR code PNG (base64) when the backend provides one. */
        qrCodeBase64: string | null;
    };
}

/**
 * Typed seam between the public onboarding flow and the backend. Every method
 * rejects with {@link InviteLinkError} when the link is (or has become)
 * unusable — including a registration losing the race against a concurrent
 * consumption or revocation.
 */
export interface TenantAdminOnboardingClient {
    /** Resolves the invite state for a raw link token. */
    getOnboardingInvite(inviteToken: string): Promise<TenantAdminOnboardingInviteDTO>;
    /**
     * Creates the inactive tenant + admin account and consumes the ID
     * reservation atomically. A second call for the same invite MUST fail with
     * InviteLinkError('CONSUMED') — links are strictly single-use.
     */
    registerTenantAdmin(
        inviteToken: string,
        request: TenantAdminRegistrationRequest,
    ): Promise<TenantAdminRegistrationResultDTO>;
    /** Confirms the TOTP setup with a first one-time password. */
    activateTwoFactor(inviteToken: string, otp: string): Promise<void>;
}

/** Status → link-error mapping of the public onboarding endpoints (U3/U6). */
const LINK_ERROR_BY_STATUS: Record<number, InviteLinkErrorReason> = {
    404: 'INVALID',
    409: 'CONSUMED',
    410: 'EXPIRED',
    423: 'REVOKED',
};

const isInviteLinkErrorReason = (value: unknown): value is InviteLinkErrorReason =>
    value === 'CONSUMED' || value === 'REVOKED' || value === 'EXPIRED' || value === 'INVALID';

/**
 * Translates a rejected public-endpoint call into the typed client errors: an
 * explicit `reason` in the JSON error body wins, then the status mapping, and
 * everything else stays a generic (retryable) error — never a fake success.
 */
const toOnboardingError = async (error: unknown): Promise<unknown> => {
    if (!(error instanceof Response)) {
        return error;
    }
    let bodyReason: unknown;
    try {
        bodyReason = (await error.clone().json())?.reason;
    } catch {
        // No JSON error body — fall back to the status mapping.
    }
    if (isInviteLinkErrorReason(bodyReason)) {
        return new InviteLinkError(bodyReason);
    }
    const mapped = LINK_ERROR_BY_STATUS[error.status];
    if (mapped) {
        return new InviteLinkError(mapped);
    }
    return new Error(`TENANT_ONBOARDING_HTTP_${error.status}`);
};

const onboardingUrl = (inviteToken: string, suffix = '') =>
    `${publicAccountInvitesEndpoint}/${encodeURIComponent(inviteToken)}/onboarding${suffix}`;

/**
 * Resume probe against the REAL public accept endpoint (UserService #569
 * hardening contract): re-POSTing `/{token}/accept` while the accepted
 * invite's 2FA is still PENDING_SETUP answers an idempotent 200 with
 * `phase: "PENDING_2FA_ACTIVATION"` (no state written); terminal links stay
 * 410. Only called AFTER the resolve reported CONSUMED — probing an untouched
 * link here would consume it.
 */
const probeTwoFactorResume = async (inviteToken: string): Promise<TenantAdminOnboardingInviteDTO | null> => {
    try {
        const accept = await fetchData({
            url: `${publicAccountInvitesEndpoint}/${encodeURIComponent(inviteToken)}/accept`,
            method: FETCH_METHODS.POST,
            skipAuth: true,
            responseHandling: [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT, FETCH_SUCCESS.CONTENT],
            bodyData: JSON.stringify({}),
        });
        if (accept?.phase !== 'PENDING_2FA_ACTIVATION') {
            return null;
        }
        return {
            recipientEmail: accept.recipientEmail ?? '',
            firstName: accept.firstName ?? null,
            lastName: accept.lastName ?? null,
            reservedTenantId: accept.tenantId ?? 0,
            tenantIdReservationToken: '',
            expiresAt: accept.expiresAt ?? null,
            dpaContent: null,
            phase: 'PENDING_2FA_ACTIVATION',
            twoFactor: null,
        };
    } catch {
        // The probe is best-effort: any failure keeps the original CONSUMED.
        return null;
    }
};

// CATCH_ALL_SILENT: reject with the raw Response (no global toast) so the flow
// can map statuses itself. FORBIDDEN_SILENT: never bounce a public visitor to
// the authenticated /admin/access-denied page.
const PUBLIC_RESPONSE_HANDLING = [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT];

/**
 * Production client for the public tenant-admin onboarding endpoints
 * (UserService U3/U6). All calls are unauthenticated (`skipAuth`) — the whole
 * point of the flow is that the invitee has no account yet.
 */
export const createHttpTenantAdminOnboardingClient = (): TenantAdminOnboardingClient => {
    const run = async <T>(request: () => Promise<T>): Promise<T> => {
        try {
            return await request();
        } catch (error) {
            throw await toOnboardingError(error);
        }
    };

    return {
        getOnboardingInvite: async (inviteToken) => {
            try {
                return await run(() =>
                    fetchData({
                        url: onboardingUrl(inviteToken),
                        method: FETCH_METHODS.GET,
                        skipAuth: true,
                        responseHandling: PUBLIC_RESPONSE_HANDLING,
                    }),
                );
            } catch (error) {
                // CONSUMED may still be resumable (#569 resume contract):
                // probe the accept endpoint before declaring the dead end.
                if (error instanceof InviteLinkError && error.reason === 'CONSUMED') {
                    const resumable = await probeTwoFactorResume(inviteToken);
                    if (resumable) {
                        return resumable;
                    }
                }
                throw error;
            }
        },

        registerTenantAdmin: (inviteToken, request) =>
            run(() =>
                fetchData({
                    url: onboardingUrl(inviteToken, '/register'),
                    method: FETCH_METHODS.POST,
                    skipAuth: true,
                    responseHandling: [...PUBLIC_RESPONSE_HANDLING, FETCH_SUCCESS.CONTENT],
                    bodyData: JSON.stringify(request),
                }),
            ),

        activateTwoFactor: async (inviteToken, otp) => {
            try {
                await fetchData({
                    url: onboardingUrl(inviteToken, '/two-factor'),
                    method: FETCH_METHODS.POST,
                    skipAuth: true,
                    responseHandling: PUBLIC_RESPONSE_HANDLING,
                    bodyData: JSON.stringify({ otp }),
                });
            } catch (error) {
                // 400/422 = the entered one-time password was rejected;
                // link-death statuses keep their InviteLinkError mapping.
                if (error instanceof Response && (error.status === 400 || error.status === 422)) {
                    throw new TwoFactorCodeInvalidError();
                }
                throw await toOnboardingError(error);
            }
        },
    };
};

export interface StubTenantAdminOnboardingOptions {
    /**
     * Initial link state presented by the stub. Default: 'VALID'.
     * 'PENDING_2FA_ACTIVATION' = consumed-but-resumable (#569 resume
     * contract): the registration already happened, only the 2FA activation
     * is open.
     */
    inviteState?: 'VALID' | 'PENDING_2FA_ACTIVATION' | InviteLinkErrorReason;
    /** Simulated network latency. Default: 400ms (0 in tests). */
    latencyMs?: number;
    invite?: Partial<TenantAdminOnboardingInviteDTO>;
}

const STUB_INVITE: TenantAdminOnboardingInviteDTO = {
    recipientEmail: 'tenant.admin@example.org',
    firstName: 'Erika',
    lastName: 'Beispiel',
    reservedTenantId: 21,
    tenantIdReservationToken: '3f2c6d1e-8b1a-4b8e-9f47-stubreserved',
    expiresAt: null,
    dpaContent: JSON.stringify({
        de: '<h2>Auftragsverarbeitungsvertrag</h2><p>Platzhalter — der veröffentlichte AVV-Text des Betreibers wird hier unverändert angezeigt.</p>',
        en: '<h2>Data processing agreement</h2><p>Placeholder — the operator’s published DPA text is rendered here unchanged.</p>',
    }),
};

/** OTP the stub rejects, to make the invalid-code state reachable in demos. */
export const STUB_REJECTED_OTP = '000000';

const wait = (ms: number) =>
    ms > 0
        ? new Promise<void>((resolve) => {
              setTimeout(resolve, ms);
          })
        : Promise.resolve();

/**
 * In-memory stand-in for the U3/U6 UserService endpoints — for unit tests and
 * Storybook ONLY, never the production default (the public route uses
 * {@link createHttpTenantAdminOnboardingClient}). Behaves like the real
 * contract where it matters for the UI: single-use links, atomic consumption
 * (a second registration attempt gets CONSUMED), reservation-token echo
 * validation, and a deterministic invalid OTP ({@link STUB_REJECTED_OTP}).
 */
export const createStubTenantAdminOnboardingClient = (
    options: StubTenantAdminOnboardingOptions = {},
): TenantAdminOnboardingClient => {
    const { inviteState = 'VALID', latencyMs = 400 } = options;
    const invite: TenantAdminOnboardingInviteDTO = { ...STUB_INVITE, ...options.invite };
    // Registered = the single-use registration happened; the link stays
    // resumable at the 2FA step until the activation succeeds (#569 resume
    // contract). Only then is the link terminally consumed.
    let registered = inviteState === 'PENDING_2FA_ACTIVATION';
    let twoFactorActivated = inviteState === 'CONSUMED';

    const STUB_TWO_FACTOR = {
        secret: 'ORISOSTUBTOTPSECRET234567ABCDEFG',
        qrCodeBase64: null,
    };

    const assertLinkAlive = (inviteToken: string) => {
        if (!inviteToken) {
            throw new InviteLinkError('INVALID');
        }
        if (inviteState === 'REVOKED' || inviteState === 'EXPIRED' || inviteState === 'INVALID') {
            throw new InviteLinkError(inviteState);
        }
        if (twoFactorActivated) {
            // Resume window closed — terminally consumed.
            throw new InviteLinkError('CONSUMED');
        }
    };

    return {
        getOnboardingInvite: async (inviteToken) => {
            await wait(latencyMs);
            assertLinkAlive(inviteToken);
            if (registered) {
                return { ...invite, phase: 'PENDING_2FA_ACTIVATION', twoFactor: STUB_TWO_FACTOR };
            }
            return invite;
        },

        registerTenantAdmin: async (inviteToken, request) => {
            await wait(latencyMs);
            assertLinkAlive(inviteToken);
            if (registered) {
                // Single-use: a second registration attempt loses; re-entry
                // happens via getOnboardingInvite's PENDING_2FA_ACTIVATION.
                throw new InviteLinkError('CONSUMED');
            }
            if (
                request.tenantIdReservationToken !== invite.tenantIdReservationToken ||
                request.reservedTenantId !== invite.reservedTenantId
            ) {
                // The real TenantService rejects a reserved ID without the
                // matching token with a conflict — surfaced as an unusable link.
                throw new InviteLinkError('INVALID');
            }
            if (!request.dpa.accepted) {
                throw new Error('DPA_NOT_ACCEPTED');
            }
            registered = true;
            return {
                tenantId: invite.reservedTenantId,
                twoFactor: STUB_TWO_FACTOR,
            };
        },

        activateTwoFactor: async (inviteToken, otp) => {
            await wait(latencyMs);
            assertLinkAlive(inviteToken);
            if (!/^\d{6}$/.test(otp) || otp === STUB_REJECTED_OTP) {
                throw new TwoFactorCodeInvalidError();
            }
            twoFactorActivated = true;
        },
    };
};
