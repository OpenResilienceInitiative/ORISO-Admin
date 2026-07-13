import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button, BUTTON_TYPES } from './Button';

const meta = {
    title: 'Atoms/Button',
    component: Button,
    parameters: { layout: 'padded' },
    args: {
        buttonHandle: () => {},
    },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Primary: Story = {
    args: {
        item: { type: BUTTON_TYPES.PRIMARY, label: 'Speichern', id: 'primary' },
    },
};

export const Secondary: Story = {
    args: {
        item: { type: BUTTON_TYPES.SECONDARY, label: 'Abbrechen', id: 'secondary' },
    },
};

export const Tertiary: Story = {
    args: {
        item: { type: BUTTON_TYPES.TERTIARY, label: 'Zurücksetzen', id: 'tertiary' },
    },
};

export const Link: Story = {
    args: {
        item: { type: BUTTON_TYPES.LINK, label: 'Mehr erfahren', id: 'link' },
        isLink: true,
    },
};

export const Disabled: Story = {
    args: {
        item: { type: BUTTON_TYPES.PRIMARY, label: 'Speichern', id: 'disabled' },
        disabled: true,
    },
};
