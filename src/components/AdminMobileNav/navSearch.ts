/**
 * Search over the admin's navigation destinations (ORISO-Admin#1319).
 *
 * Pure on purpose: no React, no i18n. The caller hands in every destination the
 * signed-in admin may open, each with its labels in every language and the
 * curated keywords from `navKeywords.ts`; this module only ranks them.
 *
 * Matching is deliberately forgiving because the query is typed on a phone:
 * case, umlauts (`loeschen` = `löschen`), separators (`e-mail` = `email`),
 * partial words (`stamm` → Stammdaten) and one or two typos (`Emial`) all
 * match. Language does not matter: every destination carries German and
 * English words at the same time.
 */

export interface NavSearchEntry {
    /** Stable id, also the key into `NAV_KEYWORDS`. */
    id: string;
    /** Label in the current UI language — what the result row shows. */
    label: string;
    /** Route to open. */
    to: string;
    /** Label of the parent section, shown as context ("Einstellungen"). */
    sectionLabel?: string;
    /** Every other word that should find this entry: other-language labels, synonyms. */
    terms: string[];
}

export interface NavSearchResult {
    entry: NavSearchEntry;
    score: number;
}

/** Lowercase, fold umlauts/accents to ASCII, unify separators. */
export const normalizeSearchText = (value: string): string =>
    value
        .toLowerCase()
        .replace(/ä/g, 'ae')
        .replace(/ö/g, 'oe')
        .replace(/ü/g, 'ue')
        .replace(/ß/g, 'ss')
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

const tokenize = (value: string): string[] => normalizeSearchText(value).split(' ').filter(Boolean);

/** Optimal string alignment distance (Levenshtein + adjacent transposition), capped. */
export const editDistance = (a: string, b: string, max: number): number => {
    if (Math.abs(a.length - b.length) > max) {
        return max + 1;
    }

    const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i]);

    for (let j = 1; j <= b.length; j += 1) {
        rows[0][j] = j;
    }

    for (let i = 1; i <= a.length; i += 1) {
        let rowMin = Number.POSITIVE_INFINITY;

        for (let j = 1; j <= b.length; j += 1) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            let value = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);

            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                value = Math.min(value, rows[i - 2][j - 2] + 1);
            }

            rows[i][j] = value;
            rowMin = Math.min(rowMin, value);
        }

        if (rowMin > max) {
            return max + 1;
        }
    }

    return rows[a.length][b.length];
};

/** Typos allowed for a query word of this length: none for very short words. */
const allowedTypos = (length: number): number => {
    if (length <= 3) return 0;
    if (length <= 6) return 1;
    return 2;
};

/**
 * How well one query word matches one indexed word, 0 = not at all.
 * Exact beats prefix beats "inside a compound" beats typo.
 */
const scoreWord = (query: string, word: string): number => {
    if (word === query) return 100;
    if (word.startsWith(query)) return 80;
    // German compounds: "server" must find "mailserver", "schutz" "datenschutz".
    if (query.length >= 4 && word.includes(query)) return 60;

    const typos = allowedTypos(query.length);

    if (typos === 0) return 0;

    // Compare against the whole word and against its prefix of the query's
    // length, so a typo in an unfinished word ("Stamd") still finds "stammdaten".
    const whole = editDistance(query, word, typos);
    const prefix = word.length > query.length ? editDistance(query, word.slice(0, query.length), typos) : whole;
    const distance = Math.min(whole, prefix);

    return distance <= typos ? 50 - distance * 10 : 0;
};

/**
 * Ranks entries for `query`. Every query word has to match some word of the
 * entry (AND), so "mail server" narrows rather than widens. Words from the
 * visible label weigh more than keywords, so the obvious hit comes first.
 */
export const searchNav = (entries: NavSearchEntry[], query: string, limit = 12): NavSearchResult[] => {
    const queryWords = tokenize(query);

    if (!queryWords.length) {
        return [];
    }

    const results: NavSearchResult[] = [];

    entries.forEach((entry) => {
        const labelWords = tokenize(`${entry.label} ${entry.sectionLabel ?? ''}`);
        const termWords = entry.terms.flatMap(tokenize);
        // Multi-word keywords also match glued together ("mailserver" ↔ "mail server").
        const joinedTerms = entry.terms.map((term) => normalizeSearchText(term).replace(/ /g, ''));
        const joinedQuery = queryWords.join('');
        let total = 0;

        const everyWordMatches = queryWords.every((queryWord) => {
            const best = Math.max(
                ...labelWords.map((word) => scoreWord(queryWord, word) * 1.2),
                ...termWords.map((word) => scoreWord(queryWord, word)),
                0,
            );

            total += best;

            return best > 0;
        });

        let score = everyWordMatches ? total / queryWords.length : 0;

        if (queryWords.length > 1) {
            const glued = Math.max(...joinedTerms.map((term) => scoreWord(joinedQuery, term)), 0);

            score = Math.max(score, glued);
        }

        if (score > 0) {
            results.push({ entry, score });
        }
    });

    return results.sort((a, b) => b.score - a.score || a.entry.label.localeCompare(b.entry.label)).slice(0, limit);
};
