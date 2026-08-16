import Language from '@mui/icons-material/Language';
import { useTranslation } from 'react-i18next';
import { SplitDropdown } from '../../../../FormPluginEditor/SplitDropdown';
import { isMachineTranslated } from '../../utils/translationMeta';
import { isEmptyHtml } from '../../utils/legalContentLanguages';

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
        // "no content yet" outranks the original/translated status: a language without
        // content is exactly the gap an admin must see before publishing (#718).
        if (contentMap && isEmptyHtml(contentMap[language])) {
            return t('legal.translation.label.empty', { language: base });
        }
        if (sourceLanguage && language === sourceLanguage) {
            return t('legal.translation.label.original', { language: base });
        }
        if (isMachineTranslated(contentMap, language)) {
            return t('legal.translation.label.machineTranslated', { language: base });
        }
        return base;
    };

    return (
        // Compact split button in the lower function bar ("DE", Figma 1261-48667);
        // the original / machine-translated status stays in the menu below.
        <SplitDropdown
            icon={<Language />}
            label={value.toUpperCase()}
            title={`${t('languages')}: ${labelFor(value)}`}
            menu={{
                selectable: true,
                selectedKeys: [value],
                items: languages.map((language) => ({ key: language, label: labelFor(language) })),
                onClick: ({ key }) => onChange(key),
            }}
        />
    );
};

export default LegalContentLanguageSelect;
