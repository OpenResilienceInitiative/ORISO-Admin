// eslint-disable-next-line import/no-unresolved -- Storybook 10 subpath export.
import { expect, userEvent, waitFor, within } from 'storybook/test';

const CHIP = /^(Nur lesen|Read only)$/;

/**
 * Story step for a tile the viewer may only read (#1374): the "Nur lesen" chip, the dashed
 * outline, the locked edit action, and on hover the sentence naming who can change it (`hint`
 * matches a piece of it in either language).
 */
export const expectReadOnlyTile = async (canvasElement: HTMLElement, hint: RegExp) => {
    const canvas = within(canvasElement);
    // The action row comes with the tile's content, which may still be loading after the header; a
    // tile may also be rebuilt once its data arrives. Look the chip up only after that.
    await waitFor(
        () => expect(canvas.getByRole('button', { name: /bearbeiten|edit/i })).toHaveAttribute('aria-disabled', 'true'),
        { timeout: 8000 },
    );
    const chip = canvas.getByText(CHIP);
    await expect(chip).toBeVisible();
    const tile = chip.closest<HTMLElement>('[class*="readOnlyTile"]');
    await expect(tile).not.toBeNull();
    await expect(getComputedStyle(tile as HTMLElement).borderTopStyle).toBe('dashed');

    await userEvent.hover(chip);
    const tooltip = await within(canvasElement.ownerDocument.body).findByRole('tooltip');
    await expect(tooltip).toHaveTextContent(hint);
    await userEvent.unhover(chip);
};

/** Who can change the appearance tiles of an organisation admin, as the page names it. */
export const PLATFORM_RELEASE_HINT = /Plattform-Administration|Platform admins can allow/;
