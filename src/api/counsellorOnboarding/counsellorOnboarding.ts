/**
 * Public counsellor onboarding client (#997 — Admin-side wizard for COUNSELLOR
 * invites, sibling of `src/api/tenantOnboarding/tenantOnboarding.ts`).
 *
 * The UserService endpoints are the SAME public onboarding routes the
 * tenant-admin flow uses (`…/{token}/onboarding[...]`): the invite's target
 * role decides server-side which flow answers, and the resolve response
 * carries `targetRole` plus the counsellor prefill data (email, names, the
 * invite's tenant/agency/department routing and the topic coverage the topic
 * step may offer).
 *
 * Registration creates the consultant through the exact same domain path as
 * the normal admin creation (UserService `CounsellorInviteProvisioningService`
 * → `CreateConsultantSaga`); the wizard owns no write path of its own.
 * Link-death and resume semantics are identical to the tenant flow: 410 with a
 * machine-readable `reason` body (unknown tokens 404), and a consumed link
 * stays resumable at the 2FA step while the mandatory activation is pending
 * (`phase: PENDING_2FA_ACTIVATION`).
 */

import { publicAccountInvitesEndpoint } from '../../appConfig';
import type { CounsellorAvatarKind } from '../../utils/counsellorAvatar';
import { FETCH_ERRORS, FETCH_METHODS, FETCH_SUCCESS, fetchData } from '../fetchData';
import { InviteLinkError, InviteLinkErrorReason } from '../tenantOnboarding/tenantOnboarding';
import { TwoFactorCodeInvalidError } from '../tenantOnboarding/TwoFactorCodeInvalidError';

export { InviteLinkError, TwoFactorCodeInvalidError };
export type { InviteLinkErrorReason };

/** A selectable topic of the invite's department/agency coverage. */
export interface CounsellorTopicOption {
    id: number;
    /** May be null when the backend could not resolve the topic name. */
    name: string | null;
}

/** CREATE: "+" adds Träger topics. SELECT_EXISTING: agency topics only. NONE: assigned one, else exactly one. */
export type CounsellorTopicPermission = 'NONE' | 'SELECT_EXISTING' | 'CREATE';

/** Resolved state of a counsellor invite link, keyed by the raw invite token. */
export interface CounsellorOnboardingInviteDTO {
    recipientEmail: string;
    firstName: string | null;
    lastName: string | null;
    tenantId: number | null;
    agencyId: number | null;
    departmentId: number | null;
    /** Topics the wizard's topic step may offer (at least the routed department topic). */
    topics: CounsellorTopicOption[];
    /**
     * `false` when the invite's Beratungsstellen-ID is still a reservation: the
     * agency does not exist yet and is created on registration with the invitee
     * as its owner (the composer's "new agency" case). Absent = existing agency.
     */
    agencyExists?: boolean;
    /**
     * The tenant's active topics. The invitee may ADD any of them to the
     * preselected coverage (owner decision 2026-09-17: a counsellor must be able
     * to pick further topics, not only the routed ones). Absent/empty = only the
     * coverage is selectable.
     */
    availableTopics?: CounsellorTopicOption[];
    /** Absent (older backend) means `CREATE`. */
    topicPermission?: CounsellorTopicPermission;
    /** ISO timestamp after which the link expires; null = no expiry. */
    expiresAt: string | null;
    /**
     * `PENDING_2FA_ACTIVATION` = registration already happened, only the 2FA
     * activation is open — the wizard re-enters at the 2FA step (#569 resume
     * contract). Absent = normal step 1 entry.
     */
    phase?: 'PENDING_2FA_ACTIVATION';
    /** TOTP setup material re-issued for a resumable link (secret-only re-entry). */
    twoFactor?: { secret: string; qrCodeBase64: string | null } | null;
}

