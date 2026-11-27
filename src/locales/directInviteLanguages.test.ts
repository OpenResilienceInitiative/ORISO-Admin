import { describe, expect, it } from 'vite-plus/test';
import i18n from '../i18n';
import { SUPPORTED_LANGUAGES } from '../utils/language';
import { directInviteLocaleKeys } from './directInviteKeys';

const placeholders = (message: string) => [...message.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();

describe('direct invitation settings in the supported Admin languages', () => {
    it.each(SUPPORTED_LANGUAGES)('%s registers each required message without a fallback', (language) => {
        const getOwnMessage = (key: string) => i18n.getResource(language, 'translations', key);
        const missing = directInviteLocaleKeys.filter((key) => {
            const value = getOwnMessage(key);
            return typeof value !== 'string' || value.trim() === '' || value === key;
        });
        expect(missing, `Missing direct-invite translations in ${language}`).toEqual([]);

        directInviteLocaleKeys.forEach((key) => {
            const source = i18n.getResource('en', 'translations', key);
            expect(placeholders(getOwnMessage(key)), `${language}:${key}`).toEqual(placeholders(source));
        });
    });

    it('uses informal address for the relevant German texts', () => {
        const informal = i18n.getFixedT('de@informal');
        expect(informal('tenants.permissions.directInvite.offOnTraeger')).toContain('Dein Träger');
        expect(informal('tileHelp.directInvite.essence')).toContain('du');
    });
});
