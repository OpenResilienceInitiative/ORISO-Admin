import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DEFAULT_LANGUAGE,
    getInitialLanguage,
    LANGUAGE_OPTIONS,
    normalizeLanguage,
    storeLanguage,
    SupportedLanguage,
} from '../utils/language';

type LanguageOption = {
    value: SupportedLanguage;
    label: string;
    title: string;
};

export const useLanguage = () => {
    const { i18n, t } = useTranslation();
    const [language, setLanguage] = useState<SupportedLanguage>(() => {
        return normalizeLanguage(i18n.language) || getInitialLanguage();
    });

    useEffect(() => {
        const handleLanguageChanged = (nextLanguage: string) => {
            const normalizedLanguage = normalizeLanguage(nextLanguage) || DEFAULT_LANGUAGE;
            setLanguage(normalizedLanguage);
            storeLanguage(normalizedLanguage);
        };

        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [i18n]);

    const changeLanguage = useCallback(
        async (nextLanguage: SupportedLanguage) => {
            await i18n.changeLanguage(nextLanguage);
        },
        [i18n],
    );

    const options = useMemo<LanguageOption[]>(() => {
        return LANGUAGE_OPTIONS.map((option) => ({
            value: option.value,
            label: `${t(option.shortLabelKey)} ${t(option.labelKey)}`,
            title: '',
        }));
    }, [t]);

    return {
        language,
        options,
        changeLanguage,
    };
};
