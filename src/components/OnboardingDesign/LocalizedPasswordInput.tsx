import { useTranslation } from 'react-i18next';
import { OnboardingPasswordField } from './OnboardingPasswordField';

export interface LocalizedPasswordInputProps {
    label: string;
    /** Optional so an antd `Form.Item` can inject `value` / `onChange`. */
    value?: string;
    onChange?: (value: string) => void;
    className?: string;
    autoFocus?: boolean;
}

/** The registration-style password field with its show / hide text from i18n. */
export const LocalizedPasswordInput = ({
    label,
    value = '',
    onChange,
    className,
    autoFocus,
}: LocalizedPasswordInputProps) => {
    const { t } = useTranslation();
    return (
        <OnboardingPasswordField
            label={label}
            value={value}
            onChange={(next) => onChange?.(next)}
            showLabel={t('onboarding.password.show')}
            hideLabel={t('onboarding.password.hide')}
            className={className}
            autoFocus={autoFocus}
        />
    );
};
