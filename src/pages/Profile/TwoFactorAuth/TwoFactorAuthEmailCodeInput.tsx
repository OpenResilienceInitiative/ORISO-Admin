import { InputField, InputFieldItem } from '../../../components/inputField/InputField';
import { TwoFactorAuthResendMail } from './TwoFactorAuthResendMail';

interface TwoFactorAuthEmailCodeInputProps {
    otpInputItem: InputFieldItem;
    handleOtpChange: (e: Event) => void;
    sendEmailActivationCode: (e) => void;
}

export const TwoFactorAuthEmailCodeInput = ({
    otpInputItem,
    handleOtpChange,
    sendEmailActivationCode,
}: TwoFactorAuthEmailCodeInputProps) => {
    return (
        <div className="twoFactorAuth__emailCode">
            <InputField item={otpInputItem} inputHandle={(e) => handleOtpChange(e)} />
            <TwoFactorAuthResendMail resendHandler={sendEmailActivationCode} />
        </div>
    );
};
