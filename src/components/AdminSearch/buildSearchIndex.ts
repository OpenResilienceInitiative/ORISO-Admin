import routePathNames from '../../appConfig';
import { PermissionAction } from '../../enums/PermissionAction';
import { Resource } from '../../enums/Resource';
import type { AdminNavSubsection } from '../Layout/adminNavTree';
import {
    AGENCY_TABS,
    EXTRA_PAGES,
    NAV_KEY_OF_SUB_PREFIX,
    NAV_TITLE_KEYS,
    SEARCH_TILES,
    TENANT_TABS,
    TILE_GATES,
    type EntityTab,
    type RegistryTile,
    type SearchContext,
} from './searchRegistry';
import { keywordsFor } from './searchKeywords';
import type { SearchDoc, SearchLevel, SearchTerms } from './searchTypes';

/** Languages the search always covers, whatever the UI language. */
export const SEARCH_LANGUAGES = ['de', 'en'] as const;

/**
 * Looks a key up in one language: the current UI language (`'current'`) or a fixed one.
 * Returns `undefined` when the key has no text, so a missing translation can never
 * end up in the index as a raw key.
 */
export type Translate = (language: 'current' | (typeof SEARCH_LANGUAGES)[number], key: string) => string | undefined;

export interface BuildSearchIndexInput {
    context: SearchContext;
    /** Subsections per nav key, from `buildAdminNavTree` (only what this admin may open). */
    tree: Record<string, AdminNavSubsection[]>;
    translate: Translate;
}

const unique = (values: Array<string | undefined>): string[] =>
    Array.from(new Set(values.filter((value): value is string => !!value && value.trim() !== '')));

/** Title in every language: current first, then German and English. */
const allLanguages = (translate: Translate, key: string, fallbackKey?: string): string[] =>
    unique(
        (['current', ...SEARCH_LANGUAGES] as const).map(
            (language) => translate(language, key) ?? (fallbackKey ? translate(language, fallbackKey) : undefined),
        ),
    );

const currentTitle = (translate: Translate, key: string, fallbackKey?: string): string =>
    translate('current', key) ?? (fallbackKey ? translate('current', fallbackKey) : undefined) ?? key;

const emptyTerms = (): SearchTerms => ({ title: [], fields: [], synonyms: [], description: [], context: [] });

/** `settings:legal` → level by role: the same tab is the platform's own for a platform admin. */
const levelOfSub = (id: string, isSuperAdmin: boolean): SearchLevel | undefined => {
    if (id.startsWith('settings:')) {
        return isSuperAdmin ? 'platform' : 'tenant';
    }
    switch (id) {
        case 'users:platform-admins':
            return 'platform';
        case 'users:tenant-admins':
            return 'tenant';
        case 'users:agency-admins':
        case 'users:counsellors':
            return 'agency';
        default:
            return undefined;
    }
};

const descriptionKeyOf = (tile: RegistryTile): string | undefined =>
    tile.descriptionKey ??
    (tile.titleKey.endsWith('.title') ? `${tile.titleKey.slice(0, -'.title'.length)}.description` : undefined);

interface Parent {
    to: string;
    /** Breadcrumb up to and excluding the tile. */
    breadcrumb: string[];
    /** Words of the breadcrumb in every language, for the weak "context" field. */
    contextTerms: string[];
    level?: SearchLevel;
    readOnly: boolean;
}

/**
 * Builds the searchable index for one admin: only destinations they may open, titles
 * and texts in German and English at the same time (plus the current language, which
 * is what rows display), the curated synonyms, and the labels of controls inside tiles.
 */
