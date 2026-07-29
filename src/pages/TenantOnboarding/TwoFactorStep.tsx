import { Form } from 'antd';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../../components/M3Button';
import { MuiFormField } from '../../components/mui/MuiFormField';
import { CopyToClipboard } from '../../components/CopyToClipboard';
import { TenantAdminRegistrationResultDTO } from '../../api/tenantOnboarding/tenantOnboarding';
import styles from './styles.module.scss';

interface TwoFactorStepProps {
    result: TenantAdminRegistrationResultDTO;
    busy: boolean;
    /** The submitted one-time password was rejected (retryable). */
    showCodeError: boolean;
    /** The activation failed technically (retryable). */
    showServiceError: boolean;
    onSubmit: (otp: string) => void;
}

/**
 * Step 3 (#571): mandatory 2FA setup for the freshly registered tenant admin.
 * Mirrors the app-linking of the profile 2FA (QR when available + base32 key,
 * cf. TwoFactorAuthAppActivate) but runs against the public onboarding client
 * because there is no authenticated session yet.
 */
export const TwoFactorStep = ({ result, busy, showCodeError, showServiceError, onSubmit }: TwoFactorStepProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<{ otp: string }>();

    return (
        <Form form={form} layout="vertical" requiredMark={false} onFinish={({ otp }) => onSubmit(otp.trim())}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                {t('tenantOnboarding.twoFactor.title')}
            </Typography>
            <Typography sx={{ mb: 2 }} color="text.secondary">
                {t('tenantOnboarding.twoFactor.description')}
            </Typography>
            {result.twoFactor.qrCodeBase64 && (
                <img
                    className={styles.qrCode}
                    alt={t('tenantOnboarding.twoFactor.qrAlt')}
                    src={`data:image/png;base64,${result.twoFactor.qrCodeBase64}`}
                />
            )}
            <Typography sx={{ mb: 1 }}>{t('tenantOnboarding.twoFactor.secretLabel')}</Typography>
            <div className={styles.secretRow} data-testid="totp-secret">
                <CopyToClipboard className={styles.secret}>{result.twoFactor.secret}</CopyToClipboard>
            </div>
            <div className={styles.fieldStack}>
                <MuiFormField
                    name="otp"
                    label={t('tenantOnboarding.twoFactor.codeLabel')}
                    autoComplete="one-time-code"
                    inputProps={{ inputMode: 'numeric', maxLength: 6 }}
                    rules={[
                        { required: true, message: t('tenantOnboarding.validation.required') },
                        { pattern: /^\d{6}$/, message: t('tenantOnboarding.twoFactor.codeFormat') },
                    ]}
                />
            </div>
            {showCodeError && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t('tenantOnboarding.twoFactor.codeInvalid')}
                </Typography>
            )}
            {showServiceError && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t('tenantOnboarding.twoFactor.serviceError')}
                </Typography>
            )}
            <div className={styles.actions}>
                <M3Button
                    type="submit"
                    variant="filled"
                    block
                    disabled={busy}
                    icon={busy ? <CircularProgress size={18} color="inherit" /> : undefined}
                >
                    {t('tenantOnboarding.twoFactor.activate')}
                </M3Button>
            </div>
        </Form>
    );
};
