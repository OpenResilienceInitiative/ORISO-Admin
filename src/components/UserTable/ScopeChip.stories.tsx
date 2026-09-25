import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, fn, waitFor } from 'storybook/test';
import { ScopeChip } from './ScopeChip';

/**
 * Grey chip for a Träger or a Beratungsstelle: kind + ID, postcode and city.
 * Hover or focus opens a card with the full name, address and ID. Träger and
 * BST chips look the same — only the word differs.
 */
const meta = {
    title: 'Molecules/UserTable/ScopeChip',
    component: ScopeChip,
    parameters: { layout: 'padded' },
    args: {
        kind: 'tenant',
        id: 12,
        name: 'Caritasverband für das Erzbistum Berlin e. V.',
        postcode: '10115',
        city: 'Berlin',
        address: 'Tübinger Straße 5, 10115 Berlin',
    },
} satisfies Meta<typeof ScopeChip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Tenant: Story = {
    play: async ({ canvas, canvasElement, userEvent }) => {
        const chip = canvas.getByText(/Träger|Provider/).closest('[data-scope-chip]') as HTMLElement;
        await expect(chip).toHaveTextContent('12');
        await expect(chip).toHaveTextContent('10115 Berlin');

        await userEvent.hover(chip);
        const card = await waitFor(() => canvas.getByRole('tooltip'));
        await expect(card).toBeVisible();
        await expect(card).toHaveTextContent('Caritasverband für das Erzbistum Berlin e. V.');
        await expect(card).toHaveTextContent('Tübinger Straße 5');
        await expect(chip).toHaveAttribute('aria-describedby', card.id);

        await userEvent.unhover(chip);
        await waitFor(() => expect(canvasElement.querySelector('[role="tooltip"]')).toBeNull());
    },
};

/** Same look, other word. Keyboard focus opens the card; Escape closes it. */
export const Agency: Story = {
    args: {
        kind: 'agency',
        id: 3407,
        name: 'Suchtberatung Mitte',
        postcode: '10178',
        city: 'Berlin',
        address: 'Alexanderplatz 1, 10178 Berlin',
    },
    play: async ({ canvas, canvasElement, userEvent }) => {
        await expect(canvas.getByText(/^(BST|Agency)/)).toBeVisible();
        await userEvent.tab();
        await expect(await waitFor(() => canvas.getByRole('tooltip'))).toHaveTextContent('Suchtberatung Mitte');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(canvasElement.querySelector('[role="tooltip"]')).toBeNull());
    },
};

/** With `onClick` the chip is a button, e.g. "only show this Träger". */
export const Clickable: Story = {
    args: { onClick: fn() },
    play: async ({ args, canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('button'));
        await expect(args.onClick).toHaveBeenCalledOnce();
    },
};
