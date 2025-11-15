import { useTranslation } from 'react-i18next';
import { RadioButton } from '../../../components/radioButton/RadioButton';
import { Tooltip } from '../../../components/tooltip/Tooltip';
import { ReactComponent as InfoIcon } from '../../../resources/img/svg/i.svg';
import { TwoFactorType } from '../../../enums/TwoFactorType';

interface TwoFactorAuthTypeButtonsProps {
    twoFactorType: TwoFactorType;
    setTwoFactorType: (type: TwoFactorType) => void;
}

export const TwoFactorAuthTypeButtons = ({ twoFactorType, setTwoFactorType }: TwoFactorAuthTypeButtonsProps) => {
    const { t } = useTranslation();
    return (
        <div className="twoFactorAuth__selectType">
            <div className="twoFactorAuth__radioWrapper">
                <RadioButton
                    checked={twoFactorType === TwoFactorType.App}
                    handleRadioButton={() => setTwoFactorType(TwoFactorType.App)}
                    label={t('twoFactorAuth.activate.radio.label.app')}
                    inputId="radio_2fa_app"
                    name="radio_2fa"
                    type="default"
                    value={TwoFactorType.App}
                />
                <Tooltip trigger={<InfoIcon />}>{t('twoFactorAuth.activate.radio.tooltip.app')}</Tooltip>
            </div>
            <div className="twoFactorAuth__radioWrapper">
                <RadioButton
                    checked={twoFactorType === TwoFactorType.Email}
                    handleRadioButton={() => setTwoFactorType(TwoFactorType.Email)}
                    label={t('twoFactorAuth.activate.radio.label.email')}
                    inputId="radio_2fa_email"
                    name="radio_2fa"
                    type="default"
                    value={TwoFactorType.Email}
                />
                <Tooltip trigger={<InfoIcon />}>{t('twoFactorAuth.activate.radio.tooltip.email')}</Tooltip>
            </div>
        </div>
    );
};
