import { describe, expect, it } from 'vite-plus/test';

import { checkInspectionLiveness, INSPECTION_LIVENESS_BUDGET, type FrameClock } from './inspectionLiveness';

/** Deterministic clock: every frame advances time by the next scripted gap; no real waiting. */
const scriptedClock = (gaps: number[], onFrame: (frame: number) => void = () => undefined): FrameClock => {
    let time = 0;
    let frame = 0;
    return {
        now: () => time,
        nextFrame: () =>
            new Promise<void>((resolve) => {
                time += gaps[Math.min(frame, gaps.length - 1)];
                frame += 1;
                onFrame(frame);
                resolve();
            }),
    };
};

const output = () => {
    const section = document.createElement('section');
    section.append(document.createElement('pre'));
    document.body.append(section);
    return section;
};

describe('inspection liveness (stalled or never-settling token inspection fails the check)', () => {
    it('passes when the inspector output is quiet and every frame arrives on time', async () => {
        const target = output();
        try {
            const result = await checkInspectionLiveness(target, scriptedClock([16]));
            expect(result).toEqual({ frames: INSPECTION_LIVENESS_BUDGET.quietFrames, mutations: 0, maxFrameGapMs: 16 });
        } finally {
            target.remove();
        }
    });

    it('fails with a stall message when one frame is delayed beyond the budget (page froze)', async () => {
        const target = output();
        try {
            await expect(
                checkInspectionLiveness(target, scriptedClock([16, 16, INSPECTION_LIVENESS_BUDGET.maxFrameGapMs + 1])),
            ).rejects.toThrow(/stalled the page/);
        } finally {
            target.remove();
        }
    });

    it('fails with a settle message when the output keeps changing every frame (feedback loop)', async () => {
        const target = output();
        try {
            const pre = target.querySelector('pre');
            await expect(
                checkInspectionLiveness(
                    target,
                    scriptedClock([16], (frame) => {
                        if (pre) pre.textContent = `report ${frame}`;
                    }),
                ),
            ).rejects.toThrow(/did not settle/);
        } finally {
            target.remove();
        }
    });

    it('counts a late attribute change as unsettled output, not only text', async () => {
        const target = output();
        try {
            await expect(
                checkInspectionLiveness(
                    target,
                    scriptedClock([16], (frame) => {
                        if (frame === INSPECTION_LIVENESS_BUDGET.quietFrames) target.setAttribute('data-late', 'x');
                    }),
                ),
            ).rejects.toThrow(/did not settle/);
        } finally {
            target.remove();
        }
    });

    it('detaches its observer after every run so later output changes are not attributed to it', async () => {
        const target = output();
        try {
            await checkInspectionLiveness(target, scriptedClock([16]));
            target.setAttribute('data-after', 'x');
            const second = await checkInspectionLiveness(target, scriptedClock([16]));
            expect(second.mutations).toBe(0);
        } finally {
            target.remove();
        }
    });
});
