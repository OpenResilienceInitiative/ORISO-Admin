import { useTranslation } from 'react-i18next';
import { Text } from '../text/Text';
import { InputField, InputFieldItem } from '../inputField/InputField';
import { UserData } from '../../types/user';

interface TwoFactorAuthEmailSelectionProps {
    userData: UserData;
    emailInputItem: InputFieldItem;
    handleEmailChange: (e: Event) => void;
}

export const TwoFactorAuthEmailSelection = ({
    userData,
    emailInputItem,
    handleEmailChange,
}: TwoFactorAuthEmailSelectionProps) => {
    const { t } = useTranslation();
    return (
        <div className="twoFactorAuth__emailSelection">
            <InputField
                item={emailInputItem}
                inputHandle={(e) => {
                    handleEmailChange(e);
                }}
            />
            {userData?.email && (
                <Text type="infoLargeAlternative" text={t('twoFactorAuth.activate.email.input.info')} />
            )}
        </div>
    );
};
