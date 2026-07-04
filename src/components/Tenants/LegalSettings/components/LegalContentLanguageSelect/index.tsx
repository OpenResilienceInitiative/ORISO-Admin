import { Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface LegalContentLanguageSelectProps {
    /** The languages offered for editing/viewing. Hidden when there is only one. */
    languages: string[];
    /** The currently shown language. */
    value: string;
    onChange: (language: string) => void;
}

/**
 * Language switcher for the multilingual legal content editors (DPA / department data
 * privacy policy) — the same optional per-language switching the LegalText cards get
 * from TranslatableFormField, but for the state-based TipTap cards.
 */
export const LegalContentLanguageSelect = ({ languages, value, onChange }: LegalContentLanguageSelectProps) => {
    const { t } = useTranslation();

    if (languages.length <= 1) {
        return null;
    }

    return (
        <Space align="center" className={styles.selector}>
            <Typography.Text>{t('languages')}</Typography.Text>
            <Select
                value={value}
                onChange={onChange}
                options={languages.map((language) => ({
                    value: language,
                    label: t(`language.${language}`, language),
                }))}
                className={styles.select}
                aria-label={t('languages')}
            />
        </Space>
    );
};

export default LegalContentLanguageSelect;
