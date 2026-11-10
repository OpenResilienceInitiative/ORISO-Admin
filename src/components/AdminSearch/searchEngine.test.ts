import { describe, expect, it } from 'vite-plus/test';
import { groupHits, highlightRanges, prepareIndex, scoreWord, searchIndex } from './searchEngine';
import { buildFixturePrepared, buildFixtureIndex, type FixtureOptions } from './searchFixtures';
import type { SearchDoc } from './searchTypes';

const doc = (id: string, title: string, extra: Partial<SearchDoc> = {}): SearchDoc => ({
    id,
    kind: 'setting',
    title,
    breadcrumb: [title],
    to: `/${id}`,
    terms: { title: [title], fields: [], synonyms: [], description: [], context: [] },
    ...extra,
});

describe('scoreWord', () => {
    it('ranks exact over inflected over prefix over compound over typo', () => {
        const exact = scoreWord('server', 'server');
        const inflected = scoreWord('servers', 'server');
        const prefix = scoreWord('ser', 'server');
        const compound = scoreWord('server', 'mailserver');
        const typo = scoreWord('sever', 'server');

        expect(exact).toBeGreaterThan(inflected);
        expect(inflected).toBeGreaterThan(prefix);
        expect(prefix).toBeGreaterThan(compound);
        expect(compound).toBeGreaterThan(typo);
        expect(typo).toBeGreaterThan(0);
    });

    it('allows no typos in very short words', () => {
        expect(scoreWord('ab', 'ac')).toBe(0);
        expect(scoreWord('sms', 'smt')).toBe(0);
    });

    it('finds a typo in an unfinished word', () => {
        expect(scoreWord('stamd', 'stammdaten')).toBeGreaterThan(0);
    });

    // Found by trying the search in the browser: "privacy" brought up the colours ("primary colour").
    it('allows one typo up to seven letters, two from eight on', () => {
        expect(scoreWord('privacy', 'primary')).toBe(0);
        expect(scoreWord('privacy', 'private')).toBe(0);
        expect(scoreWord('passwrd', 'password')).toBeGreaterThan(0);
        expect(scoreWord('beratungsstele', 'beratungsstelle')).toBeGreaterThan(0);
    });

    it('does not take a four-letter stem for a prefix', () => {
        expect(scoreWord('server', 'service')).toBe(0);
        expect(scoreWord('servers', 'server')).toBeGreaterThan(0);
    });
});

describe('searchIndex on a small index', () => {
    const index = prepareIndex([
        doc('a', 'Email server', {
            terms: {
                title: ['Email server'],
                fields: [],
                synonyms: ['smtp'],
                description: ['Outgoing mail'],
                context: [],
            },
        }),
        doc('b', 'Legal notice', {
            terms: {
                title: ['Legal notice', 'Impressum'],
                fields: ['Responsible person'],
                synonyms: [],
                description: [],
                context: [],
            },
        }),
        doc('c', 'Privacy policy', {
            terms: {
                title: ['Privacy policy', 'Datenschutzerklärung'],
                fields: [],
                synonyms: [],
                description: ['mentions the email address'],
                context: [],
            },
        }),
    ]);

    it('requires every query word (AND)', () => {
        expect(searchIndex(index, 'legal policy')).toEqual([]);
        expect(searchIndex(index, 'legal notice').map((hit) => hit.doc.id)).toEqual(['b']);
    });

    it('lets a title beat a description', () => {
        const hits = searchIndex(index, 'email');

        expect(hits.map((hit) => hit.doc.id)).toEqual(['a', 'c']);
        expect(hits[0].matchedField).toBe('title');
        expect(hits[1].matchedField).toBe('description');
    });

    it('finds by the other language and says which text matched', () => {
        const [hit] = searchIndex(index, 'impressum');

        expect(hit.doc.id).toBe('b');
        expect(hit.matchedText).toBe('Impressum');
        // The row shows the current title, so nothing in it is highlighted for a foreign word.
        expect(hit.titleRanges).toEqual([]);
    });

    it('finds by umlaut spelling and by typo', () => {
        expect(searchIndex(index, 'datenschutzerklaerung')[0].doc.id).toBe('c');
        expect(searchIndex(index, 'Datenschutzerklaerng')[0].doc.id).toBe('c');
    });

    it('lets one word of a long question go missing when nothing matches all', () => {
        const hits = searchIndex(index, 'smtp outgoing banana');

        expect(hits[0].doc.id).toBe('a');
    });

    it('returns nothing for an empty or blank query', () => {
        expect(searchIndex(index, '')).toEqual([]);
        expect(searchIndex(index, '   ')).toEqual([]);
    });

    it('applies the kind and level filters', () => {
        const filtered = prepareIndex([
            doc('p', 'Support address', { level: 'platform' }),
            doc('t', 'Support contact', { level: 'tenant', kind: 'page' }),
        ]);

        expect(searchIndex(filtered, 'support', { levels: ['tenant'] }).map((hit) => hit.doc.id)).toEqual(['t']);
        expect(searchIndex(filtered, 'support', { kinds: ['settings'] }).map((hit) => hit.doc.id)).toEqual(['p']);
        expect(searchIndex(filtered, 'support', { kinds: ['settings'], levels: ['tenant'] })).toEqual([]);
    });
});

