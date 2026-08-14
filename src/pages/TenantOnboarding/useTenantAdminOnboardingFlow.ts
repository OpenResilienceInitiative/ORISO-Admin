import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DpaAcceptanceData,
    InviteLinkError,
    InviteLinkErrorReason,
    OrganisationData,
    TenantAdminOnboardingClient,
    TenantAdminOnboardingInviteDTO,
} from '../../api/tenantOnboarding/tenantOnboarding';
import { TwoFactorCodeInvalidError } from '../../api/tenantOnboarding/TwoFactorCodeInvalidError';

/**
 * Data the 2FA step runs on. `twoFactor` is `null` when a resumed link did
 * not re-issue the setup material — the step then renders verify-only.
 */
export interface TwoFactorStepData {
    tenantId: number;
    twoFactor: { secret: string; qrCodeBase64: string | null } | null;
    /** True when the step was entered by resuming a consumed-but-2FA-pending link. */
    resumed: boolean;
}

/**
 * Flow state of the public tenant-admin onboarding (TEN-INV U8, #571).
 *
 * `link-error` is terminal: consumed/revoked/expired/unknown links render a
 * distinct error state and every further submit is a no-op — a dead link can
 * never be resubmitted, also not when the invite dies mid-flow (registration
 * losing a race against a concurrent consumption/revocation).
 *
 * `load-error` is NOT terminal (#569 hardening): a transient failure while
 * resolving the link (network down, 5xx) must not masquerade as "link
 * invalid" — it renders a retryable error instead.
 *
 * Resume (#569 hardening): when the resolve reports
 * `phase: PENDING_2FA_ACTIVATION`, the registration already happened and the
 * flow re-enters directly at the 2FA step.
 */
export type TenantAdminOnboardingState =
    | { phase: 'loading' }
    | { phase: 'load-error' }
    | { phase: 'link-error'; reason: InviteLinkErrorReason }
    | { phase: 'organisation' }
    | { phase: 'account' }
    | { phase: 'two-factor'; result: TwoFactorStepData }
    | { phase: 'done'; tenantId: number };

/** Which submit failed retryably; link-death is modelled in the state instead. */
export type TenantAdminOnboardingSubmitError = 'registration' | 'two-factor-code' | 'two-factor' | null;

/**
 * Declared delegation of the DPA signature (#723): the sign link exists and
 * the wizard may continue WITHOUT a consent act — the registration then
 * carries the forwarded state instead of a self-signature.
 */
export interface WizardDpaForwardState {
    signLink: string;
    expiresAt: string | null;
    /** Recipient of the forward mail; null when the link was shared manually. */
    recipientEmail: string | null;
}

export const useTenantAdminOnboardingFlow = (inviteToken: string, client: TenantAdminOnboardingClient) => {
    const [state, setState] = useState<TenantAdminOnboardingState>({ phase: 'loading' });
    const [invite, setInvite] = useState<TenantAdminOnboardingInviteDTO | null>(null);
    const [organisation, setOrganisation] = useState<OrganisationData | null>(null);
    const [dpa, setDpa] = useState<DpaAcceptanceData | null>(null);
    const [dpaForward, setDpaForward] = useState<WizardDpaForwardState | null>(null);
    const [submitError, setSubmitError] = useState<TenantAdminOnboardingSubmitError>(null);
    const [busy, setBusy] = useState(false);
    // Bumping re-runs the resolve effect — the retry for transient load failures.
    const [loadAttempt, setLoadAttempt] = useState(0);

    // Read through refs inside the async submits so a stale closure can never
    // resubmit a flow that has meanwhile hit a terminal state, and an
    // in-flight submit can never be doubled by a second click.
    const stateRef = useRef(state);
    stateRef.current = state;
    const busyRef = useRef(false);

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
                    // Resume: registration already happened; only the 2FA
                    // activation is open (#569 resume contract).
                    setState({
                        phase: 'two-factor',
                        result: {
                            tenantId: loaded.reservedTenantId,
                            twoFactor: loaded.twoFactor ?? null,
                            resumed: true,
                        },
                    });
                    return;
                }
                setState({ phase: 'organisation' });
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

    /**
     * Declares "not authorised to sign" (#723): remembers the created sign
     * link and drops any half-entered self-signature — the two ways of
     * satisfying the DPA step are mutually exclusive.
     */
    const markDpaForwarded = useCallback((forward: WizardDpaForwardState) => {
        if (stateRef.current.phase !== 'organisation') {
            return;
        }
        setDpaForward(forward);
        setDpa(null);
    }, []);

    const dpaForwardRef = useRef(dpaForward);
    dpaForwardRef.current = dpaForward;

    const submitOrganisationDpa = useCallback((organisationData: OrganisationData, dpaData: DpaAcceptanceData | null) => {
        if (stateRef.current.phase !== 'organisation') {
            return;
        }
        // Without a consent act the step is only complete when the signature
        // was explicitly forwarded — never silently.
        if (!dpaData && !dpaForwardRef.current) {
            return;
        }
        setOrganisation(organisationData);
        setDpa(dpaData);
        setSubmitError(null);
        setState({ phase: 'account' });
    }, []);

    const goBackToOrganisation = useCallback(() => {
        if (stateRef.current.phase !== 'account' || busyRef.current) {
            return;
        }
        setSubmitError(null);
        setState({ phase: 'organisation' });
    }, []);

    const failFlow = (error: unknown, retryable: Exclude<TenantAdminOnboardingSubmitError, null>) => {
        if (error instanceof InviteLinkError) {
            setState({ phase: 'link-error', reason: error.reason });
            return;
        }
        setSubmitError(retryable);
    };

    const submitAccount = useCallback(
        async (password: string) => {
            if (
                stateRef.current.phase !== 'account' ||
                busyRef.current ||
                !invite ||
                !organisation ||
                (!dpa && !dpaForward)
            ) {
                return;
            }
            busyRef.current = true;
            setBusy(true);
            setSubmitError(null);
            try {
                const result = await client.registerTenantAdmin(inviteToken, {
                    organisation,
                    // The register call carries the forwarded state instead of
                    // a self-signature (#723).
                    dpa: dpa ?? { forwarded: true },
                    account: { password },
                    reservedTenantId: invite.reservedTenantId,
                    tenantIdReservationToken: invite.tenantIdReservationToken,
                });
                setState({
                    phase: 'two-factor',
                    result: { tenantId: result.tenantId, twoFactor: result.twoFactor, resumed: false },
                });
            } catch (error) {
                failFlow(error, 'registration');
            } finally {
                busyRef.current = false;
                setBusy(false);
            }
        },
        [client, inviteToken, invite, organisation, dpa, dpaForward],
    );

    const submitTwoFactorCode = useCallback(
        async (otp: string) => {
            const { current } = stateRef;
            if (current.phase !== 'two-factor' || busyRef.current) {
                return;
            }
            busyRef.current = true;
            setBusy(true);
            setSubmitError(null);
            try {
                await client.activateTwoFactor(inviteToken, otp);
                setState({ phase: 'done', tenantId: current.result.tenantId });
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
        organisation,
        dpa,
        dpaForward,
        submitError,
        busy,
        retryLoad,
        markDpaForwarded,
        submitOrganisationDpa,
        goBackToOrganisation,
        submitAccount,
        submitTwoFactorCode,
    };
};
