import { useCallback, useLayoutEffect, useRef, useState } from 'react';

/**
 * Narrowest a navigation segment may get before its destination has to move
 * into the overflow menu. Figma lays the bar out at 96px per segment
 * (288 / 3 at 412px), but the design itself tolerates less: at 412px the bar
 * gives the navigation 276px and still packs three segments into it. 72px is
 * the point where a 12px label stops being readable — "Statistiken" fits,
 * "Beratungsstelle" ellipsises, anything narrower is decoration.
 */
export const DEFAULT_MIN_SLOT_WIDTH = 72;

/** M3 caps a navigation bar at five destinations, overflow segment included. */
export const DEFAULT_MAX_SEGMENTS = 5;

export interface UseNavOverflowOptions {
    /** How many destinations the user is allowed to see in total. */
    itemCount: number;
    minSlotWidth?: number;
    maxSegments?: number;
}

export interface NavOverflow {
    /** Attach to the element that gives the navigation its width. */
    ref: (node: HTMLElement | null) => void;
    /** How many destinations to render in the bar — slice `items` to this. */
    visibleCount: number;
    /** Whether the remaining destinations need an overflow ("Mehr") segment. */
    hasOverflow: boolean;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export const resolveNavOverflow = (
    width: number,
    { itemCount, minSlotWidth = DEFAULT_MIN_SLOT_WIDTH, maxSegments = DEFAULT_MAX_SEGMENTS }: UseNavOverflowOptions,
): Omit<NavOverflow, 'ref'> => {
    if (itemCount <= 0) {
        return { visibleCount: 0, hasOverflow: false };
    }

    // Unmeasured (width 0) resolves to the narrowest layout. The hook measures
    // in a layout effect, so this state is never painted in the browser; the
    // conservative choice only shows up where there is no layout at all — SSR
    // and jsdom — where claiming five segments fit would be a lie.
    const segments = width > 0 ? clamp(Math.floor(width / minSlotWidth), 1, maxSegments) : 1;

    if (itemCount <= segments) {
        return { visibleCount: itemCount, hasOverflow: false };
    }

    // The overflow segment costs one slot, so it is the destinations that give
    // way — never the "Mehr" button itself, which must always stay reachable.
    return { visibleCount: Math.max(0, segments - 1), hasOverflow: true };
};

/**
 * Decides how many navigation destinations fit into the bottom bar at the
 * current width, and whether an overflow segment is needed for the rest.
 *
 * Measures the element the returned `ref` is attached to — that element is the
 * navigation's flex slot, whose width is decided by the bar (and shrinks when
 * the search expands), not by the segments inside it. So this reports available
 * space, not content width, and cannot feed back into itself.
 */
export const useNavOverflow = (options: UseNavOverflowOptions): NavOverflow => {
    const { itemCount, minSlotWidth, maxSegments } = options;
    const elementRef = useRef<HTMLElement | null>(null);
    const [width, setWidth] = useState(0);

    const measure = useCallback(() => {
        const element = elementRef.current;

        if (element) {
            setWidth(element.getBoundingClientRect().width);
        }
    }, []);

    const ref = useCallback((node: HTMLElement | null) => {
        elementRef.current = node;
    }, []);

    // Layout effect, not effect: measuring after paint would show one frame of
    // the fallback layout on every mount.
    useLayoutEffect(() => {
        measure();

        const element = elementRef.current;

        if (!element || typeof ResizeObserver === 'undefined') {
            window.addEventListener('resize', measure);
            return () => window.removeEventListener('resize', measure);
        }

        const observer = new ResizeObserver(measure);

        observer.observe(element);

        return () => observer.disconnect();
    }, [measure]);

    return { ref, ...resolveNavOverflow(width, { itemCount, minSlotWidth, maxSegments }) };
};

export default useNavOverflow;
