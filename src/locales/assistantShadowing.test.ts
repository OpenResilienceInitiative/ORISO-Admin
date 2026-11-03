import { describe, expect, it } from 'vitest';
import translationDe from './de/translation.json';
import translationEn from './en/translation.json';
import assistantDe from './de/assistant.json';
import assistantEn from './en/assistant.json';

/**
 * src/i18n.ts merges `{ ...translation, ...assistant }`, so a key defined in both files shows the
 * assistant.json text and the translation.json text is never displayed. These keys were already
 * duplicated before the settings tiles work and are tolerated; any new duplicate must be removed
 * from translation.json (or edited in assistant.json) instead.
 */
const knownDuplicates = new Set([
    'language.short.en',
    'language.options.en',
    'language.short.de',
    'language.options.de',
    'tenants.permissions.asker.channels.title',
    'tenants.permissions.asker.channels.emailAgencyCounselling',
    'tenants.permissions.asker.channels.emailLiveChat',
    'tenants.permissions.asker.channels.emailSelfHelp',
    'tenants.permissions.asker.channels.browserAgencyCounselling',
    'tenants.permissions.asker.channels.browserLiveChat',
    'tenants.permissions.asker.channels.browserSelfHelp',
]);

const pairs = [
    ['de', translationDe, assistantDe],
    ['en', translationEn, assistantEn],
] as const;

describe('translation.json keys shadowed by assistant.json', () => {
    it.each(pairs)('%s: no new key is defined in both files with different text', (_locale, translation, assistant) => {
        const t = translation as Record<string, string>;
        const a = assistant as Record<string, string>;
        const shadowed = Object.keys(a).filter((key) => key in t && t[key] !== a[key] && !knownDuplicates.has(key));
        expect(shadowed).toEqual([]);
    });
});
