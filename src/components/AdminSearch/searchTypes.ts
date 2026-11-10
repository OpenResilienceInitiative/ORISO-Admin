/**
 * Types shared by the admin-wide search (index, engine and view).
 *
 * The search finds five kinds of things (`SearchKind`), shown in six groups. A
 * "setting" is a tile or a control inside a tile ("Allow group chat"); that is
 * what people type most often and what the navigation alone cannot reach.
 */

export type SearchKind = 'page' | 'tab' | 'setting' | 'topic' | 'department' | 'tenant' | 'agency' | 'account';

/** Where a setting lives. `personal` is "My account". */
export type SearchLevel = 'platform' | 'tenant' | 'agency' | 'personal';

export const SEARCH_LEVELS: SearchLevel[] = ['platform', 'tenant', 'agency'];

/** Groups in the order the view shows them. */
export type SearchGroup = 'settings' | 'pages' | 'topics' | 'departments' | 'tenants' | 'agencies' | 'accounts';

export const SEARCH_GROUPS: SearchGroup[] = [
    'settings',
    'pages',
    'topics',
    'departments',
    'tenants',
    'agencies',
    'accounts',
];

export const GROUP_OF_KIND: Record<SearchKind, SearchGroup> = {
    setting: 'settings',
    page: 'pages',
    tab: 'pages',
    topic: 'topics',
    department: 'departments',
    tenant: 'tenants',
    agency: 'agencies',
    account: 'accounts',
};

/** Weighted word lists a document can be found by. */
export interface SearchTerms {
    /** Title in every language (current UI language first, then de, en). */
    title: string[];
    /** Labels of controls inside the tile ("Allow group chat"). */
    fields: string[];
    /** Curated synonyms, both languages. */
    synonyms: string[];
    /** Tile description / helper text. */
    description: string[];
    /** Breadcrumb words ("Settings", "Legal"). */
    context: string[];
}

export interface SearchDoc {
    id: string;
    kind: SearchKind;
    /** Title in the current UI language: what the row shows and what gets highlighted. */
    title: string;
    /** One line under the title, current language. */
    description?: string;
    /** "Settings › Legal"; the row appends nothing, the title is the last crumb. */
    breadcrumb: string[];
    to: string;
    /** Scroll to and highlight this tile after navigating (the `Card` `titleKey`). */
    tileKey?: string;
    level?: SearchLevel;
    /** The user may open it but not change it. */
    readOnly?: boolean;
    /** The destination is a list: an entity still has to be picked there. */
    needsPick?: boolean;
    terms: SearchTerms;
}

export interface SearchFilters {
    kinds?: SearchGroup[];
    levels?: SearchLevel[];
}

export type MatchedField = keyof SearchTerms;

export interface SearchHit {
    doc: SearchDoc;
    score: number;
    /** Which field made the hit; the row names it when it is not the title. */
    matchedField: MatchedField;
    /** The text of `matchedField` that matched (for the "also found in" line). */
    matchedText?: string;
    /** [start, end) ranges inside `doc.title` to highlight. */
    titleRanges: Array<[number, number]>;
}
