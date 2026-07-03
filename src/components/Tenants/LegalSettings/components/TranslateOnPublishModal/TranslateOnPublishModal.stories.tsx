import type { Meta, StoryObj } from '@storybook/react-vite';
import { TranslateOnPublishModal } from './index';

const meta = {
    title: 'Organisms/Legal/TranslateOnPublishModal',
    component: TranslateOnPublishModal,
    parameters: { layout: 'fullscreen' },
    args: {
        open: true,
        sourceLanguage: 'de',
        targetLanguages: ['en', 'fr', 'uk'],
        onConfirm: () => undefined,
        onSkip: () => undefined,
        onCancel: () => undefined,
    },
} satisfies Meta<typeof TranslateOnPublishModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Translating: Story = {
    args: { translating: true },
};

export const KeyInvalidError: Story = {
    args: { errorKey: 'legal.translation.error.keyInvalid' },
};

export const NotConfiguredError: Story = {
    args: { errorKey: 'legal.translation.error.notConfigured' },
};
