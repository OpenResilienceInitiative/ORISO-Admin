import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import assistant0 from './locales/en/assistant.json';
import assistant1 from './locales/de/assistant.json';
import assistant2 from './locales/de@informal/assistant.json';
import assistant3 from './locales/fr/assistant.json';
import assistant4 from './locales/ru/assistant.json';
import assistant5 from './locales/tr/assistant.json';
import assistant6 from './locales/ti/assistant.json';
import closing0 from './locales/en/closingAnimation.json';
import closing1 from './locales/de/closingAnimation.json';
import closing2 from './locales/de@informal/closingAnimation.json';
import closing3 from './locales/fr/closingAnimation.json';
import closing4 from './locales/ru/closingAnimation.json';
import closing5 from './locales/tr/closingAnimation.json';
import closing6 from './locales/ti/closingAnimation.json';

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
        'de@informal': { translations: { ...assistant2, ...closing2 } },
        fr: { translations: { ...assistant3, ...closing3 } },
        ru: { translations: { ...assistant4, ...closing4 } },
        tr: { translations: { ...assistant5, ...closing5 } },
        ti: { translations: { ...assistant6, ...closing6 } },

        en: {
            translations: { ...translationEn, ...assistant0, ...closing0 },
        },
        de: {
            translations: { ...translationDe, ...assistant1, ...closing1 },
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
