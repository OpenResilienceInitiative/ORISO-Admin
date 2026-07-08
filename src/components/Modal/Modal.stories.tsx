import type { Meta, StoryObj } from '@storybook/react-vite';
import { Modal } from './index';

const meta = {
    title: 'Organisms/Modal',
    component: Modal,
    parameters: { layout: 'fullscreen' },
} satisfies Meta<typeof Modal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Confirmation dialog: title/content/actions all resolved via i18n keys. */
export const Confirmation: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        okLabelKey: 'save',
        cancelLabelKey: 'cancel',
        onConfirm: () => {},
        onClose: () => {},
    },
};

export const WithCustomChildren: Story = {
    args: {
        titleKey: 'slogan',
        okLabelKey: 'save',
        cancelLabelKey: 'cancel',
        onConfirm: () => {},
        onClose: () => {},
        children: 'Beliebiger Formularinhalt lässt sich als children einsetzen.',
    },
};
