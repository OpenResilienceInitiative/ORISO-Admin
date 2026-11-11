import Typography from '@mui/material/Typography';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import LoginRounded from '@mui/icons-material/LoginRounded';
import MarkEmailReadRounded from '@mui/icons-material/MarkEmailReadRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import routePathNames from '../../appConfig';
import { M3Button } from '../../components/M3Button';
import { OnboardingLeadArt } from '../../components/OnboardingDesign/OnboardingLeadArt';
import { OnboardingPageHeader } from '../../components/OnboardingDesign/OnboardingPageHeader';
import styles from './styles.module.scss';

interface DoneStepProps {
    /** The tenant ID the reservation was consumed for — the number the platform operator refers to. */
    tenantId?: number;
    /**
     * The DPA signature was forwarded to an authorised signatory (#723) —
     * the completion additionally says an e-mail will follow once it arrives.
     */
    forwarded?: boolean;
    /** The admin joined an existing Träger: nothing was created, nothing awaits activation. */
    joinedExisting?: boolean;
    existingAccountSetup?: boolean;
    /** A public flow can choose its role-specific portal without changing this default Admin action. */
    onLogin?: () => void;
}

/**
 * Terminal success state of the tenant-admin onboarding (#571, reworked in
 * #594.7). It used to be unformatted body text with the assigned ID inline in
 * the first sentence and a bare red text link, which read like an error page
 * at the end of a successful registration. It now states the two facts that
 * actually matter separately, shows the assigned ID as a labelled detail, and
 * its single primary action is the shared M3 button.
 *
 * The confirmation is the shared lead graphic (#1273): a check in the ORISO
 * red, never green — the same header every invited-account page uses.
 */
export const DoneStep = ({
    tenantId,
    forwarded = false,
    joinedExisting = false,
    existingAccountSetup = false,
    onLogin,
}: DoneStepProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const invitationDescriptionKey = joinedExisting
        ? 'tenantOnboarding.done.joinDescription'
        : 'tenantOnboarding.done.description';
    const descriptionKey = existingAccountSetup ? 'accountSetup.success' : invitationDescriptionKey;

    return (
        <div className={styles.done} data-testid="onboarding-done">
            <OnboardingPageHeader
                lead={
                    <span className={styles.doneIcon} data-testid="onboarding-done-success-icon">
                        <OnboardingLeadArt variant="check" />
                    </span>
                }
                title={t(existingAccountSetup ? 'accountSetup.completedTitle' : 'tenantOnboarding.done.title')}
            />
            <Typography color="text.secondary" data-testid="onboarding-done-description">
                {t(descriptionKey)}
            </Typography>

            {!existingAccountSetup && tenantId != null && (
                <dl className={styles.doneDetail} data-testid="onboarding-done-tenant-id">
                    <dt>{t('tenantOnboarding.done.tenantIdLabel')}</dt>
                    <dd>{tenantId}</dd>
                </dl>
            )}

            <ul className={styles.doneNext}>
                {!existingAccountSetup && forwarded && (
                    <li data-testid="onboarding-done-next-step">
                        <MarkEmailReadRounded fontSize="small" aria-hidden />
                        <span>{t('tenantOnboarding.done.next.signature')}</span>
                    </li>
                )}
                {!existingAccountSetup && !joinedExisting && (
                    <li data-testid="onboarding-done-next-step">
                        <HourglassTopRounded fontSize="small" aria-hidden />
                        <span>{t('tenantOnboarding.done.next.activation')}</span>
                    </li>
                )}
                <li data-testid="onboarding-done-next-step">
                    <LoginRounded fontSize="small" aria-hidden />
                    <span>
                        {t(existingAccountSetup ? 'accountSetup.loginHint' : 'tenantOnboarding.done.next.login')}
                    </span>
                </li>
            </ul>

            <M3Button
                variant="filled"
                icon={<LoginRounded fontSize="small" />}
                onClick={onLogin ?? (() => navigate(routePathNames.login))}
            >
                {t('tenantOnboarding.done.toLogin')}
            </M3Button>
        </div>
    );
};
