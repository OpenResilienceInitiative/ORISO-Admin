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
});
