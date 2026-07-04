import type { Meta, StoryObj } from '@storybook/react-vite';
import { TranslationApiKeysCard } from './index';

const meta = {
    title: 'Organisms/GlobalSettings/TranslationApiKeysCard',
    component: TranslationApiKeysCard,
    parameters: { layout: 'padded' },
    args: { onSave: () => undefined },
} satisfies Meta<typeof TranslationApiKeysCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithStoredKeys: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd', mistral: 'sk-mi-…f9x2' },
    },
};

export const NoKeysYet: Story = {
    args: { keys: {} },
};

export const Saving: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd' },
        savingProvider: 'mistral',
    },
};

/** ORISO rule: superadmin-only settings are visible-but-disabled for everyone else. */
export const DisabledForNonSuperadmins: Story = {
    args: {
        keys: { openrouter: 'sk-or-…abcd' },
        disabled: true,
    },
};
