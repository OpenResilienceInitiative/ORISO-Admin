import type { Meta, StoryObj } from '@storybook/react-vite';
import { Button as LegacyButton, BUTTON_TYPES } from '../button/Button';
import { M3Button } from './index';

const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3l4 4h-3v6h-2V7H8l4-4zM5 18v2h14v-2H5z" fill="currentColor" />
    </svg>
);
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M11 5h2v6h6v2h-6v6h-2v-6H5v-2h6z" fill="currentColor" />
    </svg>
);

const meta = {
    title: 'Atoms/M3Button',
    component: M3Button,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34789',
        },
    },
    args: { children: 'Button' },
} satisfies Meta<typeof M3Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Text: Story = { args: { variant: 'text', children: 'Next' } };
export const Outlined: Story = {
    args: { variant: 'outlined', icon: <PlusIcon />, children: 'additional postal code' },
};
export const Filled: Story = { args: { variant: 'filled', icon: <UploadIcon />, children: 'Upload' } };
export const Tonal: Story = { args: { variant: 'tonal', children: 'Batch Mode' } };
export const Disabled: Story = { args: { variant: 'filled', disabled: true, children: 'Upload' } };
export const DisabledText: Story = { args: { variant: 'text', disabled: true, children: 'Next' } };
export const DisabledOutlined: Story = {
    args: { variant: 'outlined', disabled: true, icon: <PlusIcon />, children: 'additional postal code' },
};
export const DisabledTonal: Story = { args: { variant: 'tonal', disabled: true, children: 'Batch Mode' } };
export const Loading: Story = { args: { variant: 'outlined', loading: true, children: 'Save' } };

/**
 * Every variant disabled, side by side — the view that makes a regression
 * obvious. M3 disables a filled or tonal button by neutralising its container
 * (`on-surface` 12%) and dropping the label to 38%; the brand colour must not
 * survive. A blanket `opacity` on the control instead produces a faded pink
 * pill, which is exactly what the admin sign-in form showed once its submit
 * button moved to `M3Button` (PR #839) — the login page's initial state IS the
 * disabled state.
 */
export const AllVariantsDisabled: StoryObj = {
    render: () => (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <M3Button variant="text" disabled>
                Back
            </M3Button>
            <M3Button variant="outlined" disabled icon={<PlusIcon />}>
                additional postal code
            </M3Button>
            <M3Button variant="filled" disabled icon={<UploadIcon />}>
                Upload
            </M3Button>
            <M3Button variant="tonal" disabled>
                Batch Mode
            </M3Button>
        </div>
    ),
};

export const AllVariants: StoryObj = {
    render: () => (
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            <M3Button variant="text">Back</M3Button>
            <M3Button variant="outlined" icon={<PlusIcon />}>
                additional postal code
            </M3Button>
            <M3Button variant="filled" icon={<UploadIcon />}>
                Upload
            </M3Button>
            <M3Button variant="tonal">Batch Mode</M3Button>
        </div>
    ),
};

/**
 * Before/after: the legacy `button.less` control (slate #4C555F, its own scale)
 * vs. the Figma-aligned M3Button (red primary, M3 variants). Same actions.
 */
export const AlignmentVsLegacy: StoryObj = {
    render: () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            <div>
                <div style={{ font: '500 12px/16px var(--m3-body-font-family)', color: '#8a8d8e', marginBottom: 12 }}>
                    Today — legacy Button (button.less)
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <LegacyButton item={{ type: BUTTON_TYPES.PRIMARY, label: 'Save', id: 'l1' }} />
                    <LegacyButton item={{ type: BUTTON_TYPES.SECONDARY, label: 'Cancel', id: 'l2' }} />
                    <LegacyButton item={{ type: BUTTON_TYPES.LINK, label: 'Learn more', id: 'l3' }} />
                </div>
            </div>
            <div>
                <div style={{ font: '500 12px/16px var(--m3-body-font-family)', color: '#8a8d8e', marginBottom: 12 }}>
                    Figma-aligned — M3Button
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                    <M3Button variant="filled">Save</M3Button>
                    <M3Button variant="outlined">Cancel</M3Button>
                    <M3Button variant="text">Learn more</M3Button>
                </div>
            </div>
        </div>
    ),
};
