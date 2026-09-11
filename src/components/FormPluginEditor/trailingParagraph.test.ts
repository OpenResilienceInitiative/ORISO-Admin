import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TrailingParagraph } from './trailingParagraph';

/*
 * The trailing-paragraph guarantee (owner report 2026-08-19): a document that
 * ends with a heading has no node below it that can hold the caret, so every
 * click into the editor's remaining empty surface (min-height 248px — measured
 * 184px ≈ 7 blank lines under a lone H1) put the caret INTO the heading and
 * typing produced giant heading text. The normal document-editor contract
 * (Word): empty space below a heading belongs to a body paragraph — if none
 * exists, one is created.
 */

let editors: Editor[] = [];

const createEditor = (content: string, editable = true): Editor => {
    const editor = new Editor({
        element: document.createElement('div'),
        extensions: [StarterKit, TrailingParagraph],
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

describe('TrailingParagraph — guarantee while editing', () => {
    it('appends an empty paragraph when an edit leaves a heading as the last node', () => {
        const editor = createEditor('<h1>Datenschutzerklärung</h1>');

        // Simulate the owner's flow: type inside the heading (any doc-changing
        // transaction) — the guarantee must hold from the first edit on.
        editor.chain().focus('end').insertContent('!').run();

        expect(editor.state.doc.lastChild?.type.name).toBe('paragraph');
        expect(editor.getHTML()).toMatch(/<h1>Datenschutzerklärung!<\/h1><p><\/p>$/);
    });

    it('leaves a document that already ends in a paragraph untouched', () => {
        const editor = createEditor('<h1>Titel</h1><p>Fließtext.</p>');

        editor.chain().focus('end').insertContent(' Mehr.').run();

        expect(editor.state.doc.childCount).toBe(2);
        expect(editor.getHTML()).toBe('<h1>Titel</h1><p>Fließtext. Mehr.</p>');
    });

    it('does not stack up guarantee paragraphs on repeated edits', () => {
        const editor = createEditor('<h1>Titel</h1>');

        editor.chain().focus('end').insertContent('a').run();
        editor.chain().focus('end').insertContent('b').run();

        const paragraphs = editor.state.doc.content.content.filter((node) => node.type.name === 'paragraph');
        expect(paragraphs).toHaveLength(1);
    });

    it('covers other non-paragraph endings too (blockquote)', () => {
        const editor = createEditor('<p>Intro</p><blockquote><p>Zitat</p></blockquote>');

        editor.chain().focus('end').insertContent('!').run();

        expect(editor.state.doc.lastChild?.type.name).toBe('paragraph');
    });
});

describe('TrailingParagraph — read-only reader stays non-mutating', () => {
    it('never appends to a read-only document', () => {
        const editor = createEditor('<h1>Datenschutzerklärung</h1>', false);

        // The reader never edits, but plugins must not react even to
        // programmatic transactions (anchor stamping, version swaps).
        editor.view.dispatch(editor.state.tr.insertText('!', editor.state.doc.content.size - 1));

        expect(editor.state.doc.lastChild?.type.name).toBe('heading');
    });
});

describe('TrailingParagraph — dead-space click on a pristine heading-final document', () => {
    // Before ANY edit (a legacy legal text saved as `...</h1>`), the
    // appendTransaction guarantee has not run yet. The click into the dead
    // space below the heading is the moment the paragraph must be created —
    // that click IS the user's edit intent, so onChange firing then is right.
    const clickAt = (editor: Editor, clientY: number): boolean =>
        editor.view.someProp('handleClick', (handle) =>
            handle(editor.view, editor.state.doc.content.size - 1, new MouseEvent('click', { clientY })),
        ) ?? false;

    const mockLastBlockBottom = (editor: Editor, bottom: number) => {
        const lastBlock = editor.view.dom.lastElementChild as HTMLElement;
        vi.spyOn(lastBlock, 'getBoundingClientRect').mockReturnValue({
            bottom,
            top: 0,
            left: 0,
            right: 100,
            width: 100,
            height: bottom,
            x: 0,
            y: 0,
            toJSON: () => ({}),
        } as DOMRect);
    };

    it('creates the paragraph and puts the caret into it', () => {
        const editor = createEditor('<h1>Datenschutzerklärung</h1>');
        mockLastBlockBottom(editor, 100);

        const handled = clickAt(editor, 150);

        expect(handled).toBe(true);
        expect(editor.state.doc.lastChild?.type.name).toBe('paragraph');
        // Caret sits inside the new empty paragraph, so typing produces body text.
        expect(editor.state.selection.$from.parent.type.name).toBe('paragraph');
    });

    it('does nothing for clicks ON the heading itself', () => {
        const editor = createEditor('<h1>Datenschutzerklärung</h1>');
        mockLastBlockBottom(editor, 100);

        const handled = clickAt(editor, 50);

        expect(handled).toBe(false);
        expect(editor.state.doc.lastChild?.type.name).toBe('heading');
    });

    it('does nothing in the read-only reader', () => {
        const editor = createEditor('<h1>Datenschutzerklärung</h1>', false);
        mockLastBlockBottom(editor, 100);

        const handled = clickAt(editor, 150);

        expect(handled).toBe(false);
        expect(editor.state.doc.lastChild?.type.name).toBe('heading');
    });
});
