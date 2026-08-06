import type { Meta, StoryObj } from '@storybook/react-vite';
import { UnsavedChangesModal } from './index';

const meta = {
    title: 'Organisms/CardEditable/UnsavedChangesModal',
    component: UnsavedChangesModal,
    parameters: { layout: 'fullscreen' },
    args: {
        onConfirm: () => {},
        onClose: () => {},
    },
} satisfies Meta<typeof UnsavedChangesModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The destructive action ("Verwerfen") is the primary/red button and only fires
 * from an explicit click — Cancel, mask click, Esc and the close X all take the
 * safe "Abbrechen" (keep editing) path, matching every delete-confirm dialog's
 * red = destructive convention.
 */
export const Default: Story = {};
