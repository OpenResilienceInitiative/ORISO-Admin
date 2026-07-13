import type { Meta, StoryObj } from '@storybook/react-vite';
import { LanguageSelector } from './index';

const meta = {
    title: 'Molecules/LanguageSelector',
    component: LanguageSelector,
    parameters: { layout: 'padded' },
    args: {
        variant: 'compact',
        showIcon: true,
    },
} satisfies Meta<typeof LanguageSelector>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Compact variant — used in the profile / settings header. */
export const Compact: Story = {
    args: { variant: 'compact' },
};

/** Login variant — borderless, sits on the public login surface. */
export const Login: Story = {
    args: { variant: 'login' },
};

/** Profile variant. */
export const Profile: Story = {
    args: { variant: 'profile' },
};

/** Without the leading globe icon. */
export const NoIcon: Story = {
    args: { showIcon: false },
};
