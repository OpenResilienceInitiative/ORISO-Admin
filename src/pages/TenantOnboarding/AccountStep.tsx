import { Form } from 'antd';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../components/M3Button';
import { MuiPasswordFormField } from '../../components/mui/MuiFormField';
import { validatePasswordCriteria } from '../../utils/validateInputValue';
import { TenantAdminOnboardingInviteDTO } from '../../api/tenantOnboarding/tenantOnboarding';
import styles from './styles.module.scss';

interface AccountStepProps {
    invite: TenantAdminOnboardingInviteDTO;
    busy: boolean;
    /** Set when the registration failed technically (retryable). */
    showRegistrationError: boolean;
    onBack: () => void;
    onSubmit: (password: string) => void;
}

/**
 * Step 2 (#571): account creation. The account identity is the invite's
 * recipient address (shown read-only); the tenant admin only chooses the
 * password here. Submitting registers the account AND creates the inactive
 * tenant, consuming the ID reservation atomically (see the onboarding client).
 */
export const AccountStep = ({ invite, busy, showRegistrationError, onBack, onSubmit }: AccountStepProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<{ password: string; repeatPassword: string }>();

    return (
        <Form form={form} layout="vertical" requiredMark={false} onFinish={({ password }) => onSubmit(password)}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                {t('tenantOnboarding.account.title')}
            </Typography>
            <Typography sx={{ mb: 2 }} color="text.secondary">
                {t('tenantOnboarding.account.description')}
            </Typography>
            <Typography sx={{ mb: 2 }}>
                {t('tenantOnboarding.account.email')}: <strong>{invite.recipientEmail}</strong>
            </Typography>
            <Typography sx={{ mb: 2 }} color="text.secondary">
                {t('passwordReset.passwordCriteria')}
            </Typography>
            <div className={styles.fieldStack}>
                <MuiPasswordFormField
                    name="password"
                    label={t('tenantOnboarding.account.password')}
                    autoComplete="new-password"
                    rules={[
                        { required: true, message: t('passwordReset.passwordRequired') },
                        {
                            validator: async (_, value) => {
                                if (value && !validatePasswordCriteria(value)) {
                                    throw new Error(t('passwordReset.passwordInvalid'));
                                }
                            },
                        },
                    ]}
                />
                <MuiPasswordFormField
                    name="repeatPassword"
                    label={t('tenantOnboarding.account.repeatPassword')}
                    autoComplete="new-password"
                    dependencies={['password']}
                    rules={[
                        { required: true, message: t('passwordReset.passwordRequired') },
                        {
                            validator: async (_, value) => {
                                if (value && value !== form.getFieldValue('password')) {
                                    throw new Error(t('passwordReset.passwordMismatch'));
                                }
                            },
                        },
                    ]}
                />
            </div>
            {showRegistrationError && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t('tenantOnboarding.account.registrationError')}
                </Typography>
            )}
            <div className={styles.actions}>
                <M3Button variant="outlined" onClick={onBack} disabled={busy}>
                    {t('tenantOnboarding.back')}
                </M3Button>
                <M3Button
                    type="submit"
                    variant="filled"
                    disabled={busy}
                    icon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                    {t('tenantOnboarding.account.register')}
                </M3Button>
            </div>
        </Form>
    );
};
