import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { nextScrollStop, revealScrollLeft, scrollEdges, type Extent, type ScrollDirection } from './rowScroll';

// The row's own gap: a revealed field keeps it as breathing room at the edge.
const EDGE_MARGIN = 8;

const NO_OVERFLOW = { overflowing: false, canScrollStart: false, canScrollEnd: false };

const prefersReducedMotion = () =>
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const extentIn = (scroller: HTMLElement, element: Element): Extent => {
    const box = element.getBoundingClientRect();
    const origin = scroller.getBoundingClientRect().left - scroller.scrollLeft;
    return { left: box.left - origin, right: box.right - origin };
};

// `display: contents` wrappers have no box of their own; their children are the row's real controls.
const rowControls = (row: Element): Element[] =>
    [...row.children].flatMap((child) =>
        window.getComputedStyle(child).display === 'contents' ? rowControls(child) : [child],
    );

/** Scroll buttons for a horizontally overflowing row: edge state, one press per field, focus kept whole. */
export const useRowScrollButtons = (enabled: boolean) => {
    const scrollerRef = useRef<HTMLDivElement>(null);
    const rowRef = useRef<HTMLDivElement>(null);
    const [edges, setEdges] = useState(NO_OVERFLOW);
    // Where a running smooth scroll is headed: a second press pages on from there, not from mid-flight.
    const pendingLeft = useRef<number | null>(null);

    const measure = useCallback(() => {
        const scroller = scrollerRef.current;
        if (!scroller) return;
        if (pendingLeft.current != null && Math.abs(scroller.scrollLeft - pendingLeft.current) < 1) {
            pendingLeft.current = null;
        }
        const next = scrollEdges(scroller);
        setEdges((current) =>
            current.overflowing === next.overflowing &&
            current.canScrollStart === next.canScrollStart &&
            current.canScrollEnd === next.canScrollEnd
                ? current
                : next,
        );
    }, []);

    const scrollTo = useCallback((left: number) => {
        const scroller = scrollerRef.current;
        if (!scroller || Math.abs(left - scroller.scrollLeft) < 1) return;
        const smooth = !prefersReducedMotion();
        pendingLeft.current = smooth ? left : null;
        scroller.scrollTo({ left, behavior: smooth ? 'smooth' : 'auto' });
    }, []);

    const revealFocused = useCallback(() => {
        const scroller = scrollerRef.current;
        const active = document.activeElement;
        if (!scroller || !active || !scroller.contains(active)) return;
        // The whole field, not only its input: a unit field is an input plus its mode controls.
        const field = active.closest('[data-field-key]') ?? active;
        scrollTo(revealScrollLeft(extentIn(scroller, field), scroller, EDGE_MARGIN));
    }, [scrollTo]);

    const scrollBy = useCallback(
        (direction: ScrollDirection) => {
            const scroller = scrollerRef.current;
            const row = rowRef.current;
            if (!scroller || !row) return;
            const extents = rowControls(row)
                .map((control) => extentIn(scroller, control))
                .filter((extent) => extent.right > extent.left);
            const view = {
                scrollLeft: pendingLeft.current ?? scroller.scrollLeft,
                clientWidth: scroller.clientWidth,
                scrollWidth: scroller.scrollWidth,
            };
            scrollTo(nextScrollStop(direction, extents, view, EDGE_MARGIN));
        },
        [scrollTo],
    );

    useLayoutEffect(() => {
        const scroller = scrollerRef.current;
        const row = rowRef.current;
        if (!enabled || !scroller || !row) return undefined;
        measure();
        scroller.addEventListener('scroll', measure, { passive: true });
        // An interrupted smooth scroll (wheel, drag) never reaches its target: forget it once scrolling stops.
        const settle = () => {
            pendingLeft.current = null;
        };
        scroller.addEventListener('scrollend', settle);
        // Fields collapse and expand with an animation: re-check the edges and keep the edited field whole.
        const observer =
            typeof ResizeObserver === 'undefined'
                ? undefined
                : new ResizeObserver(() => {
                      measure();
                      revealFocused();
                  });
        observer?.observe(scroller);
        observer?.observe(row);
        return () => {
            scroller.removeEventListener('scroll', measure);
            scroller.removeEventListener('scrollend', settle);
            observer?.disconnect();
        };
    }, [enabled, measure, revealFocused]);

    return { scrollerRef, rowRef, edges: enabled ? edges : NO_OVERFLOW, scrollBy, revealFocused };
};
