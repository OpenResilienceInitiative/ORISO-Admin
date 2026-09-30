import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect, within } from 'storybook/test';
import { InputChipPicker, type InputChipPickerProps } from './index';

const TOPICS = [
    { value: 12, label: 'Familienberatung' },
    { value: 13, label: 'Schuldnerberatung' },
    { value: 14, label: 'Suchtberatung' },
    { value: 15, label: 'Schwangerschaftsberatung' },
    { value: 16, label: 'Migrationsberatung' },
];

const Controlled = (props: Omit<InputChipPickerProps, 'onChange'>) => {
    const [value, setValue] = useState(props.value);
    return <InputChipPicker {...props} value={value} onChange={setValue} />;
};

/**
 * M3 input-chip picker: chips with a trailing x for the selection, one "+"
 * assist chip opening the menu of the remaining options. Built for the
 * counsellor onboarding topics (owner decision 2026-09-17).
 */
const meta = {
    title: 'Components/InputChipPicker',
    component: InputChipPicker,
    render: (args) => <Controlled {...args} />,
    args: {
        options: TOPICS,
        value: [12, 13],
        // Satisfies the required prop for typing; the controlled render owns the real handler.
        onChange: () => {},
        addLabel: 'Thema hinzufügen',
        removeLabel: (label: string) => `${label} entfernen`,
        ariaLabel: 'Themenfelder',
    },
    parameters: { layout: 'padded' },
} satisfies Meta<typeof InputChipPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Two preselected topics, three more available in the menu. */
export const Preselected: Story = {
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByText('Familienberatung')).toBeVisible();
        // Remove one via its x, add one from the menu.
        await userEvent.click(canvas.getByRole('button', { name: 'Schuldnerberatung entfernen' }));
        await expect(canvas.queryByText('Schuldnerberatung')).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('button', { name: 'Thema hinzufügen' }));
        await userEvent.click(await within(document.body).findByRole('menuitem', { name: 'Suchtberatung' }));
        await expect(canvas.getByText('Suchtberatung')).toBeVisible();
    },
};

/** Nothing selected yet: only the "+" chip. */
export const Empty: Story = {
    args: { value: [] },
};

/** Everything selected: the "+" chip disappears. */
export const AllSelected: Story = {
    args: { value: TOPICS.map((topic) => topic.value) },
    play: async ({ canvas }) => {
        await expect(canvas.queryByRole('button', { name: 'Thema hinzufügen' })).not.toBeInTheDocument();
    },
};

export const Disabled: Story = {
    args: { disabled: true },
};
