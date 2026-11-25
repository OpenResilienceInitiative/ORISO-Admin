import { useCallback, useMemo, useState } from 'react';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { M3Switch } from '../M3Switch';
import { FETCH_ERRORS } from '../../api/fetchData';
import { useUserData } from '../../hooks/useUserData.hook';
import { TwoFactorType } from '../../enums/TwoFactorType';
import {
    useUserTwoFactorAuth,
    useUserTwoFactorDelete,
    useUserTwoFactorSendEmailCode,
} from '../../hooks/useUserTwoFactorAuth.hook';
import { OnboardingTwoFactorSetup, TwoFactorSetupInlineError } from './OnboardingTwoFactorSetup';
import { toBase32Secret } from '../../utils/totpSecret';

const { Paragraph } = Typography;

export interface ProfileTwoFactorSetupProps {
    required?: boolean;
}

/**
 * Profile variant of the canonical 2FA setup (see `TwoFactorSetup.tsx`):
 * the activation switch plus the same inline setup form the public onboarding
 * uses, backed by the real user-service hooks. The legacy stepped overlay
 * wizard is gone, so mandatory setup, "Mein Account" and the invitation flow
 * look and behave alike.
 */
export const ProfileTwoFactorSetup = ({ required = false }: ProfileTwoFactorSetupProps) => {
    const { t } = useTranslation();
    const { data: userData } = useUserData();
    const { mutate: activateTwoFactorAuth } = useUserTwoFactorAuth();
    const { mutate: deleteTwoFactorAuth } = useUserTwoFactorDelete();
    const { mutate: sendEmailActivationCode } = useUserTwoFactorSendEmailCode();
    const [setupOpen, setSetupOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<TwoFactorSetupInlineError>(null);

    const twoFactorAuth = userData?.twoFactorAuth;
    const isEnabled = twoFactorAuth?.isEnabled === true;
    const isActive = twoFactorAuth?.isActive === true;
    const showSetup = isEnabled && !isActive && (required || setupOpen);
    const email = userData?.email || undefined;

    // The user service stores the raw secret; authenticators need base32.
    const appLink = useMemo(() => {
        const secretBase32 = toBase32Secret(twoFactorAuth?.secret);
        const qrCodeBase64 = twoFactorAuth?.qrCode || null;
        return secretBase32 || qrCodeBase64 ? { secretBase32, qrCodeBase64 } : null;
    }, [twoFactorAuth?.secret, twoFactorAuth?.qrCode]);

    const closeSetup = useCallback(() => {
        setSetupOpen(false);
        setError(null);
    }, []);

    const handleSwitchChange = useCallback(() => {
        if (!twoFactorAuth) return;
        if (!isActive) {
            // The switch opens the setup form and closes it again.
            if (setupOpen) closeSetup();
            else setSetupOpen(true);
        } else if (!required) {
            deleteTwoFactorAuth(null);
        }
    }, [closeSetup, deleteTwoFactorAuth, isActive, required, setupOpen, twoFactorAuth]);

    const verify = useCallback(
        (twoFactorType: TwoFactorType) => (otp: string) => {
            setBusy(true);
            setError(null);
            activateTwoFactorAuth(
                { twoFactorType, otp, secret: twoFactorAuth?.secret },
                {
                    onSuccess: () => {
                        setBusy(false);
                        closeSetup();
                    },
                    onError: ({ message }) => {
                        setBusy(false);
                        setError(message === FETCH_ERRORS.BAD_REQUEST ? 'invalid-code' : 'service');
                    },
                },
            );
        },
        [activateTwoFactorAuth, closeSetup, twoFactorAuth?.secret],
    );

    const sendEmail = useCallback(
        () =>
            new Promise<void>((resolve, reject) => {
                if (!email) {
                    reject(new Error('missing email'));
                    return;
                }
                sendEmailActivationCode(email, { onSuccess: () => resolve(), onError: reject });
            }),
        [email, sendEmailActivationCode],
    );

    const switchLabel = isActive ? t('twoFactorAuth.switch.active.label') : t('twoFactorAuth.switch.deactive.label');

    return (
        <>
            {!(required && !isActive) && (
                <div className="twoFactorAuth__switch mb-m">
                    <M3Switch
                        onChange={handleSwitchChange}
                        checked={isActive || showSetup}
                        disabled={!isEnabled || (required && isActive) || busy}
                        label={switchLabel}
                    />
                    <Paragraph className="text desc">{switchLabel}</Paragraph>
                </div>
            )}
            {isActive && twoFactorAuth?.type && (
                <p className="desc">
                    <strong>{t('twoFactorAuth.switch.type.label')}</strong>{' '}
                    {t(`twoFactorAuth.switch.type.${twoFactorAuth.type}`)}{' '}
                    {twoFactorAuth.type === TwoFactorType.Email ? `(${userData?.email})` : ''}
                </p>
            )}
            {showSetup && (
                <OnboardingTwoFactorSetup
                    appLink={appLink}
                    busy={busy}
                    error={error}
                    email={email}
                    emailDescriptionKey="twoFactorSetup.email.descriptionAccount"
                    onSendEmail={email ? sendEmail : undefined}
                    onVerifyEmail={email ? verify(TwoFactorType.Email) : undefined}
                    onVerify={verify(TwoFactorType.App)}
                    onCancel={required ? undefined : closeSetup}
                />
            )}
        </>
    );
};