export const buildSearchIndex = ({ context, tree, translate }: BuildSearchIndexInput): SearchDoc[] => {
    const docs: SearchDoc[] = [];
    const subs = Object.values(tree).flat();
    const navTitle = (navKey: string) => currentTitle(translate, NAV_TITLE_KEYS[navKey]);
    const canUpdateTenant = context.can(PermissionAction.Update, Resource.Tenant);
    const canUpdateAgency = context.can(PermissionAction.Update, Resource.Agency);

    // ── Sections the sidebar shows ───────────────────────────────────────────
    Object.entries(context.navTo).forEach(([navKey, to]) => {
        const titleKey = NAV_TITLE_KEYS[navKey];

        if (!titleKey) {
            return;
        }

        const descriptionKey = `mobileNav.section.${navKey}.description`;
        const description = translate('current', descriptionKey);

        docs.push({
            id: `page:${navKey}`,
            kind: 'page',
            title: navTitle(navKey),
            description,
            breadcrumb: [navTitle(navKey)],
            to,
            terms: {
                ...emptyTerms(),
                title: allLanguages(translate, titleKey),
                synonyms: keywordsFor(navKey),
                description: unique(SEARCH_LANGUAGES.map((language) => translate(language, descriptionKey))),
            },
        });
    });

    // ── Tabs of those sections ───────────────────────────────────────────────
    subs.forEach((sub) => {
        const prefix = sub.id.split(':')[0];
        const navKey = NAV_KEY_OF_SUB_PREFIX[prefix];

        if (!navKey || !context.navTo[navKey]) {
            return;
        }

        const title = currentTitle(translate, sub.labelKey, sub.fallbackKey);
        const section = navTitle(navKey);

        docs.push({
            id: sub.id,
            kind: 'tab',
            title,
            breadcrumb: [section, title],
            to: sub.to,
            level: levelOfSub(sub.id, context.isSuperAdmin),
            readOnly: sub.id.startsWith('settings:') && !canUpdateTenant,
            terms: {
                ...emptyTerms(),
                title: allLanguages(translate, sub.labelKey, sub.fallbackKey),
                synonyms: keywordsFor(sub.id),
                context: allLanguages(translate, NAV_TITLE_KEYS[navKey]),
            },
        });
    });

    // ── Pages without a menu entry, and actions ──────────────────────────────
    EXTRA_PAGES.forEach((page) => {
        const to = page.to(context);

        if (!to || (page.gate && !page.gate(context))) {
            return;
        }

        const title = currentTitle(translate, page.titleKey);

        docs.push({
            id: page.id,
            kind: 'page',
            title,
            description: page.descriptionKey ? translate('current', page.descriptionKey) : undefined,
            breadcrumb: [title],
            to,
            level: page.level,
            terms: {
                ...emptyTerms(),
                title: allLanguages(translate, page.titleKey),
                synonyms: keywordsFor(page.id),
                description: page.descriptionKey
                    ? unique(SEARCH_LANGUAGES.map((language) => translate(language, page.descriptionKey as string)))
                    : [],
            },
        });
    });

    // ── Where tiles can live ─────────────────────────────────────────────────
    const parents = new Map<string, Parent>();
    const tabTerms = (key: string, fallback?: string) => allLanguages(translate, key, fallback);

    subs.filter((sub) => sub.id.startsWith('settings:')).forEach((sub) => {
        const title = currentTitle(translate, sub.labelKey, sub.fallbackKey);

        parents.set(sub.id, {
            to: sub.to,
            breadcrumb: [navTitle('theme'), title],
            contextTerms: [...tabTerms(NAV_TITLE_KEYS.theme), ...tabTerms(sub.labelKey, sub.fallbackKey)],
            level: levelOfSub(sub.id, context.isSuperAdmin),
            readOnly: !canUpdateTenant,
        });
    });

    if (context.navTo.account) {
        parents.set('page:account', {
            to: context.navTo.account,
            breadcrumb: [navTitle('account')],
            contextTerms: tabTerms(NAV_TITLE_KEYS.account),
            level: 'personal',
            readOnly: false,
        });
    }

    const addEntityTabs = (
        tabs: EntityTab[],
        base: string,
        entity: { id: string; name?: string } | undefined,
        rootNavKey: string,
        level: SearchLevel,
        readOnly: boolean,
    ) => {
        if (!entity || !context.navTo[rootNavKey]) {
            return;
        }

        tabs.forEach((tab) => {
            const title = currentTitle(translate, tab.titleKey);
            const to = `${base}/${entity.id}/${tab.path}`;
            const breadcrumb = unique([navTitle(rootNavKey), entity.name, title]);

            parents.set(tab.id, {
                to,
                breadcrumb,
                contextTerms: unique([entity.name, ...tabTerms(NAV_TITLE_KEYS[rootNavKey]), ...tabTerms(tab.titleKey)]),
                level,
                readOnly,
            });
            docs.push({
                id: `${tab.id}@${entity.id}`,
                kind: 'tab',
                title,
                breadcrumb,
                to,
                level,
                readOnly,
                terms: {
                    ...emptyTerms(),
                    title: tabTerms(tab.titleKey),
                    context: unique([entity.name, ...tabTerms(NAV_TITLE_KEYS[rootNavKey])]),
                },
            });
        });
    };

    // A Träger in context is only ever the platform admin's (`/admin/tenants` is theirs).
    if (context.isSuperAdmin) {
        addEntityTabs(
            context.tenant
                ? TENANT_TABS.filter((tab) => tab.id !== 'tenant:global-settings' || context.isSuperAdmin)
                : [],
            routePathNames.tenants,
            context.tenant,
            'tenants',
            'tenant',
            !canUpdateTenant,
        );
    }
    addEntityTabs(AGENCY_TABS, routePathNames.agency, context.agency, 'agency', 'agency', !canUpdateAgency);

    // ── Tiles ────────────────────────────────────────────────────────────────
    SEARCH_TILES.forEach((tile) => {
        if (tile.gate && !TILE_GATES[tile.gate](context)) {
            return;
        }

        const title = currentTitle(translate, tile.titleKey);
        const descriptionKey = descriptionKeyOf(tile);
        const description = descriptionKey ? translate('current', descriptionKey) : undefined;
        const descriptionTerms = descriptionKey
            ? unique(SEARCH_LANGUAGES.map((language) => translate(language, descriptionKey)))
            : [];
        const fieldTerms = unique(
            (tile.fieldKeys ?? []).flatMap((key) =>
                (['current', ...SEARCH_LANGUAGES] as const).map((language) => translate(language, key)),
            ),
        );

        tile.parents.forEach((parentId) => {
            const parent = parents.get(parentId);

            if (!parent) {
                return;
            }

            docs.push({
                id: `${tile.id}@${parentId}`,
                kind: 'setting',
                title,
                description,
                breadcrumb: [...parent.breadcrumb, title],
                to: parent.to,
                tileKey: tile.titleKey,
                level: tile.level ?? parent.level,
                readOnly: parent.readOnly || undefined,
                terms: {
                    title: allLanguages(translate, tile.titleKey),
                    fields: fieldTerms,
                    synonyms: keywordsFor(tile.id),
                    description: descriptionTerms,
                    context: parent.contextTerms,
                },
            });
        });
    });

    return docs;
};
