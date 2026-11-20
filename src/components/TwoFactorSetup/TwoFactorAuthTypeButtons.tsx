import { useTranslation } from 'react-i18next';
import { RadioButton } from '../radioButton/RadioButton';
import { Tooltip } from '../tooltip/Tooltip';
import { ReactComponent as InfoIcon } from '../../resources/img/svg/i.svg';
import { TwoFactorType } from '../../enums/TwoFactorType';

interface TwoFactorAuthTypeButtonsProps {
    twoFactorType: TwoFactorType;
    /** Public setup may lack fresh app material; profile keeps both options. */
    showApp?: boolean;
    setTwoFactorType: (type: TwoFactorType) => void;
}

export const TwoFactorAuthTypeButtons = ({
    twoFactorType,
    setTwoFactorType,
    showApp = true,
}: TwoFactorAuthTypeButtonsProps) => {
    const { t } = useTranslation();
    return (
        <div className="twoFactorAuth__selectType">
            {showApp && (
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
            )}
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
