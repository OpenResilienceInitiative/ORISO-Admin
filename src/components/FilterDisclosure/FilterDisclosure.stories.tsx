import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor } from 'storybook/test';
import { FilterDisclosure } from '.';

/**
 * One "Filter" button above a list instead of a row of always-visible dropdowns (Admin#1510).
 * The search stays next to it; the filters fold out below. The button counts the active filters.
 */
const meta = {
    title: 'Molecules/FilterDisclosure',
    component: FilterDisclosure,
    parameters: { layout: 'padded' },
    args: {
        groupLabel: 'Liste filtern',
        leading: <input aria-label="Suche" placeholder="Suche" />,
        trailing: <button type="button">Neu</button>,
        children: (
            <>
                <select aria-label="Träger" />
                <select aria-label="Beratungsstelle" />
            </>
        ),
    },
} satisfies Meta<typeof FilterDisclosure>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Closed: only search, the button and the actions; the filters are not in the page. */
export const Closed: Story = {
    play: async ({ canvas, userEvent }) => {
        const button = canvas.getByRole('button', { name: /^Filter/ });
        await expect(button).toHaveAttribute('aria-expanded', 'false');
        await expect(canvas.queryByRole('combobox', { name: 'Träger' })).toBeNull();
        await userEvent.click(button);
        await expect(button).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.getByRole('group', { name: 'Liste filtern' })).toBeVisible();
        await expect(canvas.getByRole('combobox', { name: 'Träger' })).toBeVisible();
    },
};

/** Open on load, e.g. when a filter came in through the URL. */
export const Open: Story = {
    args: { defaultOpen: true },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('button', { name: /^Filter/ })).toHaveAttribute('aria-expanded', 'true');
        await expect(canvas.getByRole('combobox', { name: 'Beratungsstelle' })).toBeVisible();
    },
};

/** Two filters set: the closed button still says so. */
export const WithActiveFilters: Story = {
    args: { activeCount: 2 },
    play: async ({ canvas }) => {
        await waitFor(() => expect(canvas.getByRole('button', { name: /^Filter/ })).toHaveAccessibleName(/2/));
    },
};
