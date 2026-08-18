import { useEffect, useRef, useState } from 'react';
import type { Editor } from '@tiptap/react';
import { collectAnchors, HeadingAnchor } from './headingAnchors';

// CSS.escape is not available in every embedded browser we target.
export const escapeCssId = (id: string) =>
    typeof CSS !== 'undefined' && typeof CSS.escape === 'function' ? CSS.escape(id) : id.replace(/["\\]/g, '\\$&');

export type HeadingAnchorNav = {
    /** Current anchor list (source for the chip row). */
    anchors: HeadingAnchor[];
    /** Same list through a ref, for callbacks registered once (BubbleMenu shouldShow). */
    anchorsRef: React.MutableRefObject<HeadingAnchor[]>;
    /** The anchor last jumped to / currently at the top while scrolling read-only. */
    activeAnchorId: string | null;
    scrollToAnchor: (anchorId: string) => void;
    removeAnchor: (anchorId: string) => void;
    /** Read-only mode: capture clicks on in-text `#anchor` links and scroll instead of navigating. */
    handleContentClickCapture: (event: React.MouseEvent) => void;
};

/**
 * Shared anchor-navigation behavior for both TipTap editors (form-bound
 * TiptapEditor and the standalone M3RichTextEditor): keeps the anchor list in
 * sync with the document, stamps ids onto legacy content while editable, runs
 * a scroll spy in read-only mode, and provides jump/remove/link-click
 * handlers. The editor must have the HeadingAnchors extension registered.
 */
export const useHeadingAnchorNav = (
    editor: Editor | null,
    { enabled, editable }: { enabled: boolean; editable: boolean },
): HeadingAnchorNav => {
    const [anchors, setAnchors] = useState<HeadingAnchor[]>([]);
    const [activeAnchorId, setActiveAnchorId] = useState<string | null>(null);
    const anchorsRef = useRef(anchors);
    anchorsRef.current = anchors;

    // Stamp ids onto legacy content when editable (persisted via onChange on
    // save) and keep the chip list in sync with the doc. The 'transaction'
    // event also covers external setContent calls, which do not emit 'update'.
    useEffect(() => {
        if (!editor || !enabled) return undefined;
        if (editor.isEditable) editor.commands.ensureHeadingAnchors();
        const refresh = () => setAnchors(collectAnchors(editor.state.doc));
        refresh();
        editor.on('transaction', refresh);
        return () => {
            editor.off('transaction', refresh);
        };
    }, [editor, enabled, editable]);

    // Arriving WITH a hash (the URL a chip click produces, shared or reloaded):
    // jump to that chapter once the anchor list is in. Without this, the link
    // the click writes would look shareable and not be — worse than no hash.
    // A hash that matches no anchor (stale link after re-authoring, typo, or a
    // foreign in-page anchor) is deliberately ignored: no throw, no scroll.
    // Read-only only — an author's editor must not jump away from the caret.
    const consumedInitialHash = useRef(false);
    useEffect(() => {
        if (!editor || !enabled || editable || consumedInitialHash.current) return;
        if (!anchors.length || typeof window === 'undefined') return;
        let requested = '';
        try {
            requested = decodeURIComponent(window.location.hash.slice(1));
        } catch {
            // Malformed percent-encoding in a hand-edited URL — treat as "no hash".
        }
        if (!requested) {
            consumedInitialHash.current = true;
            return;
        }
        consumedInitialHash.current = true;
        if (anchors.some((anchor) => anchor.id === requested)) {
            // eslint-disable-next-line @typescript-eslint/no-use-before-define
            scrollToAnchor(requested);
        }
    }, [editor, enabled, editable, anchors]);

    // Read-only scroll spy: mark the anchor whose heading is currently at the
    // top of the (scrolled) editor content as active.
    useEffect(() => {
        if (!editor || !enabled || editable) return undefined;
        let frame = 0;
        const onScroll = () => {
            if (frame) return;
            frame = window.requestAnimationFrame(() => {
                frame = 0;
                const root = editor.view.dom as HTMLElement;
                const rootTop = root.getBoundingClientRect().top;
                let current: string | null = null;
                anchorsRef.current.forEach((anchor) => {
                    const el = root.querySelector(`[id="${escapeCssId(anchor.id)}"]`);
                    if (el && el.getBoundingClientRect().top - rootTop <= 32) current = anchor.id;
                });
                if (current) setActiveAnchorId(current);
            });
        };
        document.addEventListener('scroll', onScroll, { capture: true, passive: true });
        return () => {
            document.removeEventListener('scroll', onScroll, true);
            if (frame) window.cancelAnimationFrame(frame);
        };
    }, [editor, enabled, editable]);

    const scrollToAnchor = (anchorId: string) => {
        if (!editor) return;
        const target = editor.view.dom.querySelector<HTMLElement>(`[id="${escapeCssId(anchorId)}"]`);
        // Instant (non-smooth) scrolling: smooth programmatic scrolling is a
        // silent no-op in several embedded/headless browsers.
        target?.scrollIntoView({ block: 'start' });
        // Reading mode: focus follows the jump, so keyboard and screen-reader
        // users actually land in the chapter they picked instead of only
        // seeing it move (WCAG 2.4.3). Headings are not focusable by default,
        // hence the programmatic-only tabindex. Never in edit mode — that
        // would pull the caret out of the document the author is writing in.
        if (target && !editor.isEditable) {
            target.setAttribute('tabindex', '-1');
            target.focus?.({ preventScroll: true });
            // Reading mode ALSO writes the anchor into the URL (owner report
            // 2026-08-18, before-state F4/H4: „die anchor tags werden nicht
            // gesetzt"): picking a chapter must be visible and shareable even
            // when a short document has no scroll distance left to move.
            // `replaceState` with the CURRENT history state: it fires no
            // popstate/hashchange, so the BrowserRouter never re-navigates, and
            // preserving `history.state` keeps react-router's location state
            // intact. Never in edit mode — authoring must not rewrite the URL.
            if (typeof window !== 'undefined' && typeof window.history?.replaceState === 'function') {
                window.history.replaceState(window.history.state, '', `#${encodeURIComponent(anchorId)}`);
            }
        }
        setActiveAnchorId(anchorId);
    };

    const removeAnchor = (anchorId: string) => {
        if (!editor) return;
        editor.commands.removeHeadingAnchor(anchorId);
        setActiveAnchorId((current) => (current === anchorId ? null : current));
    };

    const handleContentClickCapture = (event: React.MouseEvent) => {
        if (!enabled || editable) return;
        const element = event.target as HTMLElement;
        const link = element.closest?.('a[href^="#"]');
        if (!link) return;
        event.preventDefault();
        event.stopPropagation();
        scrollToAnchor((link.getAttribute('href') || '').slice(1));
    };

    return { anchors, anchorsRef, activeAnchorId, scrollToAnchor, removeAnchor, handleContentClickCapture };
};

export default useHeadingAnchorNav;
