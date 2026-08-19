import { Extension } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

/*
 * Trailing-paragraph guarantee (owner report 2026-08-19).
 *
 * A document that ends with a heading has no node below it that can hold the
 * caret. The editor surface keeps a min-height (248px), so under a lone H1
 * there were ~184px of empty surface — and EVERY click in it resolved to the
 * nearest position, the heading's end: typing then produced giant heading
 * text, and the author had to backspace onto the heading line to escape
 * ("sehr sehr schwer da irgendwie headlines zu bauen").
 *
 * The normal document-editor contract (Word's click-and-type): empty space
 * below a heading belongs to a following body paragraph; if none exists, it
 * is created. StarterKit's Gapcursor does not cover this — it only applies
 * after non-text blocks (hr, image), never after textblocks like headings.
 *
 * Two guards, same pattern as `headingAnchors.ts`:
 *  - `appendTransaction` keeps the guarantee during editing (any doc-changing
 *    transaction on an editable editor). It deliberately does NOT run at
 *    creation time: normalising a freshly LOADED document would emit a
 *    phantom onChange draft before the user touched anything.
 *  - `handleClick` covers exactly that pristine case (a legacy legal text
 *    saved as `...</h1>`): the first click into the dead space below the last
 *    block creates the paragraph and puts the caret into it — the click IS
 *    the user's edit intent, so the resulting onChange is genuine.
 *
 * The read-only reader (DPA blocker, onboarding wizard) must never mutate the
 * stored document, so both paths check `editor.isEditable`.
 */

const needsTrailingParagraph = (doc: ProseMirrorNode): boolean =>
    doc.lastChild !== null && doc.lastChild.type.name !== 'paragraph';

const clickedBelowLastBlock = (view: EditorView, event: MouseEvent): boolean => {
    const lastBlock = view.dom.lastElementChild;
    if (!lastBlock) return false;
    return event.clientY > lastBlock.getBoundingClientRect().bottom;
};

export const TrailingParagraph = Extension.create({
    name: 'trailingParagraph',

    addProseMirrorPlugins() {
        const { editor } = this;
        return [
            new Plugin({
                key: new PluginKey('trailingParagraph'),
                appendTransaction: (transactions, _oldState, newState) => {
                    if (!transactions.some((transaction) => transaction.docChanged)) return null;
                    if (!editor.isEditable) return null;
                    if (!needsTrailingParagraph(newState.doc)) return null;
                    const { paragraph } = newState.schema.nodes;
                    if (!paragraph) return null;
                    return newState.tr.insert(newState.doc.content.size, paragraph.create());
                },
                props: {
                    handleClick: (view, _pos, event) => {
                        if (!editor.isEditable) return false;
                        if (!needsTrailingParagraph(view.state.doc)) return false;
                        if (!clickedBelowLastBlock(view, event)) return false;
                        const { paragraph } = view.state.schema.nodes;
                        if (!paragraph) return false;
                        const tr = view.state.tr.insert(view.state.doc.content.size, paragraph.create());
                        // Caret into the new empty paragraph: typing produces
                        // body text, exactly what the click below the heading
                        // asked for.
                        tr.setSelection(TextSelection.create(tr.doc, tr.doc.content.size - 1));
                        view.dispatch(tr.scrollIntoView());
                        return true;
                    },
                },
            }),
        ];
    },
});

export default TrailingParagraph;
