import type { Meta, StoryObj } from '@storybook/react-vite';
import { ModalSuccess } from './index';

const meta = {
    title: 'Organisms/ModalSuccess',
    component: ModalSuccess,
    parameters: { layout: 'fullscreen' },
    args: {
        titleKey: 'slogan',
        okLabelKey: 'save',
        onConfirm: () => {},
        onClose: () => {},
    },
} satisfies Meta<typeof ModalSuccess>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
