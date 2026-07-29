import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { Text } from '../text/Text';
import { CopyToClipboard } from '../CopyToClipboard';

export interface TwoFactorAppLink {
    /** Base32-encoded TOTP secret, ready to type into an authenticator app. */
    secretBase32: string;
    /** QR code PNG (base64) when the backend provides one. */
    qrCodeBase64?: string | null;
}

interface TwoFactorAppConnectProps {
    appLink: TwoFactorAppLink;
}

/**
 * Shared "connect your authenticator app" block of the canonical 2FA setup
 * (flow contract step `app-connect`): QR code when available plus the base32
 * key with a copy affordance. Rendered by both the profile overlay and the
 * public tenant-admin onboarding variant.
 */
export const TwoFactorAppConnect = ({ appLink }: TwoFactorAppConnectProps) => {
    const { t } = useTranslation();

    return (
        <div
            className={classNames('twoFactorAuth__connect', {
                'twoFactorAuth__connect--keyOnly': !appLink.qrCodeBase64,
            })}
        >
            {appLink.qrCodeBase64 && (
                <>
                    <div className="twoFactorAuth__qrCode">
                        <Text text={t('twoFactorSetup.connect.qrCode')} type="standard" />
                        <img
                            className="twoFactorAuth__qrCodeImage"
                            alt={t('twoFactorSetup.connect.qrAlt')}
                            src={`data:image/png;base64,${appLink.qrCodeBase64}`}
                        />
                    </div>
                    <Text text={t('twoFactorSetup.connect.divider')} type="divider" />
                </>
            )}
            <div className="twoFactorAuth__key">
                <Text text={t('twoFactorSetup.connect.key')} type="standard" />
                <div className="twoFactorAuth__keyValue" data-testid="totp-secret">
                    <CopyToClipboard>{appLink.secretBase32}</CopyToClipboard>
                </div>
            </div>
        </div>
    );
};
