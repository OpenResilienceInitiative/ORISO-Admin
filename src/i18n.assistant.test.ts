import { describe, expect, it } from 'vitest';
import i18n from './i18n';
import { normalizeLanguage } from './utils/language';

describe('assistant Appearance locale selection', () => {
    it('uses French feature text while keeping English fallback for untranslated legacy controls', async () => {
        await i18n.changeLanguage(normalizeLanguage('fr-FR')!);
        expect(i18n.t('settings.assistant.title')).toBe('Assistant des messages système');
        expect(i18n.t('card.edit.save')).toBe('Save');
        await i18n.changeLanguage('en');
    });
    it('keeps informal German distinct for the feature wording', async () => {
        await i18n.changeLanguage('de@informal');
        expect(i18n.t('settings.assistant.description')).toBe(
            'Wähle den Namen und das Icon für die Systemnachrichten des Assistenten.',
        );
        await i18n.changeLanguage('en');
    });
});
