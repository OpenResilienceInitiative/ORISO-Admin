import { useCallback, useEffect, useRef, useState } from 'react';
import { type CounsellorAvatarValue, normaliseAvatarValue } from '../../utils/counsellorAvatar';
import {
    CounsellorOnboardingClient,
    CounsellorOnboardingInviteDTO,
    CounsellorRegistrationRequest,
    CounsellorTopicPermission,
    InviteLinkError,
    InviteLinkErrorReason,
    TwoFactorCodeInvalidError,
} from '../../api/counsellorOnboarding/counsellorOnboarding';

/**
 * Data the 2FA step runs on. `twoFactor` is `null` when a resumed link did not
 * re-issue the setup material — the step then renders verify-only.
 */
export interface CounsellorTwoFactorStepData {
    twoFactor: { secret: string; qrCodeBase64: string | null } | null;
    /** True when the step was entered by resuming a consumed-but-2FA-pending link. */
    resumed: boolean;
}

/**
 * Flow state of the public counsellor onboarding wizard (#997). Same contract
 * as the tenant-admin flow (`useTenantAdminOnboardingFlow`):
 *
 * - `link-error` is terminal (consumed/revoked/expired/unknown links render a
 *   distinct error state; a dead link can never be resubmitted).
 * - `load-error` is NOT terminal — transient resolve failures retry.
 * - Resume: `phase: PENDING_2FA_ACTIVATION` re-enters directly at the 2FA step.
 * - A registration answering `phase: COMPLETED` (waived 2FA gate) skips the
 *   2FA step and lands on `done` directly.
 */
export type CounsellorOnboardingState =
    | { phase: 'loading' }
    | { phase: 'load-error' }
    | { phase: 'link-error'; reason: InviteLinkErrorReason }
    | { phase: 'form' }
    | { phase: 'two-factor'; result: CounsellorTwoFactorStepData }
    | { phase: 'done' };

/** Which submit failed retryably; link-death is modelled in the state instead. */
export type CounsellorOnboardingSubmitError = 'registration' | 'two-factor-code' | 'two-factor' | null;

/** Everything the wizard collects across its form steps. */
export interface CounsellorWizardData {
    account: { username: string; password: string };
    person: { salutation?: string; position: string; title: string };
    names: { publicName: string; internalName: string };
    /** #1046/#1047: the avatar step is on. Empty = no choice made yet. */
    avatar: CounsellorAvatarValue;
    topicIds: number[];
    /** Only collected when the invite creates a new agency (`invite.agencyExists === false`). */
    agency: { name: string };
    /** Agency-admin invites only: "Berät auch", prefilled with the inviter's proposal. */
    alsoCounsellor: boolean;
}

const EMPTY_DATA: CounsellorWizardData = {
    account: { username: '', password: '' },
    person: { salutation: undefined, position: '', title: '' },
    names: { publicName: '', internalName: '' },
    avatar: {},
    topicIds: [],
    agency: { name: '' },
    alsoCounsellor: true,
};

/** An agency-admin invite runs this wizard with the "Berät auch" switch. */
export const isAgencyAdminInvite = (invite: Pick<CounsellorOnboardingInviteDTO, 'targetRole'> | null | undefined) =>
    invite?.targetRole === 'AGENCY_ADMIN';

/** Whether the invitee ends up counselling: always for a counsellor invite, by choice for an agency admin. */
export const counsels = (
    invite: CounsellorOnboardingInviteDTO | null,
    data: Pick<CounsellorWizardData, 'alsoCounsellor'>,
) => !isAgencyAdminInvite(invite) || data.alsoCounsellor;

/** An agency admin always gets CREATE: they administer or found the agency and bring its topics. */
export const effectiveTopicPermission = (
    invite: Pick<CounsellorOnboardingInviteDTO, 'targetRole' | 'topicPermission'>,
): CounsellorTopicPermission => (invite.targetRole === 'AGENCY_ADMIN' ? 'CREATE' : invite.topicPermission ?? 'CREATE');

