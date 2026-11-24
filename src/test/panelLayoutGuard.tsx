import type { ReactNode } from 'react';

/**
 * Width of the Admin content column (viewport minus the 128px rail and 2 × 24px page padding) for the
 * laptop and desktop widths people actually use. The card grid and tile panels size themselves with
 * container queries, so a frame this wide shows a page exactly as that viewport does.
 * Admin quality pass 2026-11-11: switches overlapped the next panel at 1024, 1440 and 1536.
 */
export const CONTENT_WIDTHS_BY_VIEWPORT: Record<number, number> = {
    820: 644,
    1024: 848,
    1280: 1104,
    1366: 1190,
    1440: 1264,
    1536: 1360,
    1920: 1744,
};

const FRAME_ATTRIBUTE = 'data-panel-layout-frame';

export const PanelLayoutFrame = ({ children }: { children: ReactNode }) => (
    <div {...{ [FRAME_ATTRIBUTE]: '' }} style={{ width: '100%', maxWidth: '100%' }}>
        {children}
    </div>
);

const nextFrame = () =>
    new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

const overlaps = (a: DOMRect, b: DOMRect) =>
    Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
    Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;

/**
 * Resizes the frame through every width and fails when a switch leaves its panel, covers a text
 * field, or keeps less than `minLabelWidth` for its label (long German words then break one per line).
 */
export const expectPanelsFitAtEveryWidth = async (canvasElement: HTMLElement, minLabelWidth = 160) => {
    const frame = canvasElement.querySelector<HTMLElement>(`[${FRAME_ATTRIBUTE}]`);
    if (!frame) throw new Error('Wrap the story in <PanelLayoutFrame>.');

    const problems: string[] = [];

    const check = (viewport: string) => {
        const fields = Array.from(canvasElement.querySelectorAll<HTMLElement>('.MuiOutlinedInput-root'));
        canvasElement.querySelectorAll<HTMLElement>('section[aria-labelledby^="tile-section-"]').forEach((panel) => {
            const panelBox = panel.getBoundingClientRect();
            const name = panel.querySelector('h3')?.textContent ?? panel.id;

            panel.querySelectorAll<HTMLElement>('.MuiSwitch-root').forEach((toggle) => {
                const box = toggle.getBoundingClientRect();
                if (box.right > panelBox.right + 1 || box.left < panelBox.left - 1) {
                    problems.push(`${viewport}px: a switch leaves panel "${name}"`);
                }
                if (fields.some((field) => overlaps(box, field.getBoundingClientRect()))) {
                    problems.push(`${viewport}px: a switch in panel "${name}" covers a text field`);
                }
            });
            panel.querySelectorAll<HTMLElement>('.MuiFormControlLabel-label').forEach((label) => {
                const labelWidth = label.getBoundingClientRect().width;
                if (labelWidth > 0 && labelWidth < minLabelWidth) {
                    problems.push(`${viewport}px: switch label in panel "${name}" is only ${Math.round(labelWidth)}px`);
                }
            });
        });
    };

    // One width after the other: each needs a layout pass before it can be measured.
    await Object.entries(CONTENT_WIDTHS_BY_VIEWPORT).reduce(
        (previous, [viewport, width]) =>
            previous.then(async () => {
                frame.style.width = `${width}px`;
                await nextFrame();
                check(viewport);
            }),
        Promise.resolve(),
    );

    frame.style.width = '100%';
    if (problems.length) throw new Error(`Panels do not fit:\n${problems.join('\n')}`);
};
