import { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react-vite';
// eslint-disable-next-line import/no-unresolved -- SB10 subpath export, invisible to the eslint import resolver
import { expect } from 'storybook/test';
import { CounsellorAvatarField, type CounsellorAvatarFieldProps } from './index';
import type { CounsellorAvatarValue } from '../../utils/counsellorAvatar';

const Controlled = ({ value: initial, ...props }: CounsellorAvatarFieldProps) => {
    const [value, setValue] = useState<CounsellorAvatarValue>(initial);
    return (
        <div style={{ maxWidth: 360 }}>
            <CounsellorAvatarField {...props} value={value} onChange={setValue} />
            <pre data-testid="avatar-value" style={{ marginTop: 12, fontSize: 12 }}>
                {JSON.stringify(value)}
            </pre>
        </div>
    );
};

/**
 * Avatar section of the consultant form and of the counsellor onboarding
 * wizard (#1046/#1047): ONE radiogroup holding the initials tile plus the
 * platform's 61 monochrome counsellor motifs, all light on the tenant's
 * saturated brand red. The own-picture tile arrives with #1048/#1049.
 */
const meta = {
    title: 'Molecules/CounsellorAvatarField',
    component: CounsellorAvatarField,
    render: (args) => <Controlled {...args} />,
    args: {
        value: {},
        // The controlled wrapper owns the real handler; this satisfies the required prop.
        onChange: () => {},
        displayName: 'Lena Beispiel',
    },
    parameters: { layout: 'padded' },
} satisfies Meta<typeof CounsellorAvatarField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing chosen yet — the unset state #1046 asks for: no tile is checked. */
export const Unset: Story = {
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.queryByRole('radio', { checked: true })).not.toBeInTheDocument();
        await userEvent.click(canvas.getByRole('radio', { name: 'Initialen LB' }));
        await expect(canvas.getByTestId('avatar-value')).toHaveTextContent('"avatarKind":"INITIALS"');
    },
};

/** Picking a motif stores the ICON kind and its id. */
export const PicksAMotif: Story = {
    play: async ({ canvas, userEvent }) => {
        await userEvent.click(canvas.getByRole('radio', { name: 'Symbol fox' }));
        await expect(canvas.getByTestId('avatar-value')).toHaveTextContent('"avatarId":"fox"');
    },
};

/** Switching back to the initials clears the motif id instead of keeping it. */
export const MotifThenInitials: Story = {
    args: { value: { avatarKind: 'ICON', avatarId: 'fox' } },
    play: async ({ canvas, userEvent }) => {
        await expect(canvas.getByRole('radio', { name: 'Symbol fox' })).toBeChecked();
        await userEvent.click(canvas.getByRole('radio', { name: 'Initialen LB' }));
        await expect(canvas.getByTestId('avatar-value')).toHaveTextContent('"avatarId":""');
    },
};

/** Without a name the initials tile is an empty tinted circle, not a made-up letter. */
export const NoNameYet: Story = {
    args: { displayName: '' },
    play: async ({ canvas }) => {
        await expect(canvas.getByRole('radio', { name: 'Initialen' })).toBeInTheDocument();
    },
};

/** At 320px the grid stays usable — the acceptance criterion of #1046. The
 *  packed grid finds its own column count, so the story fixes none. */
export const Narrow320: Story = {
    globals: { viewport: { value: 'mobile1', isRotated: false } },
    parameters: { chromatic: { viewports: [320] } },
    render: (args) => (
        <div style={{ width: 320 }}>
            <Controlled {...args} />
        </div>
    ),
};

/** Read-only form: the picker shows the stored choice and cannot be changed. */
export const Disabled: Story = {
    args: { value: { avatarKind: 'ICON', avatarId: 'owl' }, disabled: true },
};