/** `CREATE` preselects the whole coverage; otherwise a lone agency topic or the assigned department. */
export const initialTopicSelection = (invite: CounsellorOnboardingInviteDTO): number[] => {
    const coverage = invite.topics.map((topic) => topic.id);
    if (effectiveTopicPermission(invite) === 'CREATE') {
        return coverage;
    }
    if (coverage.length === 1) {
        return coverage;
    }
    return invite.departmentId != null && coverage.includes(invite.departmentId) ? [invite.departmentId] : [];
};

/** Single source: the shared consultant credential policy (also used by the admin form). */
export { PASSWORD_MIN_LENGTH as MIN_PASSWORD_LENGTH } from '../../utils/consultantCredentialRules';

export const useCounsellorOnboardingFlow = (inviteToken: string, client: CounsellorOnboardingClient) => {
    const [state, setState] = useState<CounsellorOnboardingState>({ phase: 'loading' });
    const [invite, setInvite] = useState<CounsellorOnboardingInviteDTO | null>(null);
    const [data, setData] = useState<CounsellorWizardData>(EMPTY_DATA);
    const [submitError, setSubmitError] = useState<CounsellorOnboardingSubmitError>(null);
    const [busy, setBusy] = useState(false);
    // Bumping re-runs the resolve effect — the retry for transient load failures.
    const [loadAttempt, setLoadAttempt] = useState(0);

    // Read through refs inside the async submits so a stale closure can never
    // resubmit a flow that has meanwhile hit a terminal state, and an
    // in-flight submit can never be doubled by a second click.
    const stateRef = useRef(state);
    stateRef.current = state;
    const busyRef = useRef(false);
    // Submits read the freshest collected data through a ref — the callbacks
    // stay stable while every keystroke updates `data`.
    const dataRef = useRef(data);
    dataRef.current = data;
    const inviteRef = useRef(invite);
    inviteRef.current = invite;

    useEffect(() => {
        let cancelled = false;

        if (!inviteToken) {
            setState({ phase: 'link-error', reason: 'INVALID' });
            return undefined;
        }

        setState({ phase: 'loading' });
        client
            .getOnboardingInvite(inviteToken)
            .then((loaded) => {
                if (cancelled) return;
                setInvite(loaded);
                if (loaded.phase === 'PENDING_2FA_ACTIVATION') {
                    // Resume (#569 contract): the registration already
                    // happened; only the 2FA activation is open.
                    setState({
                        phase: 'two-factor',
                        result: { twoFactor: loaded.twoFactor ?? null, resumed: true },
                    });
                    return;
                }
                // Every resolve starts from a clean sheet: a token switch must not
                // carry a previous invite's topics or agency name into this one.
                // The invite's coverage arrives preselected (owner decision
                // 2026-09-17): the invitee removes chips or adds further tenant
                // topics instead of starting from an empty selection.
                setData({
                    ...EMPTY_DATA,
                    topicIds: initialTopicSelection(loaded),
                    // The inviter's proposal; the backend default is "also counsels".
                    alsoCounsellor: loaded.alsoCounsellor ?? true,
                });
                setState({ phase: 'form' });
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                if (error instanceof InviteLinkError) {
                    setState({ phase: 'link-error', reason: error.reason });
                    return;
                }
                // Transient failure (network, 5xx): retryable, NOT "invalid".
                setState({ phase: 'load-error' });
            });

        return () => {
            cancelled = true;
        };
        // The invite is resolved once per token/attempt; the client is stable by contract.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inviteToken, loadAttempt]);

    const retryLoad = useCallback(() => {
        if (stateRef.current.phase !== 'load-error') {
            return;
        }
        setLoadAttempt((attempt) => attempt + 1);
    }, []);

    const updateAccount = useCallback((patch: Partial<CounsellorWizardData['account']>) => {
        setData((current) => ({ ...current, account: { ...current.account, ...patch } }));
    }, []);

    const updatePerson = useCallback((patch: Partial<CounsellorWizardData['person']>) => {
        setData((current) => ({ ...current, person: { ...current.person, ...patch } }));
    }, []);

    const updateNames = useCallback((patch: Partial<CounsellorWizardData['names']>) => {
        setData((current) => ({ ...current, names: { ...current.names, ...patch } }));
    }, []);

    const updateAvatar = useCallback((avatar: CounsellorAvatarValue) => {
        setData((current) => ({ ...current, avatar }));
    }, []);

    const updateAgency = useCallback((patch: Partial<CounsellorWizardData['agency']>) => {
        setData((current) => ({ ...current, agency: { ...current.agency, ...patch } }));
    }, []);

    const setAlsoCounsellor = useCallback((alsoCounsellor: boolean) => {
        setData((current) => ({ ...current, alsoCounsellor }));
    }, []);

    /** Replaces the whole selection — the multi-select reports its full value on every change. */
    const setTopics = useCallback((topicIds: number[]) => {
        setData((current) => ({ ...current, topicIds }));
    }, []);

    const toggleTopic = useCallback((topicId: number) => {
        setData((current) => ({
            ...current,
            topicIds: current.topicIds.includes(topicId)
                ? current.topicIds.filter((id) => id !== topicId)
                : [...current.topicIds, topicId],
        }));
    }, []);

    const failFlow = (error: unknown, retryable: Exclude<CounsellorOnboardingSubmitError, null>) => {
        if (error instanceof InviteLinkError) {
            setState({ phase: 'link-error', reason: error.reason });
            return;
        }
        setSubmitError(retryable);
    };

    const submitRegistration = useCallback(async () => {
        if (stateRef.current.phase !== 'form' || busyRef.current) {
            return;
        }
        busyRef.current = true;
        setBusy(true);
        setSubmitError(null);
        try {
            const { account, person, names, avatar, topicIds, agency, alsoCounsellor } = dataRef.current;
            const agencyAdmin = isAgencyAdminInvite(inviteRef.current);
            // An agency admin who does not counsel gets a login only: no consultant profile, no topics.
            const withProfile = !agencyAdmin || alsoCounsellor;
            // Normalises a half choice away; `{}` (no choice) sends no avatar block at all.
            const { avatarKind, avatarId } = normaliseAvatarValue(avatar);
            const createsAgency = inviteRef.current?.agencyExists === false;
            const request: CounsellorRegistrationRequest = {
                account: { username: account.username.trim(), password: account.password },
                person: withProfile
                    ? {
                          salutation: person.salutation,
                          position: person.position.trim() || undefined,
                          title: person.title.trim() || undefined,
                      }
                    : {},
                names: withProfile
                    ? {
                          publicName: names.publicName.trim() || undefined,
                          internalDisplayName: names.internalName.trim() || undefined,
                      }
                    : {},
                ...(withProfile && avatarKind
                    ? { avatar: { kind: avatarKind, ...(avatarId ? { id: avatarId } : {}) } }
                    : {}),
                topicIds: withProfile ? topicIds : [],
                ...(agencyAdmin ? { alsoCounsellor } : {}),
                // Present only for a reserved (not yet existing) agency — the
                // backend rejects the field for an existing one.
                ...(createsAgency ? { agency: { name: agency.name.trim() } } : {}),
            };
            const result = await client.registerCounsellor(inviteToken, request);
            if (result.phase === 'COMPLETED') {
                // 2FA gate waived by the inviting admin — nothing left to set up.
                setState({ phase: 'done' });
                return;
            }
            setState({
                phase: 'two-factor',
                result: { twoFactor: result.twoFactor, resumed: false },
            });
        } catch (error) {
            failFlow(error, 'registration');
        } finally {
            busyRef.current = false;
            setBusy(false);
        }
    }, [client, inviteToken]);

    const submitTwoFactorCode = useCallback(
        async (otp: string) => {
            if (stateRef.current.phase !== 'two-factor' || busyRef.current) {
                return;
            }
            busyRef.current = true;
            setBusy(true);
            setSubmitError(null);
            try {
                await client.activateTwoFactor(inviteToken, otp);
                setState({ phase: 'done' });
            } catch (error) {
                if (error instanceof TwoFactorCodeInvalidError) {
                    setSubmitError('two-factor-code');
                } else {
                    failFlow(error, 'two-factor');
                }
            } finally {
                busyRef.current = false;
                setBusy(false);
            }
        },
        [client, inviteToken],
    );

    return {
        state,
        invite,
        data,
        submitError,
        busy,
        retryLoad,
        updateAccount,
        updatePerson,
        updateNames,
        updateAvatar,
        updateAgency,
        setTopics,
        toggleTopic,
        setAlsoCounsellor,
        submitRegistration,
        submitTwoFactorCode,
    };
};
