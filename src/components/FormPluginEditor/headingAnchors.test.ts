import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { HeadingAnchors, collectAnchors, ensureHeadingAnchorIds, slugifyAnchorId } from './headingAnchors';

let editors: Editor[] = [];

const createEditor = (content: string, editable = true) => {
    const editor = new Editor({
        element: document.createElement('div'),
        extensions: [StarterKit, HeadingAnchors],
        content,
        editable,
    });
    editors.push(editor);
    return editor;
};

afterEach(() => {
    editors.forEach((editor) => editor.destroy());
    editors = [];
});

describe('slugifyAnchorId', () => {
    it('builds readable slugs from heading texts', () => {
        expect(slugifyAnchorId('Datenschutzerklärung')).toBe('datenschutzerklarung');
        expect(slugifyAnchorId('§ 1 Geltungsbereich')).toBe('1-geltungsbereich');
        expect(slugifyAnchorId('Größe & Maße')).toBe('grosse-masse');
    });

    it('falls back to a generic slug for non-latin text', () => {
        expect(slugifyAnchorId('   ')).toBe('section');
    });
});

describe('HeadingAnchors — id assignment', () => {
    it('assigns readable ids to headings without one', () => {
        const editor = createEditor('<h2>Datenschutz</h2><p>Absatz</p><h3>Kontakt</h3>');
        editor.commands.ensureHeadingAnchors();
        const html = editor.getHTML();
        expect(html).toContain('<h2 id="datenschutz">Datenschutz</h2>');
        expect(html).toContain('<h3 id="kontakt">Kontakt</h3>');
    });

    it('keeps ids stable through the HTML round-trip (critical for the value contract)', () => {
        const first = createEditor('<h2>Datenschutz</h2><p>Absatz</p><h3>Kontakt</h3>');
        first.commands.ensureHeadingAnchors();
        const roundTripHtml = first.getHTML();

        // Re-load the serialized HTML into a fresh editor — this is exactly
        // what happens when a saved legal text is opened again.
        const second = createEditor(roundTripHtml);
        second.commands.ensureHeadingAnchors();
        expect(second.getHTML()).toBe(roundTripHtml);
    });

    it('deduplicates ids of headings with identical texts', () => {
        const editor = createEditor('<h2>Intro</h2><p>a</p><h2>Intro</h2>');
        editor.commands.ensureHeadingAnchors();
        const html = editor.getHTML();
        expect(html).toContain('id="intro"');
        expect(html).toContain('id="intro-2"');
    });

    it('auto-assigns ids for newly inserted headings without an explicit command', () => {
        const editor = createEditor('<p>Text</p>');
        editor.commands.insertContent('<h2>Neuer Abschnitt</h2>');
        expect(editor.getHTML()).toContain('id="neuer-abschnitt"');
    });

    it('does not mutate content in read-only editors', () => {
        const html = '<h2>Ohne Anker</h2><p>Text</p>';
        const editor = createEditor(html, false);
        editor.commands.ensureHeadingAnchors();
        expect(editor.getHTML()).toBe(html);
    });
});

describe('HeadingAnchors — ToC derivation (collectAnchors)', () => {
    it('lists all headings that carry an anchor id', () => {
        const editor = createEditor('<h2>Datenschutz</h2><p>Absatz</p><h3>Kontakt</h3>');
        editor.commands.ensureHeadingAnchors();
        const anchors = collectAnchors(editor.state.doc);
        expect(anchors).toEqual([
            expect.objectContaining({ id: 'datenschutz', text: 'Datenschutz', level: 2 }),
            expect.objectContaining({ id: 'kontakt', text: 'Kontakt', level: 3 }),
        ]);
    });

    it('ignores headings without ids (read-only viewer with legacy content)', () => {
        const editor = createEditor('<h2 id="a">A</h2><h2>B</h2>', false);
        expect(collectAnchors(editor.state.doc)).toEqual([expect.objectContaining({ id: 'a', text: 'A' })]);
    });
});

describe('HeadingAnchors — anchor removal (chip "x")', () => {
    it('strips the id so the heading drops out of the ToC', () => {
        const editor = createEditor('<h2 id="intro">Intro</h2><p>a</p><h2 id="details">Details</h2>');
        const removed = editor.commands.removeHeadingAnchor('intro');
        expect(removed).toBe(true);

        const html = editor.getHTML();
        expect(html).not.toContain('id="intro"');
        expect(html).toContain('data-anchor-removed="true"');
        expect(html).toContain('id="details"');
        expect(collectAnchors(editor.state.doc)).toEqual([expect.objectContaining({ id: 'details' })]);
    });

    it('does not re-assign an id to a removed heading on later edits', () => {
        const editor = createEditor('<h2 id="intro">Intro</h2><p>a</p>');
        editor.commands.removeHeadingAnchor('intro');
        editor.commands.insertContent('<p>more</p>');
        expect(editor.getHTML()).not.toContain('id="intro"');
        expect(collectAnchors(editor.state.doc)).toEqual([]);
    });

    it('keeps the removal across the HTML round-trip', () => {
        const first = createEditor('<h2 id="intro">Intro</h2><p>a</p>');
        first.commands.removeHeadingAnchor('intro');
        const savedHtml = first.getHTML();

        const second = createEditor(savedHtml);
        second.commands.ensureHeadingAnchors();
        expect(second.getHTML()).not.toContain('id="intro"');
        expect(collectAnchors(second.state.doc)).toEqual([]);
    });

    it('returns false for unknown anchor ids', () => {
        const editor = createEditor('<h2 id="intro">Intro</h2>');
        expect(editor.commands.removeHeadingAnchor('nope')).toBe(false);
    });
});

/**
 * #594.1 — published legal texts are rendered by the READ-ONLY editor, which
 * never mutates the document (it must not rewrite stored legal HTML). Content
 * that predates the anchor feature therefore has no ids and would show no
 * chapter chips at all. This pure helper stamps the missing ids on the way IN,
 * using the very same slug vocabulary as the editor.
 */
describe('ensureHeadingAnchorIds (read-only hosts)', () => {
    it('stamps readable slug ids onto headings that have none', () => {
        const html = ensureHeadingAnchorIds('<h1>Präambel</h1><p>x</p><h2>§ 1 Gegenstand</h2>');

        expect(html).toContain('id="praambel"');
        expect(html).toContain('id="1-gegenstand"');
    });

    it('keeps ids the editor already assigned so in-text #cross-references survive', () => {
        const html = ensureHeadingAnchorIds('<h2 id="geltungsbereich">Geltungsbereich</h2><p>x</p>');

        expect(html).toContain('id="geltungsbereich"');
    });

    it('de-duplicates repeated heading texts exactly like the editor does', () => {
        const html = ensureHeadingAnchorIds('<h2>Kapitel</h2><p>a</p><h2>Kapitel</h2><p>b</p>');

        expect(html).toContain('id="kapitel"');
        expect(html).toContain('id="kapitel-2"');
    });

    it('respects an author-removed anchor (the chapter stays out of the navigation)', () => {
        const html = ensureHeadingAnchorIds('<h2 data-anchor-removed="true">Intro</h2><p>a</p>');

        expect(html).not.toContain('id="intro"');
    });

    it('leaves heading-less or empty content untouched', () => {
        expect(ensureHeadingAnchorIds('<p>Nur Fließtext</p>')).toBe('<p>Nur Fließtext</p>');
        expect(ensureHeadingAnchorIds('')).toBe('');
    });

    it('ignores empty headings (no text to slugify)', () => {
        expect(ensureHeadingAnchorIds('<h2></h2><p>a</p>')).not.toContain('id=');
    });
});
