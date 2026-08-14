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

/** Everything the wizard collects across its form steps. */
export interface CounsellorWizardData {
    account: { username: string; password: string };
    person: { salutation?: string; position: string; title: string };
    names: { publicName: string; internalName: string };
    topicIds: number[];
}

const EMPTY_DATA: CounsellorWizardData = {
    account: { username: '', password: '' },
    person: { salutation: undefined, position: '', title: '' },
    names: { publicName: '', internalName: '' },
    topicIds: [],
};

/** Backend password floor (UserService MIN_PASSWORD_LENGTH); Keycloak enforces the full policy. */
export const MIN_PASSWORD_LENGTH = 8;

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
                // A single covered topic is preselected — it is the routed
                // department and the only possible choice.
                if (loaded.topics.length === 1) {
                    setData((current) => ({ ...current, topicIds: [loaded.topics[0].id] }));
                }
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
            const { account, person, names, topicIds } = dataRef.current;
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
        toggleTopic,
        submitRegistration,
        submitTwoFactorCode,
    };
};
