import type { Meta, StoryObj } from '@storybook/react-vite';
import { ReactComponent as ScheduleIcon } from '../../resources/img/svg/oriso/schedule_24px.svg';
import { Modal } from './index';

/**
 * Standard M3 basic dialog (Design-System M3_ORISO, node 60942-12062):
 * surface-container-high sheet, optional hero icon, centered headline-small
 * title, body-medium text, divider and right-aligned M3 text buttons.
 */
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

/** Full M3 anatomy: 32px hero icon above the centered title, divider, text buttons. */
export const WithHeroIcon: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        okLabelKey: 'save',
        cancelLabelKey: 'cancel',
        icon: <ScheduleIcon />,
        onConfirm: () => {},
        onClose: () => {},
    },
};

/** Without divider (short informational dialogs). */
export const WithoutDivider: Story = {
    args: {
        titleKey: 'slogan',
        contentKey: 'subSlogan',
        okLabelKey: 'save',
        showDivider: false,
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
