import { Dropdown } from 'antd';
import Language from '@mui/icons-material/Language';
import ArrowDropDown from '@mui/icons-material/ArrowDropDown';
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
        <div className={styles.splitButton}>
            <button type="button" className={styles.leading} title={t('languages')}>
                <Language style={{ fontSize: 22 }} />
                {/* Plain language name on the button (matches the other legal cards);
                    the original / machine-translated status stays in the menu below. */}
                <span>{t(`language.${value}`, value)}</span>
            </button>
            <Dropdown
                trigger={['click']}
                menu={{
                    items: languages.map((language) => ({ key: language, label: labelFor(language) })),
                    onClick: ({ key }) => onChange(key),
                }}
            >
                <button type="button" className={styles.trailing} title={t('languages')} aria-label={t('languages')}>
                    <ArrowDropDown />
                </button>
            </Dropdown>
        </div>
    );
};

export default LegalContentLanguageSelect;