export interface CounsellorRegistrationRequest {
    account: {
        username: string;
        password: string;
    };
    person: {
        /** Stable #994 salutation key (e.g. `counsellor_female`); optional. */
        salutation?: string;
        position?: string;
        title?: string;
    };
    names: {
        /** PUBLIC display name shown to advice seekers. */
        publicName?: string;
        /** Internal display name; internal surfaces fall back to the public name. */
        internalDisplayName?: string;
    };
    /**
     * The chosen counsellor avatar (#1046/#1047). Omitted when the invitee made
     * no choice — the backend then stores none and rendering falls back to the
     * initials. `id` is the motif id and is only present for `kind: 'ICON'`.
     * `PICTURE` is the reserved kind of #1048/#1049; the wizard cannot pick it yet.
     */
    avatar?: { kind: CounsellorAvatarKind; id?: string };
    /** Chosen topics — validated server-side against coverage ∪ tenant topics. */
    topicIds: number[];
    /**
     * Only for invites whose agency does not exist yet (`agencyExists === false`):
     * the new Beratungsstelle is created with this name and the chosen topics
     * as its departments; the invitee becomes its owner.
     */
    agency?: { name: string };
}

export interface CounsellorRegistrationResultDTO {
    /** The created consultant (identical to a consultant created via the admin form). */
    consultantId: string;
    /**
     * `PENDING_2FA_ACTIVATION` → continue with the 2FA step; `COMPLETED` → the
     * invite's 2FA gate was waived and the wizard skips the 2FA step.
     */
    phase: 'PENDING_2FA_ACTIVATION' | 'COMPLETED';
    twoFactor: { secret: string; qrCodeBase64: string | null } | null;
}

/**
 * Typed seam between the wizard and the backend. Every method rejects with
 * {@link InviteLinkError} when the link is (or has become) unusable.
 */
export interface CounsellorOnboardingClient {
    getOnboardingInvite(inviteToken: string): Promise<CounsellorOnboardingInviteDTO>;
    /** Creates the consultant; strictly single-use (a second call answers CONSUMED). */
    registerCounsellor(
        inviteToken: string,
        request: CounsellorRegistrationRequest,
    ): Promise<CounsellorRegistrationResultDTO>;
    /** Confirms the TOTP setup with a first one-time password. */
    activateTwoFactor(inviteToken: string, otp: string): Promise<void>;
}

/** Status → link-error mapping of the public onboarding endpoints. */
const LINK_ERROR_BY_STATUS: Record<number, InviteLinkErrorReason> = {
    404: 'INVALID',
    409: 'CONSUMED',
    410: 'EXPIRED',
    423: 'REVOKED',
};

const isInviteLinkErrorReason = (value: unknown): value is InviteLinkErrorReason =>
    value === 'CONSUMED' || value === 'REVOKED' || value === 'EXPIRED' || value === 'SUPERSEDED' || value === 'INVALID';

/** Body-first error mapping — an explicit `reason` wins over the status code. */
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
    return new Error(`COUNSELLOR_ONBOARDING_HTTP_${error.status}`);
};

const onboardingUrl = (inviteToken: string, suffix = '') =>
    `${publicAccountInvitesEndpoint}/${encodeURIComponent(inviteToken)}/onboarding${suffix}`;

// CATCH_ALL_SILENT: reject with the raw Response (no global toast) so the flow
// maps statuses itself. FORBIDDEN_SILENT: never bounce a public visitor to the
// authenticated /admin/access-denied page.
const PUBLIC_RESPONSE_HANDLING = [FETCH_ERRORS.CATCH_ALL_SILENT, FETCH_ERRORS.FORBIDDEN_SILENT];

