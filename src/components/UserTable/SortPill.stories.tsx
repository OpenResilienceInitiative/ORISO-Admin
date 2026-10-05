import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { SortPill, type NameSortField, type SortPillValue } from './SortPill';

/** Secondary sort for the name column: Nachname, Vorname or E-Mail. */
const meta = {
    title: 'Molecules/UserTable/SortPill',
    component: SortPill,
    parameters: { layout: 'padded' },
    args: { value: 'lastname', onChange: () => {} },
} satisfies Meta<typeof SortPill>;

export default meta;
type Story = StoryObj<typeof meta>;

const Playground = () => {
    const [value, setValue] = useState<NameSortField>('lastname');
    return <SortPill value={value} onChange={setValue} />;
};

export const ChooseField: Story = {
    render: () => <Playground />,
    play: async ({ canvas, canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        const pill = canvas.getByRole('button', { name: /Nachname|Last name/ });
        await expect(pill).toHaveAttribute('aria-haspopup', 'menu');

        await userEvent.click(pill);
        await expect(pill).toHaveAttribute('aria-expanded', 'true');
        await expect(await body.findByRole('menuitemradio', { name: /Nachname|Last name/ })).toHaveAttribute(
            'aria-checked',
            'true',
        );
        await userEvent.click(body.getByRole('menuitemradio', { name: /Vorname|First name/ }));

        await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
        await expect(canvas.getByRole('button', { name: /Vorname|First name/ })).toHaveFocus();
    },
};

/** Escape closes the menu without changing the order. */
export const EscapeKeepsValue: Story = {
    render: () => <Playground />,
    play: async ({ canvas, canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(canvas.getByRole('button', { name: /Nachname|Last name/ }));
        await body.findByRole('menu');
        await userEvent.keyboard('{Escape}');
        await waitFor(() => expect(body.queryByRole('menu')).toBeNull());
        await expect(canvas.getByRole('button', { name: /Nachname|Last name/ })).toBeVisible();
    },
};

/** Narrow tables: only the field shows; the button still reads "Name nach …". */
export const Compact: Story = {
    args: { compact: true },
    play: async ({ canvas }) => {
        const pill = canvas.getByRole('button', { name: /Name nach Nachname|Name by Last name/ });
        await expect(pill).toBeVisible();
        await expect(pill.getBoundingClientRect().width).toBeLessThan(130);
    },
};

/** Where the date column is hidden (tablet), the pill also offers "Zuletzt aktualisiert". */
export const WithDate: Story = {
    render: () => {
        const DatePlayground = () => {
            const [value, setValue] = useState<SortPillValue>('lastUpdated');
            return <SortPill value={value} onChange={setValue} withDate compact />;
        };
        return <DatePlayground />;
    },
    play: async ({ canvas, canvasElement, userEvent }) => {
        const body = within(canvasElement.ownerDocument.body);
        await userEvent.click(
            canvas.getByRole('button', { name: /Sortiert nach Zuletzt aktualisiert|Sorted by Last updated/ }),
        );
        const menu = await body.findByRole('menu', { name: /Sortieren nach|Sort by/ });
        await expect(within(menu).getAllByRole('menuitemradio')).toHaveLength(4);
        await userEvent.click(within(menu).getByRole('menuitemradio', { name: /Nachname|Last name/ }));
        await expect(await canvas.findByRole('button', { name: /Name nach Nachname|Name by Last name/ })).toBeVisible();
    },
};
