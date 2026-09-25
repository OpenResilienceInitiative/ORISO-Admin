/** A horizontal scrollport: where it stands, how wide the window is, how wide the content. */
export interface ScrollView {
    scrollLeft: number;
    clientWidth: number;
    scrollWidth: number;
}

/** A control's horizontal extent in content coordinates (0 = start of the row). */
export interface Extent {
    left: number;
    right: number;
}

export type ScrollDirection = 'start' | 'end';

// Browsers report fractional scroll positions at non-integer zoom; a pixel of slack keeps the ends honest.
const EPSILON = 1;

const maxScrollLeft = (view: ScrollView) => Math.max(0, view.scrollWidth - view.clientWidth);

const clamp = (value: number, view: ScrollView) => Math.min(Math.max(0, value), maxScrollLeft(view));

/** Which scroll buttons have somewhere to go. */
export const scrollEdges = (view: ScrollView) => {
    const max = maxScrollLeft(view);
    const overflowing = max > EPSILON;
    return {
        overflowing,
        canScrollStart: overflowing && view.scrollLeft > EPSILON,
        canScrollEnd: overflowing && view.scrollLeft < max - EPSILON,
    };
};

/** The smallest scroll that shows `item` whole; a field wider than the window keeps its start in view. */
export const revealScrollLeft = (item: Extent, view: ScrollView, margin = 0): number => {
    const viewRight = view.scrollLeft + view.clientWidth;
    if (item.left - margin < view.scrollLeft) return clamp(item.left - margin, view);
    if (item.right + margin > viewRight) {
        return clamp(Math.min(item.right + margin - view.clientWidth, item.left - margin), view);
    }
    return view.scrollLeft;
};

/**
 * One press of a scroll button: the first field cut off in that direction lands whole at the far edge,
 * so no press ever leaves a field half visible. A field wider than the window falls back to a window's width.
 */
export const nextScrollStop = (
    direction: ScrollDirection,
    items: readonly Extent[],
    view: ScrollView,
    margin = 0,
): number => {
    const viewRight = view.scrollLeft + view.clientWidth;
    if (direction === 'end') {
        const cut = items.find((item) => item.right > viewRight + EPSILON);
        const target = cut ? cut.left - margin : maxScrollLeft(view);
        return clamp(target > view.scrollLeft + EPSILON ? target : view.scrollLeft + view.clientWidth, view);
    }
    const cut = [...items].reverse().find((item) => item.left < view.scrollLeft - EPSILON);
    const target = cut ? cut.right + margin - view.clientWidth : 0;
    return clamp(target < view.scrollLeft - EPSILON ? target : view.scrollLeft - view.clientWidth, view);
};
