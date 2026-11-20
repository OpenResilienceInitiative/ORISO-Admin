import { describe, expect, it } from 'vite-plus/test';
import de from './de/translation.json';
import en from './en/translation.json';

type Locale = Record<string, unknown>;
const locales: Array<[string, Locale]> = [
    ['de', de],
    ['en', en],
];

/**
 * Glossary decision (Frank, 2026-11-07): the platform has two different team functions and each has one
 * name and one description, set in one place (`teamFunctions.*`). "Team-Chat" must mean only the internal
 * room on an open enquiry; the old names must not return in any other string.
 */
describe('team function names', () => {
    it('defines the pair in German and English', () => {
        expect(de['teamFunctions.counselling.name']).toBe('Teamberatung');
        expect(de['teamFunctions.chat.name']).toBe('Team-Chat');
        expect(en['teamFunctions.counselling.name']).toBe('Team counselling');
        expect(en['teamFunctions.chat.name']).toBe('Team chat');
        locales.forEach(([lang, strings]) => {
            ['counselling', 'chat'].forEach((fn) => {
                expect(strings[`teamFunctions.${fn}.description`], `${lang} ${fn}`).toEqual(expect.any(String));
            });
        });
    });

    it('never gives the two functions the same name or description', () => {
        locales.forEach(([lang, strings]) => {
            expect(strings['teamFunctions.counselling.name'], lang).not.toBe(strings['teamFunctions.chat.name']);
            expect(strings['teamFunctions.counselling.description'], lang).not.toBe(
                strings['teamFunctions.chat.description'],
            );
        });
    });

    it('never explains one function with the name of the other', () => {
        // An admin who reads "Team chat: internal team counselling ..." thinks of the centre setting.
        const otherName: Record<string, Record<'counselling' | 'chat', RegExp>> = {
            de: { counselling: /team-?chat/i, chat: /team-?beratung/i },
            en: { counselling: /team chat/i, chat: /team counsell?ing/i },
        };
        locales.forEach(([lang, strings]) => {
            (['counselling', 'chat'] as const).forEach((fn) => {
                const description = strings[`teamFunctions.${fn}.description`] as string;
                expect(description, `${lang} ${fn} description`).not.toMatch(otherName[lang][fn]);
            });
        });
    });

    it('keeps retired names out of every other string', () => {
        const retired: Record<string, RegExp> = {
            de: /Teamchat|Team-Besprechung|Teamberatungsstelle/i,
            en: /team chats?\b|team discussion|team counseling|team counselling cent/i,
        };
        locales.forEach(([lang, strings]) => {
            Object.entries(strings).forEach(([key, value]) => {
                if (typeof value !== 'string' || key.startsWith('teamFunctions.chat.')) return;
                expect(value, `${lang}:${key}`).not.toMatch(retired[lang]);
            });
        });
    });

    it('builds the conversion warning from the shared name', () => {
        locales.forEach(([lang, strings]) => {
            expect(strings['agency.form.settings.teamAdviceCenter.changeWarning'], lang).toContain('{{name}}');
        });
    });

    it('keeps the old per-place keys removed', () => {
        const removed = [
            'agency.teamAgency',
            'agency.form.settings.teamAdviceCenter.title',
            'agency.form.settings.teamAdviceCenter.description',
            'agency.add.general.more_settings.team_advice_center',
            'tenants.appSettings.otherFunctions.teamDiscussion.title',
            'tenants.appSettings.otherFunctions.teamDiscussion.description',
            'tileHelp.otherFunctions.team.title',
            'tileHelp.otherFunctions.team.body',
        ];
        locales.forEach(([lang, strings]) => {
            removed.forEach((key) => expect(Object.keys(strings), `${lang}:${key}`).not.toContain(key));
        });
    });
});
