import i18next from 'i18next';
import { normalizeLanguage, storeLanguage, SupportedLanguage, updateDocumentLanguage } from './language';

export type Languages = SupportedLanguage;

const changeLang = (lang: Languages) => {
    storeLanguage(lang);
    updateDocumentLanguage(lang);

    i18next.changeLanguage(lang, (err) => {
        // eslint-disable-next-line no-console
        if (err) return console.log('something went wrong loading', err);
        return null;
    });
};

export const changeLangFromUnknown = (value: string | null | undefined) => {
    const normalizedLanguage = normalizeLanguage(value);
    if (!normalizedLanguage) {
        return;
    }

    changeLang(normalizedLanguage);
};

export default changeLang;
