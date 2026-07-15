import { useState, type ComponentProps } from 'react';
import { BankOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { FilterSelect, type FilterOption } from './FilterSelect';

const TENANTS: FilterOption[] = [
    { label: 'Musterstadt', value: 'musterstadt' },
    { label: 'Beispielhausen', value: 'beispielhausen' },
    { label: 'Demo-Mandant', value: 'demo' },
];

// A standalone, composable bordered single-select filter. Placeholder → default,
// brand outline while open (focus), brand outline + value once selected.
const meta = {
    title: 'Molecules/Filters/FilterSelect',
    component: FilterSelect,
    parameters: { layout: 'padded' },
    args: { label: 'Mandant', icon: <BankOutlined />, options: TENANTS },
} satisfies Meta<typeof FilterSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: ComponentProps<typeof FilterSelect>) => {
    const [value, setValue] = useState<string | null>(args.value ?? null);
    return <FilterSelect {...args} value={value} onChange={setValue} />;
};

/** Default: nothing selected — shows the facet name as a placeholder. */
export const Default: Story = {
    render: (args) => <Controlled {...args} />,
};

/** Selected: the chosen option is shown and the outline takes the brand colour. */
export const Selected: Story = {
    render: (args) => <Controlled {...args} />,
    args: { value: 'beispielhausen' },
};

/** Focus/open: clicking the segment opens the menu and applies the focus outline. */
export const Open: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: /Mandant/ });
        await userEvent.click(trigger);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    },
};

export const Disabled: Story = {
    render: (args) => <Controlled {...args} />,
    args: { disabled: true },
};
