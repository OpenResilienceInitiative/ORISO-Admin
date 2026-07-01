import type { Meta, StoryObj } from '@storybook/react-vite';
import { Text, LabelTypes } from './Text';

const meta = {
    title: 'Atoms/Text',
    component: Text,
    parameters: { layout: 'padded' },
} satisfies Meta<typeof Text>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Standard: Story = {
    args: { text: 'Standard-Fließtext im Admin-Panel.', type: 'standard' },
};

export const Error: Story = {
    args: { text: 'Es ist ein Fehler aufgetreten.', type: 'error' },
};

export const WithNoticeLabel: Story = {
    args: {
        text: 'Diese Einstellung gilt für alle Träger.',
        type: 'standard',
        labelType: LabelTypes.NOTICE,
    },
};