/** Production client for the public counsellor onboarding endpoints — all calls unauthenticated. */
export const createHttpCounsellorOnboardingClient = (): CounsellorOnboardingClient => {
    const run = async <T>(request: () => Promise<T>): Promise<T> => {
        try {
            return await request();
        } catch (error) {
            throw await toOnboardingError(error);
        }
    };

    return {
        getOnboardingInvite: (inviteToken) =>
            run(async () => {
                const invite = await fetchData({
                    url: onboardingUrl(inviteToken),
                    method: FETCH_METHODS.GET,
                    skipAuth: true,
                    responseHandling: PUBLIC_RESPONSE_HANDLING,
                });
                return {
                    ...invite,
                    topics: invite.topics ?? [],
                    availableTopics: invite.availableTopics ?? [],
                    topicPermission: invite.topicPermission ?? 'CREATE',
                };
            }),

        registerCounsellor: (inviteToken, request) =>
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

export interface StubCounsellorOnboardingOptions {
    /** Initial link state presented by the stub. Default: 'VALID'. */
    inviteState?: 'VALID' | 'PENDING_2FA_ACTIVATION' | InviteLinkErrorReason;
    /** Simulated network latency. Default: 400ms (0 in tests). */
    latencyMs?: number;
    invite?: Partial<CounsellorOnboardingInviteDTO>;
    /** `COMPLETED` simulates a waived 2FA gate (the wizard skips the 2FA step). */
    registrationPhase?: 'PENDING_2FA_ACTIVATION' | 'COMPLETED';
}

const STUB_INVITE: CounsellorOnboardingInviteDTO = {
    recipientEmail: 'lena.beraterin@example.org',
    firstName: 'Lena',
    lastName: 'Beispiel',
    tenantId: 21,
    agencyId: 5,
    departmentId: 12,
    topics: [
        { id: 12, name: 'Familienberatung' },
        { id: 13, name: 'Schuldnerberatung' },
    ],
    availableTopics: [
        { id: 12, name: 'Familienberatung' },
        { id: 13, name: 'Schuldnerberatung' },
        { id: 14, name: 'Suchtberatung' },
        { id: 15, name: 'Schwangerschaftsberatung' },
        { id: 16, name: 'Migrationsberatung' },
    ],
    expiresAt: null,
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
 * In-memory stand-in for the public endpoints — for unit tests and Storybook
 * ONLY, never the production default. Behaves like the real contract where it
 * matters for the UI: single-use links, topic-coverage validation, the resume
 * contract, and a deterministic invalid OTP ({@link STUB_REJECTED_OTP}).
 */
export const createStubCounsellorOnboardingClient = (
    options: StubCounsellorOnboardingOptions = {},
): CounsellorOnboardingClient => {
    const { inviteState = 'VALID', latencyMs = 400, registrationPhase = 'PENDING_2FA_ACTIVATION' } = options;
    const invite: CounsellorOnboardingInviteDTO = { ...STUB_INVITE, ...options.invite };
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

        registerCounsellor: async (inviteToken, request) => {
            await wait(latencyMs);
            assertLinkAlive(inviteToken);
            if (registered) {
                // Single-use: re-entry happens via getOnboardingInvite's resume phase.
                throw new InviteLinkError('CONSUMED');
            }
            if (!request.account.username || !request.account.password) {
                throw new Error('ACCOUNT_DATA_MISSING');
            }
            // Like the backend: coverage plus — with CREATE only — every active tenant topic.
            const permission = invite.topicPermission ?? 'CREATE';
            const selectable =
                permission === 'CREATE' ? [...invite.topics, ...(invite.availableTopics ?? [])] : invite.topics;
            const coveredIds = new Set(selectable.map(({ id }) => id));
            if (request.topicIds.length === 0 || request.topicIds.some((id) => !coveredIds.has(id))) {
                throw new Error('TOPICS_OUTSIDE_COVERAGE');
            }
            if (permission === 'NONE' && invite.departmentId == null && request.topicIds.length > 1) {
                throw new Error('EXACTLY_ONE_TOPIC');
            }
            if (invite.agencyExists === false && !request.agency?.name?.trim()) {
                throw new Error('AGENCY_NAME_MISSING');
            }
            if (request.avatar?.kind === 'ICON' && !request.avatar.id) {
                // Like the backend: a motif choice without a motif is not a choice.
                throw new Error('AVATAR_MOTIF_MISSING');
            }
            registered = true;
            if (registrationPhase === 'COMPLETED') {
                twoFactorActivated = true;
                return { consultantId: 'stub-consultant-id', phase: 'COMPLETED', twoFactor: null };
            }
            return {
                consultantId: 'stub-consultant-id',
                phase: 'PENDING_2FA_ACTIVATION',
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
