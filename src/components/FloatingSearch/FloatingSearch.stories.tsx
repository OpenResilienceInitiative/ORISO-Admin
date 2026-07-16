import { useState, type ComponentProps } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { FloatingSearch } from './FloatingSearch';

// The standalone floating search pill (#310): arrow toggle (arrow_menu_open_24px,
// spins 360° on expand) + magnifier revealing an auto-focusing field. Value and
// expansion work controlled or uncontrolled, so it drops into any surface.
const meta = {
    title: 'Molecules/FloatingSearch',
    component: FloatingSearch,
    parameters: {
        layout: 'padded',
        docs: {
            description: {
                component:
                    'Reusable expanding search pill extracted from `TableFilterBar`: the arrow toggle spins a full 360° while the field expands to the right (auto-focus), Escape collapses, and a clear button appears once text is entered. `expandedWidth` adjusts the revealed field.',
            },
        },
    },
    args: { ariaLabel: 'Suche', placeholder: 'Suchen …' },
} satisfies Meta<typeof FloatingSearch>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: ComponentProps<typeof FloatingSearch>) => {
    const [value, setValue] = useState(args.value ?? '');
    return <FloatingSearch {...args} value={value} onValueChange={setValue} />;
};

/** Minimized: only the arrow + magnifier show. */
export const Minimized: Story = {
    render: (args) => <Controlled {...args} />,
};

/** Expanded with a value — lifted pill, clear button visible. */
export const Expanded: Story = {
    render: (args) => <Controlled {...args} />,
    args: { defaultExpanded: true, value: 'anna@example.org' },
};

/** A wider reveal via `expandedWidth`. */
export const WideField: Story = {
    render: (args) => <Controlled {...args} />,
    args: { defaultExpanded: true, expandedWidth: 400 },
};

export const Disabled: Story = {
    render: (args) => <Controlled {...args} />,
    args: { disabled: true },
};

/** Clicking the arrow spins it 360°, expands and focuses the field; Escape collapses. */
export const ExpandInteraction: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const toggle = canvas.getByRole('button', { name: 'Suche ein-/ausklappen' });
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');

        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-expanded', 'true');

        const input = canvas.getByRole('textbox', { name: 'Suche' });
        await expect(input).toHaveFocus();

        await userEvent.type(input, 'Musterstadt');
        await expect(input).toHaveValue('Musterstadt');

        await userEvent.keyboard('{Escape}');
        await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    },
};