describe('highlightRanges', () => {
    it('marks the matching word, mapped back through umlauts', () => {
        expect(highlightRanges('Größe ändern', ['aendern'])).toEqual([[6, 12]]);
    });

    it('marks only the typed part of a longer word', () => {
        expect(highlightRanges('Stammdaten', ['stamm'])).toEqual([[0, 5]]);
    });

    it('marks the part of a compound', () => {
        expect(highlightRanges('Mailserver', ['server'])).toEqual([[4, 10]]);
    });

    it('merges neighbouring marks', () => {
        expect(highlightRanges('Group chat', ['group', 'chat'])).toEqual([
            [0, 5],
            [6, 10],
        ]);
    });
});

describe('groupHits', () => {
    it('puts the group with the best hit first and caps each group', () => {
        const index = prepareIndex([
            doc('s1', 'Mail one'),
            doc('s2', 'Mail two'),
            doc('s3', 'Mail three'),
            doc('p1', 'Mail', { kind: 'page' }),
        ]);
        const groups = groupHits(searchIndex(index, 'mail'), 2);

        expect(groups[0].group).toBe('pages');
        expect(groups[1].group).toBe('settings');
        expect(groups[1].hits).toHaveLength(2);
        expect(groups[1].more).toBe(1);
    });
});

/**
 * The part that must be right: real queries, German and English, against the index each role
 * really sees (real nav builders, real locale files). `top` is what a person typing this
 * expects first; `within` must also be among the first hits.
 */
interface Case {
    options: FixtureOptions;
    query: string;
    /** Accepted first hit(s): a registry id, matched as prefix of the doc id. */
    top: string | string[];
    within?: string[];
    topN?: number;
}

const PLATFORM_EN: FixtureOptions = { role: 'platform', language: 'en', singleDomain: false };
const PLATFORM_DE: FixtureOptions = { role: 'platform', language: 'de', singleDomain: false };
const TENANT_DE: FixtureOptions = { role: 'tenant', language: 'de', singleDomain: false };
const TENANT_EN: FixtureOptions = { role: 'tenant', language: 'en', singleDomain: true };

