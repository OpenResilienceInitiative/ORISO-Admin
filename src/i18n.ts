import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import assistant0 from './locales/en/assistant.json';
import assistant1 from './locales/de/assistant.json';
import assistant2 from './locales/de@informal/assistant.json';
import assistant3 from './locales/fr/assistant.json';
import assistant4 from './locales/ru/assistant.json';
import assistant5 from './locales/tr/assistant.json';
import assistant6 from './locales/ti/assistant.json';

import translationDe from './locales/de/translation.json';
import translationEn from './locales/en/translation.json';
import { directInviteLocaleKeys } from './locales/directInviteKeys';
import directInviteInformal from './locales/de@informal/directInvite.json';
import directInviteFr from './locales/fr/directInvite.json';
import directInviteRu from './locales/ru/directInvite.json';
import directInviteTr from './locales/tr/directInvite.json';
import directInviteTi from './locales/ti/directInvite.json';
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
        'de@informal': {
            translations: {
                ...Object.fromEntries(directInviteLocaleKeys.map((key) => [key, translationDe[key]])),
                ...assistant2,
                ...directInviteInformal,
            },
        },
        fr: { translations: { ...assistant3, ...directInviteFr } },
        ru: { translations: { ...assistant4, ...directInviteRu } },
        tr: { translations: { ...assistant5, ...directInviteTr } },
        ti: { translations: { ...assistant6, ...directInviteTi } },

        en: {
            translations: { ...translationEn, ...assistant0 },
        },
        de: {
            translations: { ...translationDe, ...assistant1 },
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
