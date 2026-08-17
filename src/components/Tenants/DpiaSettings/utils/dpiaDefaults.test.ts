import { describe, expect, it } from 'vitest';
import { DPIA_SECTIONS, hasDpiaText } from './dpiaSections';
import {
    DSFA_EDITOR_DEFAULTS,
    hasOperatorDpiaText,
    isDpiaDefaultText,
    seedDpiaDefaults,
    stripDpiaDefaults,
} from './dpiaDefaults';

describe('dpiaDefaults', () => {
    it('provides a default draft for every editor slot, and for nothing else', () => {
        const slotIds = DPIA_SECTIONS.map((s) => s.id).sort();
        expect(Object.keys(DSFA_EDITOR_DEFAULTS).sort()).toEqual(slotIds);
        slotIds.forEach((id) => expect(hasDpiaText(DSFA_EDITOR_DEFAULTS[id])).toBe(true));
    });

    it('every default ends with a hint block the operator is told to remove before publishing', () => {
        Object.values(DSFA_EDITOR_DEFAULTS).forEach((html) => {
            expect(html).toMatch(/<blockquote>[\s\S]*Hinweis \(vor Veröffentlichung entfernen\)[\s\S]*<\/blockquote>$/);
        });
    });

    it('is written in the form TipTap serialises, so an untouched default never reads as dirty', () => {
        // TipTap re-emits raw no-break spaces as `&nbsp;`; a default containing the raw character
        // would differ from the editor's first onChange and show "Unsaved" before any edit.
        Object.values(DSFA_EDITOR_DEFAULTS).forEach((html) => {
            expect(html).not.toMatch(/[\u00a0\u202f]/);
        });
    });

    it('seeds only the untouched slots; operator text is never overwritten', () => {
        const seeded = seedDpiaDefaults({ governance: '<p>Unser Gremium</p>', accountability: '<p></p>' });
        expect(seeded.governance).toBe('<p>Unser Gremium</p>');
        expect(seeded.accountability).toBe(DSFA_EDITOR_DEFAULTS.accountability);
        expect(seeded.escalationChain).toBe(DSFA_EDITOR_DEFAULTS.escalationChain);
    });

    it('recognises a default even after TipTap re-serialised the markup, but not after a real edit', () => {
        const reserialised = DSFA_EDITOR_DEFAULTS.governance
            .replace(/<\/p><p>/g, '</p>\n<p>')
            .replace('<blockquote>', '<blockquote class="x">');
        expect(isDpiaDefaultText('governance', reserialised)).toBe(true);
        expect(
            isDpiaDefaultText(
                'governance',
                DSFA_EDITOR_DEFAULTS.governance.replace('[Name des Verantwortlichen]', 'Caritasverband'),
            ),
        ).toBe(false);
        expect(isDpiaDefaultText('governance', '')).toBe(false);
        expect(isDpiaDefaultText('unknown-slot', '<p>x</p>')).toBe(false);
    });

    it('a formatting-only edit (emphasis, list, link, heading) is an edit — never mistaken for the default', () => {
        const base = DSFA_EDITOR_DEFAULTS.governance;
        // Every fixture re-wraps EXISTING default text in different markup — the words stay the
        // same, only the structure/marks change — so a detector that ignored markup would fail.
        const firstParagraph = base.slice(0, base.indexOf('</p>') + '</p>'.length); // <p>…</p>
        const firstText = firstParagraph.slice('<p>'.length, -'</p>'.length);
        const bold = base.replace(firstParagraph, `<p><strong>${firstText}</strong></p>`);
        const list = base.replace(firstParagraph, `<ul><li>${firstParagraph}</li></ul>`);
        const link = base.replace(firstParagraph, `<p><a href="https://example.org">${firstText}</a></p>`);
        const heading = base.replace(firstParagraph, `<h2>${firstText}</h2>`);
        expect(firstText.length).toBeGreaterThan(20);
        [bold, list, link, heading].forEach((html) => {
            expect(html).not.toBe(base);
            expect(isDpiaDefaultText('governance', html)).toBe(false);
            expect(hasOperatorDpiaText('governance', html)).toBe(true);
            // …and it is persisted as written, never stripped to empty
            expect(stripDpiaDefaults({ governance: html }).governance).toBe(html);
        });
    });

    it('a default does not count as operator text', () => {
        expect(hasOperatorDpiaText('governance', DSFA_EDITOR_DEFAULTS.governance)).toBe(false);
        expect(hasOperatorDpiaText('governance', '<p>Eigener Text</p>')).toBe(true);
        expect(hasOperatorDpiaText('governance', '<p></p>')).toBe(false);
    });

    it('strips untouched defaults back to empty before persisting', () => {
        const stripped = stripDpiaDefaults({
            governance: DSFA_EDITOR_DEFAULTS.governance,
            accountability: '<p>Eigener Text</p>',
        });
        expect(stripped).toEqual({ governance: '', accountability: '<p>Eigener Text</p>' });
    });

    it('strips a default even after TipTap re-serialised it (attributes, whitespace, nbsp)', () => {
        const reserialised = DSFA_EDITOR_DEFAULTS.governance
            .replace(/<\/p><p>/g, '</p>\n<p>')
            .replace('<blockquote>', '<blockquote class="x">')
            .replace(/&nbsp;/g, '\u00a0');
        expect(reserialised).not.toBe(DSFA_EDITOR_DEFAULTS.governance);
        expect(stripDpiaDefaults({ governance: reserialised }).governance).toBe('');
    });
});
