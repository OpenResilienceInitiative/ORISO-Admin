import { Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import { isMachineTranslated } from '../../utils/translationMeta';
import styles from './styles.module.scss';

interface LegalContentLanguageSelectProps {
    /** The languages offered for editing/viewing. Hidden when there is only one. */
    languages: string[];
    /** The currently shown language. */
    value: string;
    onChange: (language: string) => void;
    /** The source ("Rechtssprache") — labelled e.g. "Deutsch (Original)". */
    sourceLanguage?: string;
    /**
     * The current content map (incl. `__meta` keys): machine-translated languages are
     * labelled e.g. "Englisch (maschinell übersetzt)" / "English (machine translated)".
     */
    contentMap?: Record<string, string>;
}

/**
 * Language switcher for the multilingual legal content editors (DPA / department data
 * privacy policy) — the same optional per-language switching the LegalText cards get
 * from TranslatableFormField, but for the state-based TipTap cards. Shows the status
 * of each language: original (source) or machine-translated (from the `__meta` map).
 */
export const LegalContentLanguageSelect = ({
    languages,
    value,
    onChange,
    sourceLanguage,
    contentMap,
}: LegalContentLanguageSelectProps) => {
    const { t } = useTranslation();

    if (languages.length <= 1) {
        return null;
    }

    const labelFor = (language: string): string => {
        const base = t(`language.${language}`, language);
        if (sourceLanguage && language === sourceLanguage) {
            return t('legal.translation.label.original', { language: base });
        }
        if (isMachineTranslated(contentMap, language)) {
            return t('legal.translation.label.machineTranslated', { language: base });
        }
        return base;
    };

    return (
        <Space align="center" className={styles.selector}>
            <Typography.Text>{t('languages')}</Typography.Text>
            <Select
                value={value}
                onChange={onChange}
                options={languages.map((language) => ({
                    value: language,
                    label: labelFor(language),
                }))}
                className={styles.select}
                aria-label={t('languages')}
            />
        </Space>
    );
};

export default LegalContentLanguageSelect;
