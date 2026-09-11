import type { Meta, StoryObj } from '@storybook/react-vite';
import { PublishSourceWarningModal } from './index';

const meta = {
    title: 'Organisms/Legal/PublishSourceWarningModal',
    component: PublishSourceWarningModal,
    parameters: { layout: 'fullscreen' },
    args: {
        open: true,
        sourceLanguage: 'de',
        editedLanguages: ['en'],
        onConfirm: () => {},
        onCancel: () => {},
    },
} satisfies Meta<typeof PublishSourceWarningModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Shown when publishing edits only in non-source languages while the source
 * ("Rechtssprache") variant stayed untouched (#720) — the silent failure #718
 * documented. Confirming still publishes; cancelling returns to the editor.
 */
export const Default: Story = {};

export const MultipleEditedLanguages: Story = {
    args: { editedLanguages: ['en', 'ru'] },
};
