import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { CounsellorAvatar } from './index';

/**
 * The counsellor's public face (#1046/#1047). Motif and initials BOTH sit on
 * the tenant's primary-container pair, so the avatar carries the operator's
 * brand — never a colour hash. Consultants without a choice, and the
 * not-yet-built PICTURE kind, fall back to the initials.
 */
const meta = {
    title: 'Components/CounsellorAvatar',
    component: CounsellorAvatar,
    args: { displayName: 'Lena Beispiel', size: 56 },
    parameters: { layout: 'centered' },
} satisfies Meta<typeof CounsellorAvatar>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A chosen motif, tinted to the tenant's brand. */
export const Motif: Story = {
    args: { avatarKind: 'ICON', avatarId: 'fox', label: 'Lena Beispiel' },
    play: async ({ canvas }) => {
        const avatar = canvas.getByTestId('counsellor-avatar');
        await expect(avatar).toHaveAttribute('data-avatar-kind', 'ICON');
        await expect(avatar).toHaveAttribute('data-avatar-id', 'fox');
    },
};

/** Initials — always the primary-container pair, never a hashed colour. */
export const Initials: Story = {
    args: { avatarKind: 'INITIALS', label: 'Lena Beispiel' },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('counsellor-avatar')).toHaveTextContent('LB');
    },
};

/** A consultant who never chose keeps working: initials, no empty hole. */
export const NeverChose: Story = {
    args: { firstname: 'Ada', lastname: 'Lovelace', displayName: undefined },
    play: async ({ canvas }) => {
        const avatar = canvas.getByTestId('counsellor-avatar');
        await expect(avatar).toHaveAttribute('data-avatar-kind', 'INITIALS');
        await expect(avatar).toHaveTextContent('AL');
    },
};

/** PICTURE is reserved for #1048/#1049 — until then it renders the initials. */
export const PictureFallsBackToInitials: Story = {
    args: { avatarKind: 'PICTURE', avatarId: 'picture-1' },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('counsellor-avatar')).toHaveAttribute('data-avatar-kind', 'INITIALS');
    },
};

/** A stored motif id that no longer exists must not blank the avatar. */
export const UnknownMotifFallsBack: Story = {
    args: { avatarKind: 'ICON', avatarId: 'unicorn' },
    play: async ({ canvas }) => {
        await expect(canvas.getByTestId('counsellor-avatar')).toHaveTextContent('LB');
    },
};

/** The sizes the app uses: chat message, list row, profile header. */
export const Sizes: Story = {
    args: { avatarKind: 'ICON', avatarId: 'owl' },
    render: (args) => (
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {[24, 32, 40, 56, 96].map((size) => (
                <CounsellorAvatar key={size} {...args} size={size} />
            ))}
        </div>
    ),
};
