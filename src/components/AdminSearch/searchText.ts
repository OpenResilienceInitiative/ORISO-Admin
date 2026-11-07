/**
 * Text handling for the admin search: folding, tokens, light stemming.
 *
 * Pure, no React, no i18n. The folding is the same as the mobile menu search
 * (`navSearch.ts`, ORISO-Admin#1319), extended with an index map so a match in
 * the folded text can be highlighted in the original (`ä` folds to `ae`, so
 * offsets shift).
 */
export { editDistance } from '../AdminMobileNav/navSearch';

const FOLD_REPLACEMENTS: Record<string, string> = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss', æ: 'ae', œ: 'oe' };

const COMBINING_MARKS = /[̀-ͯ]/g;

/**
 * British and American spellings meet in the UI ("Counselors" the list, "Counsellor tutorials" the
 * tile). Folded to one form on both sides; every replacement is as long as or shorter than its
 * source, so the index map below stays valid.
 */
const SPELLING: Array<[RegExp, string]> = [
    [/counsell/g, 'counsel'],
    [/colour/g, 'color'],
    [/centre/g, 'center'],
    [/organis/g, 'organiz'],
    [/licence/g, 'license'],
    [/catalogue/g, 'catalog'],
];

const unifySpelling = (folded: string, map: number[]): { folded: string; map: number[] } =>
    SPELLING.reduce(
        (state, [pattern, replacement]) => {
            const matches = Array.from(state.folded.matchAll(pattern));
            let cursor = 0;
            let text = '';
            const nextMap: number[] = [];

            matches.forEach((match) => {
                const start = match.index ?? 0;
                const end = start + match[0].length;
                // The replacement keeps the first letters' origin; its last letter points at the source's last.
                const origins = Array.from({ length: replacement.length }, (_, offset) =>
                    offset === replacement.length - 1 ? state.map[end - 1] : state.map[start + offset],
                );

                text += state.folded.slice(cursor, start) + replacement;
                nextMap.push(...state.map.slice(cursor, start), ...origins);
                cursor = end;
            });

            return {
                folded: text + state.folded.slice(cursor),
                map: [...nextMap, ...state.map.slice(cursor)],
            };
        },
        { folded, map },
    );

/**
 * Folds `value` to lowercase ASCII words separated by single spaces and returns,
 * for every folded character, the index of the original character it came from.
 */
export const foldWithMap = (value: string): { folded: string; map: number[] } => {
    let folded = '';
    const map: number[] = [];
    let lastWasSpace = true;

    Array.from(value).forEach((char, index) => {
        const lower = char.toLowerCase();
        const replaced = FOLD_REPLACEMENTS[lower] ?? lower.normalize('NFD').replace(COMBINING_MARKS, '');

        Array.from(replaced).forEach((piece) => {
            if (/[a-z0-9]/.test(piece)) {
                folded += piece;
                map.push(index);
                lastWasSpace = false;
            } else if (!lastWasSpace) {
                folded += ' ';
                map.push(index);
                lastWasSpace = true;
            }
        });
    });

    if (folded.endsWith(' ')) {
        folded = folded.slice(0, -1);
        map.pop();
    }

    return unifySpelling(folded, map);
};

export const fold = (value: string): string => foldWithMap(value).folded;

/** Words that carry no meaning in a typed question ("wie ändere ich das passwort"). */
const STOP_WORDS = new Set([
    // German
    'der',
    'die',
    'das',
    'den',
    'dem',
    'des',
    'ein',
    'eine',
    'einen',
    'und',
    'oder',
    'fuer',
    'von',
    'zu',
    'zum',
    'zur',
    'im',
    'in',
    'am',
    'an',
    'auf',
    'mit',
    'bei',
    'ist',
    'wie',
    'was',
    'wo',
    'ich',
    'mein',
    'meine',
    'meinen',
    'wir',
    'kann',
    'will',
    'moechte',
    'aendern',
    'aendere',
    'einstellen',
    'finden',
    'finde',
    'bitte',
    'zeige',
    'zeig',
    // English
    'the',
    'a',
    'an',
    'and',
    'or',
    'for',
    'of',
    'to',
    'in',
    'on',
    'at',
    'with',
    'is',
    'how',
    'what',
    'where',
    'my',
    'i',
    'can',
    'do',
    'change',
    'set',
    'find',
    'please',
    'show',
]);

export const isStopWord = (word: string): boolean => STOP_WORDS.has(word);

/** Folded words of `value`. */
export const tokenize = (value: string): string[] => fold(value).split(' ').filter(Boolean);

/** Words of a query: stop words go, unless that would leave nothing. */
export const queryWords = (query: string): string[] => {
    const words = tokenize(query);
    const meaningful = words.filter((word) => !isStopWord(word));

    return meaningful.length ? meaningful : words;
};

const SUFFIXES = ['innen', 'ungen', 'ung', 'ern', 'en', 'er', 'es', 'ies', 'ing', 'ed', 'e', 'n', 's'];

/**
 * Cheap stem for German and English plurals and inflections ("Konten" ≈ "Konto"
 * is out of reach, "Gruppenchats" ≈ "Gruppenchat" and "accounts" ≈ "account" are
 * not). Only for words of five letters or more; shorter words stay as they are.
 */
const stripSuffix = (word: string): string => {
    const suffix = SUFFIXES.find((candidate) => word.endsWith(candidate) && word.length - candidate.length >= 4);

    return suffix ? word.slice(0, -suffix.length) : word;
};

export const stem = (word: string): string => {
    if (word.length < 5) {
        return word;
    }

    // Twice, so "servers" (plural) and "server" (agent noun) meet at the same stem.
    return stripSuffix(stripSuffix(word));
};
