import { describe, expect, it } from 'vitest';
import i18n from '../i18n';
import { SUPPORTED_LANGUAGES } from '../utils/language';
import en from './en/closingAnimation.json';

const loadLocale = async (language: string) =>
    (await import(`./${language}/closingAnimation.json`)).default as Record<string, string>;

const expectedKeys = Object.keys(en).sort();

describe('closing animation wording', () => {
    it('defines the card title, the two device groups, the platform default and all three designs', () => {
        expect(expectedKeys).toEqual(
            [
                'settings.closingAnimation.title',
                'settings.closingAnimation.description',
                'settings.closingAnimation.desktop',
                'settings.closingAnimation.mobile',
                'settings.closingAnimation.inherit',
                'settings.closingAnimation.inherit.description',
                'settings.closingAnimation.inherit.current',
                'settings.closingAnimation.design.CURTAIN',
                'settings.closingAnimation.design.CURTAIN.description',
                'settings.closingAnimation.design.CIRCLE_ZOOM',
                'settings.closingAnimation.design.CIRCLE_ZOOM.description',
                'settings.closingAnimation.design.SLIDE_REVEAL',
                'settings.closingAnimation.design.SLIDE_REVEAL.description',
                'settings.closingAnimation.loadError',
            ].sort(),
        );
    });

    it.each([...SUPPORTED_LANGUAGES])('ships every string in %s', async (language) => {
        const locale = await loadLocale(language);
        expect(Object.keys(locale).sort()).toEqual(expectedKeys);
        Object.values(locale).forEach((value) => expect(value.trim()).not.toBe(''));
    });

    it.each(SUPPORTED_LANGUAGES.filter((language) => language !== 'en'))(
        'is registered with the app, so %s does not fall back to English',
        async (language) => {
            await i18n.changeLanguage(language);
            const title = i18n.t('settings.closingAnimation.title');
            await i18n.changeLanguage('en');
            expect(title).not.toBe(en['settings.closingAnimation.title']);
            expect(title).not.toMatch(/^settings\./);
        },
    );

    it('registers the English source strings', async () => {
        await i18n.changeLanguage('en');
        expect(i18n.t('settings.closingAnimation.design.CIRCLE_ZOOM')).toBe('Circle zoom');
        expect(i18n.t('settings.closingAnimation.design.SLIDE_REVEAL')).toBe('Slide reveal');
        expect(i18n.t('settings.closingAnimation.design.CURTAIN')).toBe('Curtain');
    });
});
