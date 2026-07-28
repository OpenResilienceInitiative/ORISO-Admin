import { Form } from 'antd';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import { MuiFormField } from '../mui/MuiFormField';
import { TwoFactorAppConnect, TwoFactorAppLink } from './TwoFactorAppConnect';
import { OTP_LENGTH } from './twoFactorSetupFlow';
import styles from './styles.module.scss';

/** Retryable error surfaced by the inline variant (Frontend taxonomy: invalidCode / appSetup). */
export type TwoFactorSetupInlineError = 'invalid-code' | 'service' | null;

export interface OnboardingTwoFactorSetupProps {
    /**
     * TOTP link data from the injected backend seam (secret already base32).
     * `null` = verify-only: a resumed link without re-issued setup material —
     * the authenticator app was already connected in the original attempt.
     */
    appLink: TwoFactorAppLink | null;
    /** True when the step was re-entered by resuming a 2FA-pending link (#569). */
    resumed?: boolean;
    busy?: boolean;
    error?: TwoFactorSetupInlineError;
    /** Context copy — defaults to the shared canonical keys. */
    titleKey?: string;
    descriptionKey?: string;
    onVerify: (otp: string) => void;
}

/**
 * Public-onboarding variant of the canonical 2FA setup (see `TwoFactorSetup.tsx`):
 * the flow-contract steps `app-connect` + `app-verify` rendered inline as one
 * mandatory screen — there is no authenticated session yet, so all data comes
 * in via props from the onboarding backend seam instead of the user hooks.
 */
export const OnboardingTwoFactorSetup = ({
    appLink,
    resumed = false,
    busy = false,
    error = null,
    titleKey = 'twoFactorSetup.title',
    descriptionKey = 'twoFactorSetup.description',
    onVerify,
}: OnboardingTwoFactorSetupProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<{ otp: string }>();

    return (
        <Form form={form} layout="vertical" requiredMark={false} onFinish={({ otp }) => onVerify(otp.trim())}>
            <Typography variant="h5" component="h2" sx={{ fontWeight: 700, mb: 1 }}>
                {t(titleKey)}
            </Typography>
            <Typography sx={{ mb: 2 }} color="text.secondary">
                {t(descriptionKey)}
            </Typography>
            {resumed && (
                <Typography sx={{ mb: 2 }} data-testid="two-factor-resumed-hint">
                    {t('twoFactorSetup.resumedHint')}
                </Typography>
            )}
            {appLink && <TwoFactorAppConnect appLink={appLink} />}
            <div className={styles.fieldStack}>
                <MuiFormField
                    name="otp"
                    label={t('twoFactorSetup.otp.label')}
                    autoComplete="one-time-code"
                    inputProps={{ inputMode: 'numeric', maxLength: OTP_LENGTH }}
                    rules={[
                        { required: true, message: t('twoFactorSetup.otp.required') },
                        {
                            pattern: new RegExp(`^\\d{${OTP_LENGTH}}$`),
                            message: t('twoFactorSetup.otp.format'),
                        },
                    ]}
                />
            </div>
            {error === 'invalid-code' && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t('twoFactorSetup.otp.invalid')}
                </Typography>
            )}
            {error === 'service' && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t('twoFactorSetup.error.service')}
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
                    {t('twoFactorSetup.submit')}
                </M3Button>
            </div>
        </Form>
    );
};
