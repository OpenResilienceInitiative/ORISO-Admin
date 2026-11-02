// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, waitFor, within } from 'storybook/test';

/**
 * Story step: opens the explanation of a tile and walks through it to the last slide. Starts over
 * if the tile is rebuilt on the way (a page still loading, a form re-keyed by fresh data).
 */
export const walkThroughTileHelp = async (canvasElement: HTMLElement, totalSlides: number) => {
    const canvas = within(canvasElement);
    const body = within(canvasElement.ownerDocument.body);
    await canvas.findByRole('button', { name: /erklärung öffnen|open explanation/i }, { timeout: 8000 });
    await waitFor(
        async () => {
            if (!body.queryByRole('dialog')) {
                await userEvent.click(canvas.getByRole('button', { name: /erklärung öffnen|open explanation/i }));
            }
            await body.findByRole('dialog');
            for (let slide = 2; slide <= totalSlides; slide += 1) {
                const next = body.queryByRole('button', { name: /^(weiter|next)$/i });
                // eslint-disable-next-line no-await-in-loop -- the slides follow one another.
                if (next) await userEvent.click(next);
            }
            await expect(
                body.getByText(
                    new RegExp(`schritt ${totalSlides} von ${totalSlides}|step ${totalSlides} of ${totalSlides}`, 'i'),
                ),
            ).toBeVisible();
        },
        { timeout: 15000 },
    );
};
