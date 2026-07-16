import { useState, type ComponentProps } from 'react';
import { UserOutlined } from '@ant-design/icons';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { FilterInput } from './FilterInput';

// A standalone, composable bordered text filter with an MUI-style floating label
// (#310): the label sits as the placeholder and floats up on focus/fill. Lifts
// (elevation) while focused; error state turns outline + label to the error colour.
const meta = {
    title: 'Molecules/Filters/FilterInput',
    component: FilterInput,
    parameters: { layout: 'padded' },
    args: { label: 'Vorname' },
} satisfies Meta<typeof FilterInput>;

export default meta;
type Story = StoryObj<typeof meta>;

const Controlled = (args: ComponentProps<typeof FilterInput>) => {
    const [value, setValue] = useState(args.value ?? '');
    return <FilterInput {...args} value={value} onValueChange={setValue} />;
};

/** Default: empty — the label sits in the placeholder position. */
export const Default: Story = {
    render: (args) => <Controlled {...args} />,
};

/** Filled: with a value the label stays floated as a small caption. */
export const Filled: Story = {
    render: (args) => <Controlled {...args} />,
    args: { value: 'Muster' },
};

/** With a leading icon. */
export const WithIcon: Story = {
    render: (args) => <Controlled {...args} />,
    args: { icon: <UserOutlined /> },
};

/** Error: outline + label + message take the error colour; announced via aria. */
export const Error: Story = {
    render: (args) => <Controlled {...args} />,
    args: { value: 'M', error: 'Mindestens 3 Zeichen eingeben.' },
};

/** Focus floats the label up (brand colour) and lifts the pill; blur reverses it. */
export const FloatingLabel: Story = {
    render: (args) => <Controlled {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const input = canvas.getByRole('textbox', { name: 'Vorname' });

        await userEvent.click(input);
        await expect(input).toHaveFocus();

        await userEvent.type(input, 'Anna');
        await expect(input).toHaveValue('Anna');
    },
};
