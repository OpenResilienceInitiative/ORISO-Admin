import Typography from '@mui/material/Typography';
import HourglassTopRounded from '@mui/icons-material/HourglassTopRounded';
import LoginRounded from '@mui/icons-material/LoginRounded';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import routePathNames from '../../appConfig';
import { M3Button } from '../../components/M3Button';
import VerifiedIcon from '../../components/CustomIcons/Verified';
import styles from './styles.module.scss';

interface DoneStepProps {
    /** The tenant ID the reservation was consumed for — the number the platform operator refers to. */
    tenantId: number;
}

/**
 * Terminal success state of the tenant-admin onboarding (#571, reworked in
 * #594.7). It used to be unformatted body text with the assigned ID inline in
 * the first sentence and a bare red text link, which read like an error page
 * at the end of a successful registration. It now states the two facts that
 * actually matter separately, shows the assigned ID as a labelled detail, and
 * its single primary action is the shared M3 button.
 *
 * The confirmation glyph is the `Verified` icon from the admin's own icon
 * gallery (Atoms/CustomIcons) in the product's secondary colour (#594.11) —
 * the green MUI check it replaced was a colour from outside the palette.
 */
export const DoneStep = ({ tenantId }: DoneStepProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();

    return (
        <div className={styles.done} data-testid="onboarding-done">
            <VerifiedIcon className={styles.doneIcon} data-testid="onboarding-done-success-icon" aria-hidden />
            <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
                {t('tenantOnboarding.done.title')}
            </Typography>
            <Typography color="text.secondary" data-testid="onboarding-done-description">
                {t('tenantOnboarding.done.description')}
            </Typography>

            <dl className={styles.doneDetail} data-testid="onboarding-done-tenant-id">
                <dt>{t('tenantOnboarding.done.tenantIdLabel')}</dt>
                <dd>{tenantId}</dd>
            </dl>

            <ul className={styles.doneNext}>
                <li data-testid="onboarding-done-next-step">
                    <HourglassTopRounded fontSize="small" aria-hidden />
                    <span>{t('tenantOnboarding.done.next.activation')}</span>
                </li>
                <li data-testid="onboarding-done-next-step">
                    <LoginRounded fontSize="small" aria-hidden />
                    <span>{t('tenantOnboarding.done.next.login')}</span>
                </li>
            </ul>

            <M3Button
                variant="filled"
                icon={<LoginRounded fontSize="small" />}
                onClick={() => navigate(routePathNames.login)}
            >
                {t('tenantOnboarding.done.toLogin')}
            </M3Button>
        </div>
    );
};
