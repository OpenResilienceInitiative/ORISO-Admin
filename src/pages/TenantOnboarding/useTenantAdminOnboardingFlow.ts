import { useCallback, useEffect, useRef, useState } from 'react';
import {
    DpaAcceptanceData,
    InviteLinkError,
    InviteLinkErrorReason,
    OrganisationData,
    TenantAdminOnboardingClient,
    TenantAdminOnboardingInviteDTO,
    TenantAdminRegistrationResultDTO,
    TwoFactorCodeInvalidError,
} from '../../api/tenantOnboarding/tenantOnboarding';

/**
 * Flow state of the public tenant-admin onboarding (TEN-INV U8, #571).
 *
 * `link-error` is terminal: consumed/revoked/expired/unknown links render a
 * distinct error state and every further submit is a no-op — a dead link can
 * never be resubmitted, also not when the invite dies mid-flow (registration
 * losing a race against a concurrent consumption/revocation).
 */
export type TenantAdminOnboardingState =
    | { phase: 'loading' }
    | { phase: 'link-error'; reason: InviteLinkErrorReason }
    | { phase: 'organisation' }
    | { phase: 'account' }
    | { phase: 'two-factor'; result: TenantAdminRegistrationResultDTO }
    | { phase: 'done'; tenantId: number };

/** Which submit failed retryably; link-death is modelled in the state instead. */
export type TenantAdminOnboardingSubmitError = 'registration' | 'two-factor-code' | 'two-factor' | null;

export const useTenantAdminOnboardingFlow = (inviteToken: string, client: TenantAdminOnboardingClient) => {
    const [state, setState] = useState<TenantAdminOnboardingState>({ phase: 'loading' });
    const [invite, setInvite] = useState<TenantAdminOnboardingInviteDTO | null>(null);
    const [organisation, setOrganisation] = useState<OrganisationData | null>(null);
    const [dpa, setDpa] = useState<DpaAcceptanceData | null>(null);
    const [submitError, setSubmitError] = useState<TenantAdminOnboardingSubmitError>(null);
    const [busy, setBusy] = useState(false);

    // Read through refs inside the async submits so a stale closure can never
    // resubmit a flow that has meanwhile hit a terminal state.
    const stateRef = useRef(state);
    stateRef.current = state;

    useEffect(() => {
        let cancelled = false;

        if (!inviteToken) {
            setState({ phase: 'link-error', reason: 'INVALID' });
            return undefined;
        }

        client
            .getOnboardingInvite(inviteToken)
            .then((loaded) => {
                if (cancelled) return;
                setInvite(loaded);
                setState({ phase: 'organisation' });
            })
            .catch((error: unknown) => {
                if (cancelled) return;
                setState({
                    phase: 'link-error',
                    reason: error instanceof InviteLinkError ? error.reason : 'INVALID',
                });
            });

        return () => {
            cancelled = true;
        };
        // The invite is resolved once per token; the client is stable by contract.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inviteToken]);

    const submitOrganisationDpa = useCallback((organisationData: OrganisationData, dpaData: DpaAcceptanceData) => {
        if (stateRef.current.phase !== 'organisation') {
            return;
        }
        setOrganisation(organisationData);
        setDpa(dpaData);
        setSubmitError(null);
        setState({ phase: 'account' });
    }, []);

    const goBackToOrganisation = useCallback(() => {
        if (stateRef.current.phase !== 'account') {
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
            if (stateRef.current.phase !== 'account' || !invite || !organisation || !dpa) {
                return;
            }
            setBusy(true);
            setSubmitError(null);
            try {
                const result = await client.registerTenantAdmin(inviteToken, {
                    organisation,
                    dpa,
                    account: { password },
                    reservedTenantId: invite.reservedTenantId,
                    tenantIdReservationToken: invite.tenantIdReservationToken,
                });
                setState({ phase: 'two-factor', result });
            } catch (error) {
                failFlow(error, 'registration');
            } finally {
                setBusy(false);
            }
        },
        [client, inviteToken, invite, organisation, dpa],
    );

    const submitTwoFactorCode = useCallback(
        async (otp: string) => {
            const { current } = stateRef;
            if (current.phase !== 'two-factor') {
                return;
            }
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
        submitError,
        busy,
        submitOrganisationDpa,
        goBackToOrganisation,
        submitAccount,
        submitTwoFactorCode,
    };
};
