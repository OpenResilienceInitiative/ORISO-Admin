import { useCallback, useEffect, useRef, useState } from 'react';
import {
    CounsellorOnboardingClient,
    CounsellorOnboardingInviteDTO,
    CounsellorRegistrationRequest,
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

/**
 * Issue #1049: the photo is stored AFTER the account exists, so a refused photo must never take
 * the created account down with it. A failure is reported next to the following step instead, and
 * the counsellor can add the photo later from their profile.
 */
export type CounsellorOnboardingPictureError = 'upload' | 'visibility' | null;

/** Everything the wizard collects across its form steps. */
export interface CounsellorWizardData {
    account: { username: string; password: string };
    person: { salutation?: string; position: string; title: string };
    names: { publicName: string; internalName: string };
    /** Issue #1049: the counsellor's own photo, internal unless they publish it. */
    picture: { file: File | null; publicToAdviceSeekers: boolean };
    topicIds: number[];
    /** Only collected when the invite creates a new agency (`invite.agencyExists === false`). */
    agency: { name: string };
}

const EMPTY_DATA: CounsellorWizardData = {
    account: { username: '', password: '' },
    person: { salutation: undefined, position: '', title: '' },
    names: { publicName: '', internalName: '' },
    picture: { file: null, publicToAdviceSeekers: false },
    topicIds: [],
    agency: { name: '' },
};

/** Single source: the shared consultant credential policy (also used by the admin form). */
export { PASSWORD_MIN_LENGTH as MIN_PASSWORD_LENGTH } from '../../utils/consultantCredentialRules';

export const useCounsellorOnboardingFlow = (inviteToken: string, client: CounsellorOnboardingClient) => {
    const [state, setState] = useState<CounsellorOnboardingState>({ phase: 'loading' });
    const [invite, setInvite] = useState<CounsellorOnboardingInviteDTO | null>(null);
    const [data, setData] = useState<CounsellorWizardData>(EMPTY_DATA);
    const [submitError, setSubmitError] = useState<CounsellorOnboardingSubmitError>(null);
    const [pictureError, setPictureError] = useState<CounsellorOnboardingPictureError>(null);
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
                setData({ ...EMPTY_DATA, topicIds: loaded.topics.map((topic) => topic.id) });
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

    const updatePicture = useCallback((patch: Partial<CounsellorWizardData['picture']>) => {
        setData((current) => ({ ...current, picture: { ...current.picture, ...patch } }));
    }, []);

    const updateAgency = useCallback((patch: Partial<CounsellorWizardData['agency']>) => {
        setData((current) => ({ ...current, agency: { ...current.agency, ...patch } }));
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

    const storePicture = useCallback(
        async (picture: CounsellorWizardData['picture']) => {
            if (!picture.file) return;
            try {
                await client.uploadOnboardingPicture(inviteToken, picture.file);
            } catch (error) {
                if (error instanceof InviteLinkError) throw error;
                setPictureError('upload');
                return;
            }
            if (!picture.publicToAdviceSeekers) return;
            try {
                await client.setOnboardingPictureVisibility(inviteToken, false);
            } catch (error) {
                if (error instanceof InviteLinkError) throw error;
                // The photo is stored and safely internal; only publishing it did not take.
                setPictureError('visibility');
            }
        },
        [client, inviteToken],
    );

    const submitRegistration = useCallback(async () => {
        if (stateRef.current.phase !== 'form' || busyRef.current) {
            return;
        }
        busyRef.current = true;
        setBusy(true);
        setSubmitError(null);
        setPictureError(null);
        try {
            const { account, person, names, topicIds, agency } = dataRef.current;
            const createsAgency = inviteRef.current?.agencyExists === false;
            const request: CounsellorRegistrationRequest = {
                account: { username: account.username.trim(), password: account.password },
                person: {
                    salutation: person.salutation,
                    position: person.position.trim() || undefined,
                    title: person.title.trim() || undefined,
                },
                names: {
                    publicName: names.publicName.trim() || undefined,
                    internalDisplayName: names.internalName.trim() || undefined,
                },
                topicIds,
                // Present only for a reserved (not yet existing) agency — the
                // backend rejects the field for an existing one.
                ...(createsAgency ? { agency: { name: agency.name.trim() } } : {}),
            };
            const result = await client.registerCounsellor(inviteToken, request);
            // The account now exists. Storing the photo is a separate step whose failure is
            // reported but never rolls the registration back or blocks the 2FA setup.
            await storePicture(dataRef.current.picture);
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
    }, [client, inviteToken, storePicture]);

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
        pictureError,
        busy,
        retryLoad,
        updateAccount,
        updatePerson,
        updateNames,
        updatePicture,
        updateAgency,
        setTopics,
        toggleTopic,
        submitRegistration,
        submitTwoFactorCode,
    };
};
