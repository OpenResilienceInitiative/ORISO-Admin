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

            // As a whole quoted string: `a.title` must not be satisfied by `a.titleRenamed` or `a.title.text`.
            const quoted = new RegExp(`['"\`]${tile.titleKey.replace(/\./g, '\\.')}['"\`]`);

            return quoted.test(readFileSync(file, 'utf8'))
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

    it('keeps the live-chat tile off the Träger page that excludes that card', () => {
        const page = readFileSync(resolve(root, 'src/pages/Tenants/Edit/GlobalSettings/index.tsx'), 'utf8');
        const tile = SEARCH_TILES.find((entry) => entry.id === 'access:live-chat');

        expect(page).toContain("excludeCardKeys={['liveChat']}");
        expect(tile?.parents).not.toContain('tenant:global-settings');
        expect(tile?.parents.length).toBeGreaterThan(0);
    });

    it('gates the documentation tile with the setting the profile page uses', () => {
        const profile = readFileSync(resolve(root, 'src/pages/Profile/UserProfile.tsx'), 'utf8');
        const tile = SEARCH_TILES.find((entry) => entry.id === 'account:documentation');

        expect(tile?.gate).toBe('documentation');
        expect(profile).toMatch(/settings\.documentationEnabled\s*&&/);
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
