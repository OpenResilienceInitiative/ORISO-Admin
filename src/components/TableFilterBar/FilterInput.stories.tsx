import { useState, type ComponentProps } from 'react';
import { UserOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { FilterInput } from './FilterInput';

// A standalone, composable bordered text filter. Shows a brand-coloured outline
// while focused; used on its own or as a `TableFilterBar` segment.
const meta = {
    title: 'Molecules/Filters/FilterInput',
    component: FilterInput,
    parameters: { layout: 'padded' },
    args: { label: 'Vorname', placeholder: 'Vorname' },
} satisfies Meta<typeof FilterInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: ComponentProps<typeof FilterInput>) => {
    const [value, setValue] = useState(args.value ?? '');
    return <FilterInput {...args} value={value} onValueChange={setValue} />;
};

/** Default: an empty bordered field showing its placeholder. */
export const Default: Story = {
    render: (args) => <Controlled {...args} />,
};

/** Filled with a value. */
export const WithValue: Story = {
    render: (args) => <Controlled {...args} />,
    args: { value: 'Muster' },
};

/** With a leading icon. */
export const WithIcon: Story = {
    render: (args) => <Controlled {...args} />,
    args: { icon: <UserOutlined /> },
};

/** Focus state: the outline turns brand red while the field has focus. */
export const Focused: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: 'Vorname' });
        await userEvent.click(input);
        await expect(input).toHaveFocus();
    },
};
