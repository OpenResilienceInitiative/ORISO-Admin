import i18next from 'i18next';

export type Languages = 'de' | 'en' | 'fr';

const changeLang = (lang: Languages) => {
    i18next.changeLanguage(lang, (err, t) => {
        // eslint-disable-next-line no-console
        if (err) return console.log('something went wrong loading', err);
        t('key'); // -> same as i18next.t
        return null;
    });
};

export default changeLang;
