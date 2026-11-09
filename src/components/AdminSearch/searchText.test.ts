import { describe, expect, it } from 'vite-plus/test';
import { fold, foldWithMap, isStopWord, queryWords, stem, tokenize } from './searchText';

describe('fold', () => {
    it('lowercases and folds umlauts, ß and accents', () => {
        expect(fold('Datenschutzerklärung')).toBe('datenschutzerklaerung');
        expect(fold('Größe')).toBe('groesse');
        expect(fold('Café')).toBe('cafe');
    });

    it('turns every separator into one space', () => {
        expect(fold('E-Mail-Server')).toBe('e mail server');
        expect(fold('  SMTP &  system   emails ')).toBe('smtp system emails');
        expect(fold('Träger-Admins / Beratende')).toBe('traeger admins beratende');
    });

    // Found in review: only a-z and 0-9 survived, so names in other scripts folded to nothing.
    it('keeps letters that have no Latin base, and letters of other scripts', () => {
        expect(fold('Søren')).toBe('soren');
        expect(fold('Łukasz')).toBe('lukasz');
        expect(fold('Karışık')).toBe('karisik');
        expect(fold('Александр Иванов')).toBe('александр иванов');
        expect(fold('محمد أحمد')).toBe('محمد احمد');
        expect(tokenize('Søren-Łukasz')).toEqual(['soren', 'lukasz']);
        expect(queryWords('Иванов')).toEqual(['иванов']);
    });

    it('does not split a word at the marks of its letters', () => {
        // "й" decomposes to "и" plus a breve; the Arabic vowel mark (fatha) is not a separator either.
        expect(fold('Йован')).toBe('иован');
        expect(fold('مُحَمَّد')).toBe('محمد');
    });

    it('unifies British and American spellings so both find each other', () => {
        expect(fold('Counsellors')).toBe(fold('Counselors'));
        expect(fold('colour')).toBe(fold('color'));
        expect(fold('Counselling centre')).toBe(fold('Counseling center'));
        expect(fold('organisation')).toBe(fold('organization'));
    });
});

describe('foldWithMap', () => {
    it('maps every folded character back to the original text, also after ä → ae', () => {
        const { folded, map } = foldWithMap('Größe ändern');

        expect(folded).toBe('groesse aendern');
        // "ae" of "aendern" both point at the single "ä".
        const start = folded.indexOf('aendern');
        expect(map[start]).toBe('Größe ändern'.indexOf('ä'));
        expect(map[start + 1]).toBe('Größe ändern'.indexOf('ä'));
        expect(map).toHaveLength(folded.length);
    });

    it('keeps the map valid after a spelling replacement', () => {
        const original = 'Counsellor tutorials';
        const { folded, map } = foldWithMap(original);

        expect(folded).toBe('counselor tutorials');
        expect(map).toHaveLength(folded.length);
        // The last letter of the shortened word still points at the original "r".
        expect(original[map[folded.indexOf('counselor') + 'counselor'.length - 1]]).toBe('r');
    });
});

describe('tokenize and queryWords', () => {
    it('splits into folded words', () => {
        expect(tokenize('Zwei-Faktor Authentifizierung')).toEqual(['zwei', 'faktor', 'authentifizierung']);
    });

    it('drops stop words of a typed question, in German and English', () => {
        expect(queryWords('wie ändere ich mein passwort')).toEqual(['passwort']);
        expect(queryWords('how do I change the password')).toEqual(['password']);
    });

    it('never drops everything', () => {
        expect(queryWords('das')).toEqual(['das']);
        expect(isStopWord('das')).toBe(true);
    });
});

describe('stem', () => {
    it('reduces plurals and inflections of long words', () => {
        expect(stem('gruppenchats')).toBe(stem('gruppenchat'));
        expect(stem('accounts')).toBe(stem('account'));
        expect(stem('settings')).toBe(stem('setting'));
    });

    it('leaves short words alone', () => {
        expect(stem('mail')).toBe('mail');
        expect(stem('chat')).toBe('chat');
        expect(stem('2fa')).toBe('2fa');
    });
});
