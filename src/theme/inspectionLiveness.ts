/**
 * Liveness check for the applied-token inspection (ORISO-Admin#1229, browser-hang check).
 *
 * A token inspector that observes style changes and then re-renders its own output can
 * feed itself and never stop, or block the main thread. Both leave the page unusable
 * while every value in the report can still look correct. This check watches only the
 * inspector output, over a fixed number of frames, and fails with a named cause.
 * (A never-ending synchronous loop cannot be reported by code on the same thread; the
 * test runner's own timeout is the last line of defence for that case.)
 */
export const INSPECTION_LIVENESS_BUDGET = Object.freeze({
    /** Frames the output must stay unchanged after the inspection has settled. */
    quietFrames: 12,
    /** Longest allowed gap between two frames; real frames arrive every ~16 ms. */
    maxFrameGapMs: 1000,
});

export interface FrameClock {
    now: () => number;
    nextFrame: () => Promise<void>;
}

export interface InspectionLivenessResult {
    frames: number;
    mutations: number;
    maxFrameGapMs: number;
}

const browserClock = (window: Window): FrameClock => ({
    now: () => window.performance.now(),
    nextFrame: () =>
        new Promise<void>((resolve) => {
            window.requestAnimationFrame(() => resolve());
        }),
});

const stalled = (gap: number, budget: number) =>
    new Error(`Token inspection stalled the page: a frame took ${Math.round(gap)} ms (budget ${budget} ms)`);

export const checkInspectionLiveness = async (
    output: HTMLElement,
    clock: FrameClock = browserClock(output.ownerDocument.defaultView ?? window),
    budget: { quietFrames: number; maxFrameGapMs: number } = INSPECTION_LIVENESS_BUDGET,
): Promise<InspectionLivenessResult> => {
    let mutations = 0;
    const observer = new MutationObserver((records) => {
        mutations += records.length;
    });
    observer.observe(output, { attributes: true, characterData: true, childList: true, subtree: true });
    let maxFrameGapMs = 0;
    try {
        for (let frame = 0; frame < budget.quietFrames; frame += 1) {
            const before = clock.now();
            // eslint-disable-next-line no-await-in-loop -- frames are sequential by definition.
            await clock.nextFrame();
            maxFrameGapMs = Math.max(maxFrameGapMs, clock.now() - before);
            // Fail on the first stalled frame: waiting out a frozen page would only hit the runner timeout.
            if (maxFrameGapMs > budget.maxFrameGapMs) throw stalled(maxFrameGapMs, budget.maxFrameGapMs);
        }
        // Records are delivered as a microtask; take any still queued for the last frame.
        mutations += observer.takeRecords().length;
    } finally {
        observer.disconnect();
    }
    if (mutations > 0)
        throw new Error(
            `Token inspection did not settle: its output changed ${mutations} time(s) during ${budget.quietFrames} quiet frames`,
        );
    return { frames: budget.quietFrames, mutations, maxFrameGapMs };
};
