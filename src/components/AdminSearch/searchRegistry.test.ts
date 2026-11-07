import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vite-plus/test';
import enAssistant from '../../locales/en/assistant.json';
import enTranslation from '../../locales/en/translation.json';
import deAssistant from '../../locales/de/assistant.json';
import deTranslation from '../../locales/de/translation.json';
import { UserRole } from '../../enums/UserRole';
import {
    AGENCY_TABS,
    EXTRA_PAGES,
    NAV_TITLE_KEYS,
    SEARCH_TILES,
    SELF_COUNSEL_ROLES,
    TENANT_TABS,
} from './searchRegistry';
import { SEARCH_KEYWORDS } from './searchKeywords';

const en = { ...enTranslation, ...enAssistant } as Record<string, string>;
const de = { ...deTranslation, ...deAssistant } as Record<string, string>;
const root = resolve(__dirname, '../../..');

const tileKeys = SEARCH_TILES.flatMap((tile) => [
    tile.titleKey,
    ...(tile.fieldKeys ?? []),
    ...(tile.descriptionKey ? [tile.descriptionKey] : []),
]);
const otherKeys = [
    ...EXTRA_PAGES.flatMap((page) => [page.titleKey, ...(page.descriptionKey ? [page.descriptionKey] : [])]),
    ...Object.values(NAV_TITLE_KEYS),
    ...[...TENANT_TABS, ...AGENCY_TABS].map((tab) => tab.titleKey),
];

describe('search registry drift', () => {
    it('has a German and an English text for every key it uses', () => {
        const missing = [...new Set([...tileKeys, ...otherKeys])].flatMap((key) => [
            ...(en[key] ? [] : [`en: ${key}`]),
            ...(de[key] ? [] : [`de: ${key}`]),
        ]);

        expect(missing).toEqual([]);
    });

    it('has unique tile ids', () => {
        const idList = SEARCH_TILES.map((tile) => tile.id);

        expect(new Set(idList).size).toBe(idList.length);
    });

    it('points every tile at a source file that still renders its title key', () => {
        const broken = SEARCH_TILES.flatMap((tile) => {
            const candidates = [`${tile.source}.tsx`, `${tile.source}.ts`, tile.source].map((path) =>
                resolve(root, path),
            );
            const file = candidates.find((path) => existsSync(path) && !path.endsWith('/'));

            if (!file) {
                return [`${tile.id}: file ${tile.source} not found`];
            }

            return readFileSync(file, 'utf8').includes(tile.titleKey)
                ? []
                : [`${tile.id}: ${tile.titleKey} not in ${tile.source}`];
        });

        expect(broken).toEqual([]);
    });

    it('offers "make me a counsellor" under the same role rule as the card renders it', () => {
        const card = readFileSync(resolve(root, 'src/pages/Profile/SelfConsultantIdentity/index.tsx'), 'utf8');
        const names = SELF_COUNSEL_ROLES.map((role) =>
            Object.keys(UserRole).find((key) => UserRole[key as keyof typeof UserRole] === role),
        );

        expect(names.every((name) => name && card.includes(`UserRole.${name}`))).toBe(true);
        expect(card).toContain('isSuperAdmin');
        expect(card).toContain('isTechnicalAccount');
    });

    it('only has synonyms for ids that exist', () => {
        const known = new Set<string>([...SEARCH_TILES.map((tile) => tile.id), ...EXTRA_PAGES.map((page) => page.id)]);
        const strangers = Object.keys(SEARCH_KEYWORDS).filter((id) => !known.has(id));

        expect(strangers).toEqual([]);
    });

    it('gives every tile some synonyms or at least a title that is worth searching', () => {
        expect(SEARCH_TILES.every((tile) => en[tile.titleKey].length > 2)).toBe(true);
    });
});
