import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DpiaDocumentPage } from './DpiaDocumentPage';
import { DPIA_CHAPTERS } from './DpiaChapters';
import source from './__fixtures__/dsfa-source.json';

const text = (element: Element) => {
    const copy = element.cloneNode(true) as Element;
    copy.querySelectorAll('svg, button').forEach((node) => node.remove());
    return copy.textContent
        ?.replace(/\s+/g, '')
        .replace('RechtsgrundlagederInhaltsverarbeitungistdieausdrücklicheEinwilligung(§8Abs.1KDG).', '')
        .replace('DiePrüfpflichtdieserDSFAfolgtaus§35KDG.', '')
        .replace('RechtsgrundlagederInhaltsverarbeitungistdieausdrücklicheEinwilligung(Art.9Abs.2lit.aDSGVO).', '')
        .replace('DiePrüfpflichtdieserDSFAfolgtausArt.35DSGVO.', '');
};
const expectedChapter = (html: string, preset = 'kdg') => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll(
        `svg, button, .seg, .p-${preset === 'kdg' ? 'dsgvo' : 'kdg'}, .n-${preset === 'kdg' ? 'dsgvo' : 'kdg'}`,
    ).forEach((node) => node.remove());
    doc.querySelectorAll('.dyn').forEach((node) => {
        node.replaceChildren('Nicht hinterlegt');
    });
    return doc.body;
};

describe.each(['kdg', 'dsgvo'] as const)('DPIA source fidelity: %s', (preset) => {
    it.each([1, 2, 5, 6, 7, 8, 9, 10, 11] as const)(
        'preserves every Chapter %s sentence, table cell, norm and qualified note',
        (chapter) => {
            const { container } = render(
                <DpiaDocumentPage chapters={DPIA_CHAPTERS} initialPreset={preset} initialShowInternalNotes />,
            );
            const expected = expectedChapter(source.chapters[chapter], preset);
            const actual = container.querySelector(`#kap${chapter}`)!;
            ['h2', 'h3', 'h4', 'tr', 'th', 'td', 'li'].forEach((selector) =>
                expect(actual.querySelectorAll(selector).length).toBe(expected.querySelectorAll(selector).length),
            );
            expect(
                [...actual.querySelectorAll('a')].map((link) => [link.textContent, link.getAttribute('href')]),
            ).toEqual([...expected.querySelectorAll('a')].map((link) => [link.textContent, link.getAttribute('href')]));
            expect(text(container.querySelector(`#kap${chapter}`)!)).toEqual(
                text(expectedChapter(source.chapters[chapter], preset)),
            );
        },
    );
    it('retains the two accepted dev-only Chapter 5 citations', () => {
        render(<DpiaDocumentPage initialPreset={preset} />);
        const chapter = screen.getByRole('region', { name: 'Verfahren und Technik' });
        expect(within(chapter).getByText(/Rechtsgrundlage der Inhaltsverarbeitung/)).toHaveTextContent(
            preset === 'kdg' ? '§ 8 Abs. 1 KDG' : 'Art. 9 Abs. 2 lit. a DSGVO',
        );
        expect(within(chapter).getByText(/Die Prüfpflicht dieser DSFA/)).toHaveTextContent(
            preset === 'kdg' ? '§ 35 KDG' : 'Art. 35 DSGVO',
        );
    });
});

it('keeps the chapter and shell switches synchronized and mounts optional chapters in order', () => {
    const { container } = render(<DpiaDocumentPage chapters={DPIA_CHAPTERS} />);
    const shell = screen.getByRole('radiogroup', { name: 'Compliance-Preset' });
    const chapter = screen.getByRole('radiogroup', { name: 'Compliance-Preset (Kapitel 8)' });
    fireEvent.click(within(chapter).getByRole('radio', { name: 'DSGVO' }));
    expect(within(shell).getByRole('radio', { name: 'DSGVO' })).toHaveAttribute('aria-checked', 'true');
    expect(container.querySelector('#kap1')).toHaveTextContent('Art. 26 DSGVO');
    fireEvent.click(within(shell).getByRole('radio', { name: 'KDG' }));
    expect(within(chapter).getByRole('radio', { name: 'KDG' })).toHaveAttribute('aria-checked', 'true');
    expect([...container.querySelectorAll('main > section')].map((section) => section.id)).toEqual(
        Array.from({ length: 11 }, (_, index) => `kap${index + 1}`),
    );
    within(screen.getByRole('navigation', { name: 'Kapitel' }))
        .getAllByRole('link')
        .forEach((link) => expect(container.querySelector(link.getAttribute('href')!)).toBeInTheDocument());
});
