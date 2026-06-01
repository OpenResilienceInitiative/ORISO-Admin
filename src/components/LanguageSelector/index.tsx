import classNames from 'classnames';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactComponent as LanguageIcon } from '../../resources/img/svg/navbar/languages_active.svg';
import { useLanguage } from '../../hooks/useLanguage';
import { DEFAULT_LANGUAGE, isSupportedLanguage, normalizeLanguage } from '../../utils/language';
import styles from './styles.module.scss';

type LanguageSelectorVariant = 'login' | 'profile' | 'compact';

interface LanguageSelectorProps {
    variant?: LanguageSelectorVariant;
    className?: string;
    showIcon?: boolean;
    ariaLabelKey?: string;
}

export const LanguageSelector = ({
    variant = 'compact',
    className,
    showIcon = true,
    ariaLabelKey,
}: LanguageSelectorProps) => {
    const { t } = useTranslation();
    const { language, options, changeLanguage } = useLanguage();
    const selectedLanguage = normalizeLanguage(language) || DEFAULT_LANGUAGE;
    const ariaLabel = ariaLabelKey ? t(ariaLabelKey) : t('language.selectAriaLabel');
    const isLoginVariant = variant === 'login';

    return (
        <div className={classNames(styles.wrapper, styles[variant], className)}>
            {showIcon && <LanguageIcon className={styles.icon} aria-hidden />}
            <Select
                className={classNames(styles.select, {
                    loginLanguageSelector__select: isLoginVariant,
                })}
                value={selectedLanguage}
                options={options}
                showSearch={false}
                onChange={(value) => {
                    if (isSupportedLanguage(value)) {
                        changeLanguage(value);
                    }
                }}
                aria-label={ariaLabel}
                popupClassName={isLoginVariant ? 'loginLanguageSelectorDropdown' : undefined}
                bordered={!isLoginVariant}
                dropdownMatchSelectWidth={!isLoginVariant}
            />
        </div>
    );
};