const CASES: Case[] = [
    // E-mail, in every spelling
    { options: PLATFORM_EN, query: 'e-mail', top: 'settings:smtp' },
    { options: PLATFORM_DE, query: 'E-Mail', top: 'settings:smtp' },
    { options: PLATFORM_EN, query: 'mail server', top: 'settings:smtp' },
    { options: PLATFORM_DE, query: 'Mailserver', top: 'settings:smtp' },
    { options: PLATFORM_EN, query: 'smtp', top: 'smtp:server' },
    { options: PLATFORM_DE, query: 'Emial', top: ['settings:smtp', 'smtp:'] },
    // Legal, both names for one thing, UI language irrelevant
    { options: PLATFORM_EN, query: 'imprint', top: 'legal:imprint' },
    { options: PLATFORM_DE, query: 'Impressum', top: 'legal:imprint' },
    { options: PLATFORM_EN, query: 'legal notice', top: 'legal:imprint' },
    { options: PLATFORM_EN, query: 'privacy', top: 'legal:privacy' },
    { options: PLATFORM_DE, query: 'Datenschutz', top: 'legal:privacy' },
    { options: PLATFORM_DE, query: 'Datenschtuz', top: 'legal:privacy' },
    { options: PLATFORM_EN, query: 'dpa', top: 'legal:contracts' },
    { options: PLATFORM_DE, query: 'Vertrag', top: 'legal:contracts' },
    // Group chat in two languages and two roles
    { options: TENANT_DE, query: 'Gruppenchat', top: 'access:group-internal', within: ['app:other'] },
    { options: TENANT_EN, query: 'group chat', top: 'access:group-internal', within: ['app:other'] },
    { options: PLATFORM_EN, query: 'group chat', top: 'access:group-internal' },
    // Passwords and security, typed as a question, umlaut-free, or with the number
    { options: PLATFORM_DE, query: 'Passwort ändern', top: 'account:password' },
    { options: PLATFORM_DE, query: 'passwort aendern', top: 'account:password' },
    { options: PLATFORM_EN, query: 'change password', top: 'account:password' },
    { options: PLATFORM_DE, query: 'wie ändere ich mein passwort', top: 'account:password' },
    { options: PLATFORM_EN, query: 'two factor', top: 'account:two-factor' },
    { options: PLATFORM_DE, query: '2FA', top: 'account:two-factor' },
    // Look and feel
    { options: PLATFORM_DE, query: 'Farben', top: 'appearance:colors' },
    { options: PLATFORM_EN, query: 'colours', top: 'appearance:colors' },
    { options: PLATFORM_DE, query: 'Logo', top: 'appearance:images' },
    { options: TENANT_DE, query: 'Sprachen', top: 'appearance:languages' },
    { options: PLATFORM_DE, query: 'Sprache', top: 'account:language' },
    // Topics and Fachbereiche must be reachable (the page has no menu entry)
    { options: PLATFORM_DE, query: 'Themen', top: 'page:topics' },
    { options: PLATFORM_EN, query: 'topics', top: 'page:topics', within: ['global:one-topic'] },
    { options: PLATFORM_DE, query: 'Fachbereiche', top: ['global:one-topic', 'page:topics'], within: ['page:topics'] },
    // Pages and lists
    { options: PLATFORM_DE, query: 'Träger', top: 'page:tenants' },
    // The English page is labelled "Providers" since the glossary alignment of the English copy.
    { options: PLATFORM_EN, query: 'providers', top: 'page:tenants' },
    { options: PLATFORM_EN, query: 'tenants', top: 'page:tenants' },
    { options: PLATFORM_DE, query: 'Beratungsstellen', top: 'page:agency' },
    { options: PLATFORM_DE, query: 'Beratungsstelle anlegen', top: 'page:found-agency' },
    { options: PLATFORM_DE, query: 'Beratende', top: 'users:counsellors' },
    { options: PLATFORM_EN, query: 'counsellors', top: 'users:counsellors' },
    { options: PLATFORM_DE, query: 'Einladen', top: 'page:links' },
    { options: PLATFORM_EN, query: 'invite', top: 'page:links' },
    { options: PLATFORM_DE, query: 'Stammdaten', top: 'settings:master-data' },
    // Logs
    { options: PLATFORM_DE, query: 'Löschprotokoll', top: 'logs:deletions' },
    { options: PLATFORM_EN, query: 'delete log', top: 'logs:deletions' },
    { options: TENANT_DE, query: 'supervision', top: 'logs:supervisors' },
    // Settings the navigation cannot reach
    { options: PLATFORM_DE, query: 'Wartung', top: ['notices:draft', 'settings:service-notices'] },
    { options: PLATFORM_EN, query: 'maintenance', top: ['notices:draft', 'settings:service-notices'] },
    { options: PLATFORM_DE, query: 'Fallübergabe', top: ['access:case-handover', 'logs:case-handover'] },
    { options: PLATFORM_EN, query: 'api key', top: 'global:translation' },
    { options: PLATFORM_DE, query: 'PLZ', top: 'global:postcode' },
    // A Träger setting that only exists on the multi-tenant domain.
    { options: TENANT_DE, query: 'Videoberatung', top: 'app:communication' },
];

