import { useMemo } from 'react';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import routePathNames from '../../appConfig';
import {
    createHttpTenantAdminOnboardingClient,
    TenantAdminOnboardingClient,
} from '../../api/tenantOnboarding/tenantOnboarding';
import { M3Button } from '../../components/M3Button';
import { useTenantAdminOnboardingFlow } from './useTenantAdminOnboardingFlow';
import { LinkErrorState } from './LinkErrorState';
import { OrganisationDpaStep } from './OrganisationDpaStep';
import { AccountStep } from './AccountStep';
import { TwoFactorStep } from './TwoFactorStep';
import styles from './styles.module.scss';

interface TenantAdminOnboardingProps {
    inviteToken: string;
    /**
     * Backend seam — defaults to the real public UserService client
     * ({@link createHttpTenantAdminOnboardingClient}); tests and Storybook
     * inject the stub here.
     */
    client?: TenantAdminOnboardingClient;
}

const STEP_ORDER = { organisation: 1, account: 2, 'two-factor': 3 } as const;

/**
 * Public tenant-admin onboarding flow (TEN-INV U8, #571): the invite link
 * reserved a tenant ID; this flow collects organisation data + the DPA/AVV
 * confirmation, creates the account + the INACTIVE tenant (consuming the
 * reservation atomically) and finishes with the mandatory 2FA setup.
 */
export const TenantAdminOnboarding = ({ inviteToken, client }: TenantAdminOnboardingProps) => {
    const { t } = useTranslation();
    const resolvedClient = useMemo(() => client ?? createHttpTenantAdminOnboardingClient(), [client]);
    const {
        state,
        invite,
        organisation,
        dpa,
        submitError,
        busy,
        retryLoad,
        submitOrganisationDpa,
        goBackToOrganisation,
        submitAccount,
        submitTwoFactorCode,
    } = useTenantAdminOnboardingFlow(inviteToken, resolvedClient);

    if (state.phase === 'loading') {
        return (
            <div className={styles.loading} role="status" aria-label={t('tenantOnboarding.loading')}>
                <CircularProgress />
            </div>
        );
    }

    if (state.phase === 'load-error') {
        // Transient resolve failure (#569 hardening): NOT a dead link — offer
        // a retry instead of the terminal error states.
        return (
            <div data-testid="onboarding-load-error">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                    {t('tenantOnboarding.loadError.title')}
                </Typography>
                <Typography role="alert" sx={{ mb: 3 }}>
                    {t('tenantOnboarding.loadError.description')}
                </Typography>
                <M3Button variant="filled" onClick={retryLoad}>
                    {t('tenantOnboarding.loadError.retry')}
                </M3Button>
            </div>
        );
    }

    if (state.phase === 'link-error') {
        return <LinkErrorState reason={state.reason} />;
    }

    if (state.phase === 'done') {
        return (
            <div data-testid="onboarding-done">
                <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 3 }}>
                    {t('tenantOnboarding.done.title')}
                </Typography>
                <Typography sx={{ mb: 4 }}>
                    {t('tenantOnboarding.done.description', { tenantId: state.tenantId })}
                </Typography>
                <Link to={routePathNames.login} className="forgotPW">
                    {t('tenantOnboarding.done.toLogin')}
                </Link>
            </div>
        );
    }

    const step = STEP_ORDER[state.phase];

    return (
        <div>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700, mb: 1 }}>
                {t('tenantOnboarding.title')}
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                {t('tenantOnboarding.stepIndicator', { current: step, total: 3 })}
            </Typography>
            {state.phase === 'organisation' && invite && (
                <OrganisationDpaStep
                    invite={invite}
                    initialOrganisation={organisation}
                    initialDpa={dpa}
                    onSubmit={submitOrganisationDpa}
                />
            )}
            {state.phase === 'account' && invite && (
                <AccountStep
                    invite={invite}
                    busy={busy}
                    showRegistrationError={submitError === 'registration'}
                    onBack={goBackToOrganisation}
                    onSubmit={submitAccount}
                />
            )}
            {state.phase === 'two-factor' && (
                <TwoFactorStep
                    result={state.result}
                    busy={busy}
                    showCodeError={submitError === 'two-factor-code'}
                    showServiceError={submitError === 'two-factor'}
                    onSubmit={submitTwoFactorCode}
                />
            )}
        </div>
    );
};
