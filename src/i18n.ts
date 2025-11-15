import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import translationDe from './locales/de/translation.json';

i18n.use(initReactI18next) // passes i18n down to react-i18next
    .use(LanguageDetector)
    .init({
        debug: false, // set to true for debugging
        fallbackLng: 'de', // use en if detected lng is not available
        keySeparator: false, // we do not use keys in form messages.welcome

        interpolation: {
            escapeValue: false, // react already safes from xss
        },

        resources: {
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

export default i18n;
