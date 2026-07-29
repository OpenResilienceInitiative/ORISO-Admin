import Alert from '@mui/material/Alert';
import { useTranslation } from 'react-i18next';

/**
 * TEN-INV-U10 (#572): the ONE combined, privacy-preserving hint for a failed
 * sign-in. Invalid credentials and a not-yet-registered invitee render the
 * exact same text so the login form cannot be used to enumerate accounts.
 * A successful login with a missing DPA never shows this — it authenticates
 * and runs into the global DPA blocker instead.
 */
export const LoginCredentialsHint = () => {
    const { t } = useTranslation();

    return (
        <Alert severity="error" role="alert" sx={{ mb: 2 }} data-testid="login-credentials-hint">
            {t('message.error.auth.credentialsOrInvite')}
        </Alert>
    );
};
