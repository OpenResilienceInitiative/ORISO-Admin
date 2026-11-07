import { editDistance, fold, foldWithMap, queryWords, stem } from './searchText';
import {
    GROUP_OF_KIND,
    SEARCH_GROUPS,
    type MatchedField,
    type SearchDoc,
    type SearchFilters,
    type SearchGroup,
    type SearchHit,
} from './searchTypes';

/**
 * The matcher of the admin search: small, local, no dependency.
 *
 * Forgiving where people type fast (case, umlauts `ae`/`ä`, `e-mail` = `email`,
 * partial words, one or two typos, plurals, German compounds), strict where it
 * matters (every meaningful word of the query has to be found, title beats
 * control label beats synonym beats description).
 */

/** How much a match in each field counts. */
const FIELD_WEIGHT: Record<MatchedField, number> = {
    title: 1,
    fields: 0.62,
    synonyms: 0.52,
    description: 0.2,
    context: 0.15,
};

/** At equal text score the most specific thing wins: tile, then tab, then page, then a person. */
const KIND_BIAS: Record<SearchDoc['kind'], number> = {
    setting: 1,
    tab: 0.995,
    page: 0.99,
    topic: 0.97,
    department: 0.96,
    tenant: 0.96,
    agency: 0.96,
    account: 0.95,
};

interface PreparedText {
    field: MatchedField;
    text: string;
    folded: string;
    glued: string;
    words: string[];
    stems: string[];
}

export interface PreparedDoc {
    doc: SearchDoc;
    texts: PreparedText[];
}

export type PreparedIndex = PreparedDoc[];

const prepareText = (field: MatchedField, text: string): PreparedText => {
    const folded = fold(text);
    const words = folded.split(' ').filter(Boolean);

    return { field, text, folded, glued: folded.replace(/ /g, ''), words, stems: words.map(stem) };
};

/** Folds every searchable text once; call again only when the index changes. */
export const prepareIndex = (docs: SearchDoc[]): PreparedIndex =>
    docs.map((doc) => ({
        doc,
        texts: (Object.keys(doc.terms) as MatchedField[]).flatMap((field) =>
            doc.terms[field].filter((text) => text && text.trim()).map((text) => prepareText(field, text)),
        ),
    }));

const allowedTypos = (length: number): number => {
    if (length <= 3) return 0;
    if (length <= 6) return 1;
    return 2;
};

/** How well one query word matches one indexed word (0 = not at all). */
export const scoreWord = (query: string, word: string, wordStem: string = stem(word)): number => {
    if (word === query) return 100;

    const queryStem = stem(query);

    if (queryStem.length >= 4 && wordStem === queryStem) return 92;
    if (query.length >= 2 && word.startsWith(query)) return 82;
    if (queryStem.length >= 4 && word.startsWith(queryStem)) return 76;
    // German compounds: "server" finds "mailserver", "schutz" finds "datenschutz".
    if (query.length >= 4 && word.includes(query)) return 60;

    const typos = allowedTypos(query.length);

    if (typos === 0) return 0;

    const whole = editDistance(query, word, typos);
    // Compare against the first letters too, so a typo in an unfinished word ("Stamd") still hits.
    const prefix = word.length > query.length ? editDistance(query, word.slice(0, query.length), typos) : whole;
    const distance = Math.min(whole, prefix);

    return distance <= typos ? 52 - distance * 10 : 0;
};

/** Score of the whole query as one phrase inside one text ("group chat" in "Group chat links"). */
const scorePhrase = (query: string, text: PreparedText): number => {
    if (!query.includes(' ')) {
        // One typed word against a title written in several ("mailserver" ↔ "E-Mail-Server").
        return query.length >= 5 && text.words.length > 1 && text.glued.includes(query) ? 68 : 0;
    }
    if (text.folded === query) return 100;
    if (text.folded.startsWith(`${query} `)) return 90;
    if (` ${text.folded} `.includes(` ${query} `)) return 80;
    // "mail server" ↔ "mailserver"
    const glued = query.replace(/ /g, '');
    if (glued.length >= 5 && text.glued.includes(glued)) return 68;

    return 0;
};

