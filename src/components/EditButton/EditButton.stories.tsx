import type { Meta, StoryObj } from '@storybook/react-vite';
import { EditButton } from './index';

const meta = {
    title: 'Atoms/EditButton',
    component: EditButton,
    parameters: { layout: 'padded' },
    args: {
        onClick: () => {},
    },
} satisfies Meta<typeof EditButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Pen icon plus the localized "edit" label. */
export const Default: Story = {};

/** Icon-only affordance (e.g. inside dense table rows). */
export const IconOnly: Story = {
    args: { showLabel: false },
};

export const Disabled: Story = {
    args: { disabled: true },
};

/** Custom label overriding the default i18n key. */
export const CustomLabel: Story = {
    args: { label: 'Bearbeiten' },
};
