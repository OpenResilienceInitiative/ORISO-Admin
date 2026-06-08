import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import translationDe from './locales/de/translation.json';
import translationEn from './locales/en/translation.json';
import {
    DEFAULT_LANGUAGE,
    getInitialLanguage,
    normalizeLanguage,
    SUPPORTED_LANGUAGES,
    updateDocumentLanguage,
} from './utils/language';

const initialLanguage = getInitialLanguage();
updateDocumentLanguage(initialLanguage);

i18n.use(initReactI18next).init({
    debug: false, // set to true for debugging
    lng: initialLanguage,
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: [...SUPPORTED_LANGUAGES],
    keySeparator: false, // we do not use keys in form messages.welcome

    interpolation: {
        escapeValue: false, // react already safes from xss
    },

    resources: {
        en: {
            translations: translationEn,
        },
        de: {
            translations: translationDe,
        },
    },
    // have a common namespace used around the full app
    ns: ['translations'],
    defaultNS: 'translations',
    // allow an empty value to count as invalid (by default is true)
    returnEmptyString: false,
});

i18n.on('languageChanged', (nextLanguage) => {
    const language = normalizeLanguage(nextLanguage) || DEFAULT_LANGUAGE;
    updateDocumentLanguage(language);
});

export default i18n;
