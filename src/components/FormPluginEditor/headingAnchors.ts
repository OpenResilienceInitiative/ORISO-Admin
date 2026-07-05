import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

// Anchor navigation for long legal texts.
//
// Every heading gets a persistent, readable `id` attribute (a slug of the
// heading text) that survives the HTML-string round-trip of TiptapEditor
// (`value` in / `getHTML()` out). Removing an anchor (chip "x") strips the id
// AND marks the heading with `data-anchor-removed="true"`, so the id is not
// re-assigned on the next transaction or on reload — removal is persistent.
//
// NOTE ON THE EXTENSION ROUTE: `@tiptap/extension-unique-id` and
// `@tiptap/extension-table-of-contents` ARE published for TipTap 2.27.2 on
// the public npm registry, but they do not fit this feature: UniqueID
// re-assigns an id in the same dispatch cycle whenever one is stripped (an
// "x-removed" anchor would immediately come back), and the ToC extension
// lists every heading regardless of its id. This small custom extension
// implements the exact semantics with no extra dependency.

export type HeadingAnchor = {
    /** The heading's anchor id (its HTML `id` attribute). */
    id: string;
    /** The heading's plain text, used as the chip label. */
    text: string;
    /** Heading level (1-6). */
    level: number;
    /** ProseMirror position of the heading node. */
    pos: number;
};

/** Readable slug for a heading text, e.g. "1. Geltungsbereich" -> "1-geltungsbereich". */
export const slugifyAnchorId = (text: string): string => {
    const slug = text
        .toLowerCase()
        .replace(/ß/g, 'ss')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48)
        .replace(/-+$/g, '');
    return slug || 'section';
};

/** All headings that currently have an anchor — the source for the chip row (ToC). */
export const collectAnchors = (doc: ProseMirrorNode): HeadingAnchor[] => {
    const anchors: HeadingAnchor[] = [];
    doc.descendants((node, pos) => {
        if (node.type.name === 'heading' && node.attrs.anchorId && !node.attrs.anchorRemoved) {
            anchors.push({
                id: String(node.attrs.anchorId),
                text: node.textContent.trim(),
                level: Number(node.attrs.level),
                pos,
            });
        }
        return undefined;
    });
    return anchors;
};

type AnchorAssignment = { pos: number; attrs: Record<string, unknown> };

// Headings that need a (new) anchor id: headings without one (legacy content,
// freshly typed headings) and headings whose id is duplicated in the document
// (split / copy-paste). Headings marked `anchorRemoved` are skipped — that is
// what makes the "x" removal stick.
const collectAnchorAssignments = (doc: ProseMirrorNode): AnchorAssignment[] => {
    const used = new Set<string>();
    doc.descendants((node) => {
        if (node.type.name === 'heading' && node.attrs.anchorId) {
            used.add(String(node.attrs.anchorId));
        }
        return undefined;
    });

    const seen = new Set<string>();
    const assignments: AnchorAssignment[] = [];
    doc.descendants((node, pos) => {
        if (node.type.name !== 'heading') return undefined;
        const { anchorId, anchorRemoved } = node.attrs;
        if (anchorRemoved) return undefined;
        if (anchorId && !seen.has(String(anchorId))) {
            seen.add(String(anchorId));
            return undefined;
        }

        const text = node.textContent.trim();
        // A brand-new heading without text yet: wait until it has content, so
        // the slug is derived from the real heading text.
        if (!anchorId && !text) return undefined;

        const base = anchorId ? String(anchorId) : slugifyAnchorId(text);
        let candidate = base;
        let counter = 2;
        while (used.has(candidate) || seen.has(candidate)) {
            candidate = `${base}-${counter}`;
            counter += 1;
        }
        used.add(candidate);
        seen.add(candidate);
        assignments.push({ pos, attrs: { ...node.attrs, anchorId: candidate } });
        return undefined;
    });
    return assignments;
};

declare module '@tiptap/core' {
    interface Commands<ReturnType> {
        headingAnchors: {
            /** Assign anchor ids to all headings that have none (no-op on read-only editors). */
            ensureHeadingAnchors: () => ReturnType;
            /** Permanently remove a heading's anchor: strips the id and marks the heading as removed. */
            removeHeadingAnchor: (anchorId: string) => ReturnType;
        };
    }
}

export const HeadingAnchors = Extension.create({
    name: 'headingAnchors',

    addGlobalAttributes() {
        return [
            {
                types: ['heading'],
                attributes: {
                    anchorId: {
                        default: null,
                        keepOnSplit: false,
                        parseHTML: (element) => element.getAttribute('id'),
                        renderHTML: (attributes) => (attributes.anchorId ? { id: attributes.anchorId } : {}),
                    },
                    anchorRemoved: {
                        default: false,
                        keepOnSplit: false,
                        parseHTML: (element) => element.getAttribute('data-anchor-removed') === 'true',
                        renderHTML: (attributes) => (attributes.anchorRemoved ? { 'data-anchor-removed': 'true' } : {}),
                    },
                },
            },
        ];
    },

    addCommands() {
        return {
            ensureHeadingAnchors:
                () =>
                ({ tr, state, dispatch, editor }) => {
                    if (!editor.isEditable) return true;
                    const assignments = collectAnchorAssignments(state.doc);
                    if (!assignments.length) return true;
                    if (dispatch) {
                        assignments.forEach(({ pos, attrs }) => tr.setNodeMarkup(pos, undefined, attrs));
                    }
                    return true;
                },
            removeHeadingAnchor:
                (anchorId: string) =>
                ({ tr, state, dispatch }) => {
                    let found = false;
                    state.doc.descendants((node, pos) => {
                        if (node.type.name === 'heading' && node.attrs.anchorId === anchorId) {
                            found = true;
                            if (dispatch) {
                                tr.setNodeMarkup(pos, undefined, {
                                    ...node.attrs,
                                    anchorId: null,
                                    anchorRemoved: true,
                                });
                            }
                        }
                        return undefined;
                    });
                    return found;
                },
        };
    },

    addProseMirrorPlugins() {
        const { editor } = this;
        return [
            new Plugin({
                key: new PluginKey('headingAnchors'),
                appendTransaction: (transactions, _oldState, newState) => {
                    if (!transactions.some((transaction) => transaction.docChanged)) return null;
                    // The read-only viewer must never mutate the stored HTML.
                    if (!editor.isEditable) return null;
                    const assignments = collectAnchorAssignments(newState.doc);
                    if (!assignments.length) return null;
                    const { tr } = newState;
                    assignments.forEach(({ pos, attrs }) => tr.setNodeMarkup(pos, undefined, attrs));
                    return tr;
                },
            }),
        ];
    },
});

export default HeadingAnchors;
