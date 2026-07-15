import { useState, type ComponentProps } from 'react';
import { FilterOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { FilterMultiselect } from './FilterMultiselect';
import type { FilterOption } from './FilterSelect';

const STATUSES: FilterOption[] = [
    { label: 'Eingeladen', value: 'invited' },
    { label: 'Zugestellt', value: 'delivered' },
    { label: 'Geöffnet', value: 'opened' },
    { label: 'Fehlgeschlagen', value: 'failed' },
];

// A standalone, composable bordered multi-select filter. The menu stays open while
// options are toggled; the trigger shows a brand count badge once anything is picked.
const meta = {
    title: 'Molecules/Filters/FilterMultiselect',
    component: FilterMultiselect,
    parameters: { layout: 'padded' },
    args: { label: 'Status', icon: <FilterOutlined />, options: STATUSES },
} satisfies Meta<typeof FilterMultiselect>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: ComponentProps<typeof FilterMultiselect>) => {
    const [value, setValue] = useState<string[]>(args.value ?? []);
    return <FilterMultiselect {...args} value={value} onChange={setValue} />;
};

/** Default: nothing selected. */
export const Default: Story = {
    render: (args) => <Controlled {...args} />,
};

/** Selected: a brand count badge summarises how many options are applied. */
export const Selected: Story = {
    render: (args) => <Controlled {...args} />,
    args: { value: ['invited', 'opened'] },
};

/** Focus/open: clicking opens the checkable menu (which stays open for multi-pick). */
export const Open: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const trigger = canvas.getByRole('button', { name: /Status/ });
        await userEvent.click(trigger);
        await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    },
};

export const Disabled: Story = {
    render: (args) => <Controlled {...args} />,
    args: { disabled: true },
};
