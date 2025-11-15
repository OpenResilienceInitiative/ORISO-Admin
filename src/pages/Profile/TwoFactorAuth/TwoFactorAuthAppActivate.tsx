import { useTranslation } from 'react-i18next';
import { encode } from 'hi-base32';
import { UserData } from '../../../types/user';
import { Text } from '../../../components/text/Text';

interface TwoFactorAuthAppActivateProps {
    userData: UserData;
}

export const TwoFactorAuthAppActivate = ({ userData }: TwoFactorAuthAppActivateProps) => {
    const { t } = useTranslation();
    return (
        <div className="twoFactorAuth__connect">
            <div className="twoFactorAuth__qrCode">
                <Text text={t('twoFactorAuth.activate.app.step3.connect.qrCode')} type="standard" />
                <img
                    className="twoFactorAuth__qrCodeImage"
                    alt="qr code"
                    src={`data:image/png;base64,${userData?.twoFactorAuth.qrCode}`}
                />
            </div>
            <Text text={t('twoFactorAuth.activate.app.step3.connect.divider')} type="divider" />
            <div className="twoFactorAuth__key">
                <Text text={t('twoFactorAuth.activate.app.step3.connect.key')} type="standard" />
                <Text
                    text={
                        userData.twoFactorAuth.secret
                            ? encode(userData.twoFactorAuth.secret).replace(/={1,8}$/, '')
                            : ''
                    }
                    type="wrapped"
                />
            </div>
        </div>
    );
};