describe('real queries against the index of a role', () => {
    const cache = new Map<string, ReturnType<typeof buildFixturePrepared>>();
    const indexFor = (options: FixtureOptions) => {
        const key = JSON.stringify(options);

        if (!cache.has(key)) {
            cache.set(key, buildFixturePrepared(options));
        }

        return cache.get(key) as ReturnType<typeof buildFixturePrepared>;
    };

    it('has at least 25 queries in both languages', () => {
        expect(CASES.length).toBeGreaterThanOrEqual(25);
    });

    it.each(
        CASES.map(
            (testCase) =>
                [`${testCase.options.role}/${testCase.options.language} "${testCase.query}"`, testCase] as const,
        ),
    )('%s', (_name, { options, query, top, within = [], topN = 3 }) => {
        const hits = searchIndex(indexFor(options), query);
        const ids = hits.map((hit) => hit.doc.id);
        const accepted = Array.isArray(top) ? top : [top];

        expect(hits.length, `no hit for "${query}"`).toBeGreaterThan(0);
        expect(
            accepted.some((id) => ids[0].startsWith(id)),
            `first hit for "${query}" was ${ids[0]} (${hits[0].doc.title}), wanted ${accepted.join(' or ')}; got ${ids
                .slice(0, 5)
                .join(', ')}`,
        ).toBe(true);
        within.forEach((id) =>
            expect(
                ids.slice(0, topN + 2).some((candidate) => candidate.startsWith(id)),
                `${id} should be near the top for "${query}": ${ids.slice(0, 6).join(', ')}`,
            ).toBe(true),
        );
    });
});

/**
 * The queries the retired mobile-menu search (ORISO-Admin#1319) was built for. The app-wide search
 * replaced it, so everything it found must still be found: the old destination (or the setting
 * inside it) has to be among the first hits.
 */
const RETIRED_MOBILE_SEARCH: Array<[string, string[]]> = [
    ['smtp', ['settings:smtp', 'smtp:']],
    ['mail server', ['settings:smtp', 'smtp:']],
    ['Mailserver', ['settings:smtp', 'smtp:']],
    ['Emial', ['settings:smtp', 'smtp:']],
    ['Datenschutz', ['settings:legal', 'legal:privacy']],
    ['privacy', ['settings:legal', 'legal:privacy']],
    ['impressum', ['settings:legal', 'legal:imprint']],
    ['berater', ['users:counsellors']],
    ['counsellor', ['users:counsellors']],
    ['counselor', ['users:counsellors']],
    ['loeschen', ['logs:deletions']],
    ['löschen', ['logs:deletions']],
    ['deleted', ['logs:deletions']],
    ['Farbe', ['settings:general', 'appearance:colors']],
    ['colour', ['settings:general', 'appearance:colors']],
    ['appearance', ['settings:general', 'appearance:']],
    ['Stammdatn', ['settings:master-data']],
    ['handover', ['logs:case-handover', 'access:case-handover']],
    ['Fallübergabe', ['logs:case-handover', 'access:case-handover']],
    ['permissions', ['settings:permissions', 'access:']],
    ['Live-Chat-Links', ['settings:permissions', 'access:']],
    ['inbound', ['settings:permissions', 'access:']],
    ['Beratungsstele', ['page:agency']],
];

describe('the queries of the retired mobile menu search still work', () => {
    const prepared = buildFixturePrepared(PLATFORM_DE);

    it.each(RETIRED_MOBILE_SEARCH)('"%s"', (query, wanted) => {
        const ids = searchIndex(prepared, query)
            .slice(0, 6)
            .map((hit) => hit.doc.id);

        expect(
            wanted.some((id) => ids.some((candidate) => candidate.startsWith(id))),
            `"${query}" should reach ${wanted.join(' or ')} in the first hits, got ${ids.join(', ')}`,
        ).toBe(true);
    });

    it('still narrows with every word and ignores nonsense', () => {
        expect(searchIndex(prepared, 'xqzvw')).toEqual([]);
        expect(searchIndex(prepared, '   ')).toEqual([]);
    });
});

describe('the fixture index itself', () => {
    it('has no duplicate ids', () => {
        const ids = buildFixtureIndex(PLATFORM_EN).map((entry) => entry.id);

        expect(new Set(ids).size).toBe(ids.length);
    });
});