interface Scored {
    score: number;
    field: MatchedField;
    text?: PreparedText;
}

const scoreDoc = (prepared: PreparedDoc, words: string[], minWords: number): Scored | null => {
    const phraseQuery = words.join(' ');
    const bestPerWord: number[] = [];
    const fieldTotals = new Map<MatchedField, { total: number; text: PreparedText }>();
    let matched = 0;

    words.forEach((word) => {
        let best = 0;
        let bestText: PreparedText | undefined;

        prepared.texts.forEach((text) => {
            const weight = FIELD_WEIGHT[text.field];
            let wordBest = 0;

            text.words.forEach((candidate, index) => {
                wordBest = Math.max(wordBest, scoreWord(word, candidate, text.stems[index]));
            });

            const value = wordBest * weight;

            if (value > best) {
                best = value;
                bestText = text;
            }
        });

        bestPerWord.push(best);

        if (best > 0) {
            matched += 1;

            if (bestText) {
                const existing = fieldTotals.get(bestText.field);
                const total = (existing?.total ?? 0) + best;
                // Keep the text that scored highest for this field as the "found in" line.
                fieldTotals.set(bestText.field, {
                    total,
                    text: !existing || best >= existing.total ? bestText : existing.text,
                });
            }
        }
    });

    let wordScore = 0;

    if (matched >= minWords && matched > 0) {
        wordScore = bestPerWord.reduce((sum, value) => sum + value, 0) / words.length;
    }

    let phraseScore = 0;
    let phraseText: PreparedText | undefined;

    if (words.length >= 1) {
        prepared.texts.forEach((text) => {
            const value = scorePhrase(phraseQuery, text) * FIELD_WEIGHT[text.field];

            if (value > phraseScore) {
                phraseScore = value;
                phraseText = text;
            }
        });
    }

    if (Math.max(wordScore, phraseScore) <= 0) {
        return null;
    }

    if (phraseScore > wordScore && phraseText) {
        return { score: phraseScore, field: phraseText.field, text: phraseText };
    }

    // The field that carried most of the words is the one the row names.
    let field: MatchedField = 'title';
    let text: PreparedText | undefined;
    let top = -1;

    fieldTotals.forEach((entry, key) => {
        if (entry.total > top) {
            top = entry.total;
            field = key;
            text = entry.text;
        }
    });

    return { score: wordScore, field, text };
};

/** Ranges of `title` that carry the query words, merged. */
export const highlightRanges = (title: string, words: string[]): Array<[number, number]> => {
    const { folded, map } = foldWithMap(title);
    const ranges: Array<[number, number]> = [];
    let cursor = 0;

    folded.split(' ').forEach((candidate) => {
        const start = folded.indexOf(candidate, cursor);
        cursor = start + candidate.length;

        if (!candidate) {
            return;
        }

        words.forEach((word) => {
            if (scoreWord(word, candidate) < 50) {
                return;
            }

            let from = start;
            let to = start + candidate.length;

            if (word.length >= 2 && candidate.startsWith(word)) {
                to = start + word.length;
            } else if (word.length >= 4 && candidate.includes(word)) {
                from = start + candidate.indexOf(word);
                to = from + word.length;
            }

            ranges.push([map[from], map[to - 1] + 1]);
        });
    });

    ranges.sort((a, b) => a[0] - b[0]);

    return ranges.reduce<Array<[number, number]>>((merged, range) => {
        const last = merged[merged.length - 1];

        if (last && range[0] <= last[1]) {
            last[1] = Math.max(last[1], range[1]);
        } else {
            merged.push([range[0], range[1]]);
        }

        return merged;
    }, []);
};

