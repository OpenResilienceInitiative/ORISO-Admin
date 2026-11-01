import { useCallback, type ReactElement } from 'react';
import classNames from 'classnames';
import { Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { ReactComponent as LanguageIcon } from '../../resources/img/svg/navbar/languages_active.svg';
import { useLanguage } from '../../hooks/useLanguage';
import { DEFAULT_LANGUAGE, isSupportedLanguage, normalizeLanguage } from '../../utils/language';
import { AccessibleLanguagePopup } from './AccessibleLanguagePopup';
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
    const renderPopup = useCallback(
        (menu: ReactElement) => <AccessibleLanguagePopup menu={menu} label={ariaLabel} />,
        [ariaLabel],
    );

    return (
        <div className={classNames(styles.wrapper, styles[variant], className)}>
            {showIcon && <LanguageIcon className={styles.icon} aria-hidden />}
            <Select
                virtual={false}
                popupRender={renderPopup}
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
                classNames={{ popup: { root: isLoginVariant ? 'loginLanguageSelectorDropdown' : undefined } }}
                variant={isLoginVariant ? 'borderless' : 'outlined'}
                popupMatchSelectWidth={!isLoginVariant}
            />
        </div>
    );
};
