import { useState } from 'react';
import { Form } from 'antd';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import { useTranslation } from 'react-i18next';
import { M3Button } from '../M3Button';
import { MuiFormField } from '../mui/MuiFormField';
import { TwoFactorAppConnect, TwoFactorAppLink } from './TwoFactorAppConnect';
import { OTP_LENGTH } from './twoFactorSetupFlow';
import { TwoFactorAuthTypeButtons } from './TwoFactorAuthTypeButtons';
import { TwoFactorType } from '../../enums/TwoFactorType';
import type { OnboardingTwoFactorMethod } from '../../api/tenantOnboarding/tenantOnboarding';
import styles from './styles.module.scss';

/** Retryable error surfaced by the inline variant (Frontend taxonomy: invalidCode / appSetup). */
export type TwoFactorSetupInlineError = 'invalid-code' | 'service' | null;

export interface OnboardingTwoFactorSetupProps {
    /**
     * TOTP link data from the injected backend seam (secret already base32).
     * A resumed link without material may verify an app already connected.
     * A fresh link without material cannot start app setup.
     */
    appLink: TwoFactorAppLink | null;
    /** True when the step was re-entered by resuming a 2FA-pending link (#569). */
    resumed?: boolean;
    busy?: boolean;
    error?: TwoFactorSetupInlineError;
    /** Context copy — defaults to the shared canonical keys. */
    titleKey?: string;
    descriptionKey?: string;
    /** Preferred server method, honoured only when it can be set up here. */
    defaultMethod?: OnboardingTwoFactorMethod;
    /** Advertised methods; absent for legacy onboarding servers. */
    methods?: readonly OnboardingTwoFactorMethod[];
    /** The server-owned invitation address; never editable during public setup. */
    email?: string;
    /** Present only when the onboarding server advertises EMAIL support. */
    onSendEmail?: () => Promise<void>;
    onVerifyEmail?: (otp: string) => void;
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
    defaultMethod,
    methods,
    email,
    onSendEmail,
    onVerifyEmail,
    onVerify,
}: OnboardingTwoFactorSetupProps) => {
    const { t } = useTranslation();
    const [form] = Form.useForm<{ otp: string }>();
    const supportsEmail = Boolean(email && onSendEmail && onVerifyEmail);
    const supportsApp = Boolean(appLink?.secretBase32 || (resumed && (!methods || methods.includes('APP'))));
    const [method, setMethod] = useState(
        supportsEmail && (!supportsApp || defaultMethod !== 'APP') ? TwoFactorType.Email : TwoFactorType.App,
    );
    const [emailSent, setEmailSent] = useState(false);
    const [sending, setSending] = useState(false);
    const [sendError, setSendError] = useState(false);
    const [hideVerificationError, setHideVerificationError] = useState(false);
    const emailSelected = supportsEmail && method === TwoFactorType.Email;
    const pending = busy || sending;
    const canVerify = emailSelected ? emailSent : supportsApp;

    const sendEmail = async () => {
        if (pending || !onSendEmail) return;
        setSending(true);
        setSendError(false);
        try {
            await onSendEmail();
            form.resetFields();
            setEmailSent(true);
            setHideVerificationError(true);
        } catch {
            setSendError(true);
        } finally {
            setSending(false);
        }
    };

    return (
        <Form
            form={form}
            layout="vertical"
            requiredMark={false}
            onFinish={({ otp }) => {
                if (pending || !canVerify) return;
                setHideVerificationError(false);
                (emailSelected ? onVerifyEmail : onVerify)?.(otp.trim());
            }}
        >
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
            {supportsEmail && (
                <Box component="fieldset" disabled={pending} sx={{ border: 0, m: 0, p: 0, mb: 2 }}>
                    <Typography component="legend" sx={{ mb: 1 }}>
                        {t('twoFactorSetup.method')}
                    </Typography>
                    <TwoFactorAuthTypeButtons
                        twoFactorType={method}
                        showApp={supportsApp}
                        setTwoFactorType={(next) => {
                            form.resetFields();
                            setHideVerificationError(true);
                            setSendError(false);
                            setMethod(next);
                        }}
                    />
                </Box>
            )}
            {emailSelected ? (
                <>
                    <Typography role={emailSent ? 'status' : undefined} sx={{ mb: 1 }}>
                        {t(emailSent ? 'twoFactorSetup.email.sent' : 'twoFactorSetup.email.description')}
                    </Typography>
                    <Typography sx={{ mb: 2, overflowWrap: 'anywhere' }}>{email}</Typography>
                    <M3Button
                        type="button"
                        variant={emailSent ? 'outlined' : 'filled'}
                        block
                        disabled={pending}
                        onClick={sendEmail}
                    >
                        {t(emailSent ? 'twoFactorAuth.activate.email.resend.new' : 'twoFactorSetup.email.send')}
                    </M3Button>
                </>
            ) : (
                appLink && <TwoFactorAppConnect appLink={appLink} />
            )}
            {!supportsEmail && !supportsApp && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t('twoFactorSetup.error.service')}
                </Typography>
            )}
            {sendError && (
                <Typography role="alert" color="error" sx={{ mt: 2 }}>
                    {t('twoFactorSetup.email.error')}
                </Typography>
            )}
            {canVerify && (
                <>
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
                    {!hideVerificationError && error === 'invalid-code' && (
                        <Typography role="alert" color="error" sx={{ mt: 2 }}>
                            {t('twoFactorSetup.otp.invalid')}
                        </Typography>
                    )}
                    {!hideVerificationError && !sendError && error === 'service' && (
                        <Typography role="alert" color="error" sx={{ mt: 2 }}>
                            {t('twoFactorSetup.error.service')}
                        </Typography>
                    )}
                    <div className={styles.actions}>
                        <M3Button
                            type="submit"
                            variant="filled"
                            block
                            disabled={pending}
                            icon={pending ? <CircularProgress size={18} color="inherit" /> : undefined}
                        >
                            {t('twoFactorSetup.submit')}
                        </M3Button>
                    </div>
                </>
            )}
        </Form>
    );
};
