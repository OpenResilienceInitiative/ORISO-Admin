import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, userEvent, within } from 'storybook/test';
import { type ComponentProps, useState } from 'react';
import { M3Switch } from './index';

const meta = {
    title: 'Atoms/M3Switch',
    component: M3Switch,
    parameters: { layout: 'padded' },
    args: {
        label: 'Beispiel-Switch',
        onChange: () => {},
    },
} satisfies Meta<typeof M3Switch>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Off: Story = {
    args: { checked: false },
};

export const On: Story = {
    args: { checked: true },
};

export const OffDisabled: Story = {
    args: { checked: false, disabled: true },
};

export const OnDisabled: Story = {
    args: { checked: true, disabled: true },
};

const StatefulSwitch = (args: ComponentProps<typeof M3Switch>) => {
    const [checked, setChecked] = useState(!!args.checked);
    return <M3Switch {...args} checked={checked} onChange={setChecked} />;
};

/** „An“/„Aus“ next to the switch (#1374). */
export const StateLabelOff: Story = {
    args: { checked: false, showStateLabel: true, label: 'Rundgänge in Hilfe' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('switch', { name: 'Rundgänge in Hilfe' })).toHaveAttribute(
            'aria-checked',
            'false',
        );
        await expect(canvas.getByText(/^(Aus|Off)$/)).toBeVisible();
    },
};

/** The word follows the state when the switch is toggled. */
export const StateLabelToggles: Story = {
    args: { checked: false, showStateLabel: true, label: 'Rundgänge in Hilfe' },
    render: (args) => <StatefulSwitch {...args} />,
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);
        const toggle = canvas.getByRole('switch', { name: 'Rundgänge in Hilfe' });

        await expect(canvas.getByText(/^(Aus|Off)$/)).toBeVisible();
        await userEvent.click(toggle);
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
        await expect(canvas.getByText(/^(An|On)$/)).toBeVisible();
    },
};

export const StateLabelOn: Story = {
    args: { checked: true, showStateLabel: true, label: 'Rundgänge in Hilfe' },
    play: async ({ canvasElement }) => {
        await expect(within(canvasElement).getByText(/^(An|On)$/)).toBeVisible();
    },
};

export const StateLabelDisabled: Story = {
    args: { checked: false, disabled: true, showStateLabel: true, label: 'Rundgänge in Hilfe' },
    play: async ({ canvasElement }) => {
        const canvas = within(canvasElement);

        await expect(canvas.getByRole('switch', { name: 'Rundgänge in Hilfe' })).toBeDisabled();
        await expect(canvas.getByText(/^(Aus|Off)$/)).toBeVisible();
    },
};
