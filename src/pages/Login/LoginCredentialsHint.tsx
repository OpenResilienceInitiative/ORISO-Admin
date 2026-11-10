import { useTranslation } from 'react-i18next';
import { Notify } from '../../components/Notify';

/**
 * TEN-INV-U10 (#572): the ONE combined, privacy-preserving hint for a failed
 * sign-in. Invalid credentials and a not-yet-registered invitee render the
 * exact same text so the login form cannot be used to enumerate accounts.
 * A successful login with a missing DPA never shows this — it authenticates
 * and runs into the global DPA blocker instead.
 */
export const LoginCredentialsHint = ({ otpStage = false }: { otpStage?: boolean }) => {
    const { t } = useTranslation();

    return (
        <Notify
            title={t('notify.title.login')}
            testId="login-credentials-hint"
            severity="error"
            // The hint has no height of its own; "Ansehen" goes to the field the person has to correct: the
            // code after a failed code submission, otherwise the user name.
            jump={otpStage ? 'input#basic_otp' : 'input[autocomplete="username"]'}
        >
            {t('message.error.auth.credentialsOrInvite')}
        </Notify>
    );
};
