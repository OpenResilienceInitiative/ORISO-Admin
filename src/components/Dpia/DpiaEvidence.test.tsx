import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DpiaDocumentPage } from './DpiaDocumentPage';
import { DPIA_CHAPTERS } from './DpiaChapters';
import { DPIA_CODE_PROVENANCE, DPIA_EVIDENCE } from './dpiaEvidence';
import * as evidenceModule from './dpiaEvidence';
import source from './__fixtures__/dsfa-source.json';
import originalCodeComment from './__fixtures__/dsfa-code-provenance.txt?raw';

const claimText = (node: Element) => {
    const copy = node.cloneNode(true) as Element;
    copy.querySelectorAll('svg, button').forEach((item) => item.remove());
    return copy.textContent?.replace(/\s+/g, '');
};

describe('DPIA evidence source contract', () => {
    it('preserves all 19 records including every field, status and source link', () => {
        expect(DPIA_EVIDENCE).toEqual(source.evidence);
    });
    it('labels structured code locations with their original historical provenance', () => {
        const provenance = originalCodeComment
            .split('\n')
            .find((line) => line.includes('Quelle der Zeilenzahlen:'))
            ?.trim();
        expect(DPIA_CODE_PROVENANCE).toBe(provenance);
    });
    it('preserves the 13 original code-location metadata groups', () => {
        expect(Reflect.get(evidenceModule, 'DPIA_CODE_LOCATIONS')).toEqual(source.code);
    });
    it('places every evidence trigger in its original claim, including hidden internal notes', () => {
        const { container } = render(<DpiaDocumentPage chapters={DPIA_CHAPTERS} initialShowInternalNotes />);
        const buttons = [...container.querySelectorAll<HTMLButtonElement>('[data-evidence-key]')];
        const originals = new DOMParser().parseFromString(Object.values(source.chapters).join(''), 'text/html');
        const expected = [...originals.querySelectorAll<HTMLButtonElement>('button[data-ev]')];
        expect(buttons.map((button) => button.dataset.evidenceKey)).toEqual(
            expected.map((button) => button.dataset.ev),
        );
        expect(new Set(buttons.map((button) => button.dataset.evidenceKey)).size).toBe(19);
        buttons.forEach((button, index) => {
            expect(button.closest('section')?.id).toBe(expected[index].closest('section')?.id);
            expect(claimText(button.parentElement!)).toEqual(claimText(expected[index].parentElement!));
        });
    });
});
