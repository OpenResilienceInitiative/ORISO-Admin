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

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

/**
 * Stamps anchor ids onto published HTML for READ-ONLY hosts (the public DPA
 * reader, #594): the read-only editor deliberately never mutates its document,
 * so legal texts saved before the anchor feature carry no ids and would render
 * without any chapter navigation. This pure helper adds the missing ones on the
 * way IN, reusing {@link slugifyAnchorId} and the editor's de-duplication rule,
 * so the vocabulary is identical in both directions. Ids the editor already
 * assigned are kept (in-text `#cross-references` keep resolving) and headings
 * the author un-anchored (`data-anchor-removed`) stay out of the navigation.
 */
export const ensureHeadingAnchorIds = (html: string): string => {
    if (!html || typeof DOMParser === 'undefined') return html;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const headings = Array.from(doc.body.querySelectorAll(HEADING_SELECTOR));
    const used = new Set<string>();
    headings.forEach((heading) => {
        const id = heading.getAttribute('id');
        if (id) used.add(id);
    });

    let changed = false;
    headings.forEach((heading) => {
        if (heading.getAttribute('id')) return;
        if (heading.getAttribute('data-anchor-removed') === 'true') return;
        const text = heading.textContent?.trim() ?? '';
        if (!text) return;

        const base = slugifyAnchorId(text);
        let candidate = base;
        let counter = 2;
        while (used.has(candidate)) {
            candidate = `${base}-${counter}`;
            counter += 1;
        }
        used.add(candidate);
        heading.setAttribute('id', candidate);
        changed = true;
    });

    return changed ? doc.body.innerHTML : html;
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
// what makes the "x" removal stick. Levels with "Auto Chapters" off get no NEW
// anchors (existing ones stay untouched).
const collectAnchorAssignments = (doc: ProseMirrorNode, disabledLevels?: Set<number>): AnchorAssignment[] => {
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
        if (!anchorId && disabledLevels?.has(Number(node.attrs.level))) return undefined;
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
            /**
             * "Auto Chapters" toggle: when off, adding a heading does NOT create a
             * clickable anchor (existing anchors stay untouched). With `level` the
             * toggle applies to that heading level only (Figma 1280-73045 —
             * per-Schrifttyp), without it to all levels.
             */
            setAutoHeadingAnchors: (enabled: boolean, level?: number) => ReturnType;
        };
    }
}

export type HeadingAnchorsStorage = {
    /** Heading levels whose "Auto Chapters" is off (default: none). */
    disabledLevels: Set<number>;
};

export const HeadingAnchors = Extension.create<Record<string, never>, HeadingAnchorsStorage>({
    name: 'headingAnchors',

    addStorage() {
        return { disabledLevels: new Set<number>() };
    },

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
                    const assignments = collectAnchorAssignments(state.doc, this.storage.disabledLevels);
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
            setAutoHeadingAnchors: (enabled: boolean, level?: number) => () => {
                const levels = level ? [level] : [1, 2, 3, 4, 5, 6];
                levels.forEach((headingLevel) => {
                    if (enabled) this.storage.disabledLevels.delete(headingLevel);
                    else this.storage.disabledLevels.add(headingLevel);
                });
                return true;
            },
        };
    },

    addProseMirrorPlugins() {
        const { editor, storage } = this;
        return [
            new Plugin({
                key: new PluginKey('headingAnchors'),
                appendTransaction: (transactions, _oldState, newState) => {
                    if (!transactions.some((transaction) => transaction.docChanged)) return null;
                    // The read-only viewer must never mutate the stored HTML.
                    if (!editor.isEditable) return null;
                    // Levels with "Auto Chapters" off get no new anchors.
                    const assignments = collectAnchorAssignments(newState.doc, storage.disabledLevels);
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