/**
 * A title that is *only* the query beats one that merely contains it: exact title +12,
 * otherwise up to +10 by how much of the title the query words cover ("E-Mail-Server"
 * over "Vorschau der Einladungs-E-Mail" for "e-mail").
 */
const titleBonus = (prepared: PreparedDoc, words: string[]): number => {
    let bonus = 0;
    const isPage = prepared.doc.kind === 'page' || prepared.doc.kind === 'tab';

    prepared.texts.forEach((text) => {
        if (text.field !== 'title' || !text.words.length) {
            return;
        }
        if (text.folded === words.join(' ')) {
            // Same title on a page and a tile ("Topics"): the page is the destination itself.
            bonus = Math.max(bonus, isPage ? 14 : 12);
            return;
        }

        const allMatch = words.every((word) =>
            text.words.some((candidate, index) => scoreWord(word, candidate, text.stems[index]) >= 76),
        );

        if (allMatch) {
            bonus = Math.max(bonus, 10 * Math.min(1, words.length / text.words.length));
            return;
        }

        // One glued word ("mailserver") against a title written as "E-Mail-Server".
        const glued = text.words.join('');
        const gluedQuery = words.join('');

        if (gluedQuery.length >= 5 && glued.includes(gluedQuery)) {
            bonus = Math.max(bonus, 10 * (gluedQuery.length / glued.length));
        }
    });

    return bonus;
};

const passesFilters = (doc: SearchDoc, filters: SearchFilters): boolean => {
    if (filters.kinds?.length && !filters.kinds.includes(GROUP_OF_KIND[doc.kind])) {
        return false;
    }
    if (filters.levels?.length && !(doc.level && filters.levels.includes(doc.level))) {
        return false;
    }

    return true;
};

/**
 * Ranks the index for `query`. Every meaningful word has to match (so "mail
 * server" narrows); when nothing matches a longer question, one word may be
 * missing. An empty query returns nothing (the view shows recent searches).
 */
export const searchIndex = (
    index: PreparedIndex,
    query: string,
    filters: SearchFilters = {},
    limit = 60,
): SearchHit[] => {
    const words = queryWords(query);

    if (!words.length) {
        return [];
    }

    const run = (minWords: number) =>
        index
            .filter(({ doc }) => passesFilters(doc, filters))
            .flatMap((prepared) => {
                const scored = scoreDoc(prepared, words, minWords);

                if (!scored) {
                    return [];
                }

                const score = (scored.score + titleBonus(prepared, words)) * KIND_BIAS[prepared.doc.kind];
                const hit: SearchHit = {
                    doc: prepared.doc,
                    score,
                    matchedField: scored.field,
                    matchedText: scored.text?.text,
                    titleRanges: highlightRanges(prepared.doc.title, words),
                };

                return [hit];
            });

    let hits = run(words.length);

    if (!hits.length && words.length >= 3) {
        hits = run(words.length - 1);
    }

    return hits.sort((a, b) => b.score - a.score || a.doc.title.localeCompare(b.doc.title)).slice(0, limit);
};

export interface HitGroup {
    group: SearchGroup;
    hits: SearchHit[];
    /** Hits beyond the per-group cap. */
    more: number;
}

/** Groups hits; the group with the best hit comes first, ties follow the canonical order. */
export const groupHits = (hits: SearchHit[], perGroup = 5): HitGroup[] => {
    const byGroup = new Map<SearchGroup, SearchHit[]>();

    hits.forEach((hit) => {
        const group = GROUP_OF_KIND[hit.doc.kind];
        byGroup.set(group, [...(byGroup.get(group) ?? []), hit]);
    });

    return SEARCH_GROUPS.flatMap((group) => {
        const list = byGroup.get(group);

        return list ? [{ group, hits: list.slice(0, perGroup), more: Math.max(0, list.length - perGroup) }] : [];
    }).sort((a, b) => b.hits[0].score - a.hits[0].score);
};
