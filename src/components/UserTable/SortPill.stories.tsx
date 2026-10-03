import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, waitFor, within } from 'storybook/test';
import { SortPill, type NameSortField } from './SortPill';

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
