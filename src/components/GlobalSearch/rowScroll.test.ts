import { describe, expect, it } from 'vitest';
import { nextScrollStop, revealScrollLeft, scrollEdges } from './rowScroll';

// A 400px window onto a 1000px row of five 180px fields with 20px gaps:
// [0–180] [200–380] [400–580] [600–780] [800–980], content ends at 1000.
const FIELDS = [0, 200, 400, 600, 800].map((left) => ({ left, right: left + 180 }));
const view = (scrollLeft: number) => ({ scrollLeft, clientWidth: 400, scrollWidth: 1000 });

describe('scrollEdges', () => {
    it('reports no overflow when the row fits', () => {
        expect(scrollEdges({ scrollLeft: 0, clientWidth: 400, scrollWidth: 400 })).toEqual({
            overflowing: false,
            canScrollStart: false,
            canScrollEnd: false,
        });
    });

    it('at the start only the end direction has more content', () => {
        expect(scrollEdges(view(0))).toEqual({ overflowing: true, canScrollStart: false, canScrollEnd: true });
    });

    it('in the middle both directions have more content', () => {
        expect(scrollEdges(view(300))).toEqual({ overflowing: true, canScrollStart: true, canScrollEnd: true });
    });

    it('at the end only the start direction has more content, despite sub-pixel rounding', () => {
        expect(scrollEdges(view(599.6))).toEqual({ overflowing: true, canScrollStart: true, canScrollEnd: false });
    });
});

describe('revealScrollLeft', () => {
    it('leaves a fully visible field alone', () => {
        expect(revealScrollLeft({ left: 200, right: 380 }, view(100))).toBe(100);
    });

    it('scrolls right just enough to show a field cut off at the right edge', () => {
        // Field 400–580 in window 100–500: 80px hidden.
        expect(revealScrollLeft({ left: 400, right: 580 }, view(100))).toBe(180);
    });

    it('scrolls left just enough to show a field cut off at the left edge', () => {
        expect(revealScrollLeft({ left: 200, right: 380 }, view(250))).toBe(200);
    });

    it('keeps the start of a field wider than the window in view', () => {
        expect(revealScrollLeft({ left: 400, right: 950 }, view(0))).toBe(400);
    });

    it('never scrolls past the ends', () => {
        expect(revealScrollLeft({ left: 800, right: 1000 }, view(0), 24)).toBe(600);
        expect(revealScrollLeft({ left: 0, right: 180 }, view(300), 24)).toBe(0);
    });
});

describe('nextScrollStop', () => {
    it('forward: the field cut off at the right edge becomes the first fully visible one', () => {
        // Window 0–400: the first field not fully visible is 400–580, so it moves to the left edge.
        expect(nextScrollStop('end', FIELDS, view(0))).toBe(400);
    });

    it('forward from a half-hidden field brings that field fully in', () => {
        // Window 100–500: field 400–580 is cut off.
        expect(nextScrollStop('end', FIELDS, view(100))).toBe(400);
    });

    it('forward stops at the end of the row', () => {
        expect(nextScrollStop('end', FIELDS, view(400))).toBe(600);
    });

    it('back: the field cut off at the left edge becomes the last fully visible one', () => {
        // Window 600–1000: field 400–580 is the last one left of the window.
        expect(nextScrollStop('start', FIELDS, view(600))).toBe(180);
    });

    it('back stops at the start of the row', () => {
        expect(nextScrollStop('start', FIELDS, view(180))).toBe(0);
    });

    it('still moves by a window when one field is wider than the window', () => {
        const wide = [{ left: 0, right: 900 }];
        expect(nextScrollStop('end', wide, { scrollLeft: 0, clientWidth: 400, scrollWidth: 900 })).toBe(400);
        expect(nextScrollStop('start', wide, { scrollLeft: 500, clientWidth: 400, scrollWidth: 900 })).toBe(100);
    });
});
