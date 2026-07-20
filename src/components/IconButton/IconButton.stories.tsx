import type { Meta, StoryObj } from '@storybook/react-vite';
import { IconButton } from './index';

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
            d="M12 10.6 7.8 6.4 6.4 7.8 10.6 12l-4.2 4.2 1.4 1.4L12 13.4l4.2 4.2 1.4-1.4L13.4 12l4.2-4.2-1.4-1.4z"
            fill="currentColor"
        />
    </svg>
);

const meta = {
    title: 'Atoms/IconButton',
    component: IconButton,
    parameters: {
        layout: 'padded',
        design: {
            type: 'figma',
            url: 'https://www.figma.com/design/QfsgojtHQzBjbzU3Im9Cet/Admin.ORISO?node-id=1-34785',
        },
    },
    args: { icon: <CloseIcon />, ariaLabel: 'Remove' },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Filled: Story = { args: { variant: 'filled' } };
export const Standard: Story = { args: { variant: 'standard' } };
export const Disabled: Story = { args: { variant: 'filled', disabled: true } };

/** Postal-code delete (Figma 1-34785): a filled circular delete at the row end. */
export const InPostalCodeRow: StoryObj = {
    render: () => (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="m3-body-medium">10117</span>
            <span aria-hidden>↔</span>
            <span className="m3-body-medium">10130</span>
            <IconButton variant="filled" icon={<CloseIcon />} ariaLabel="Remove postal code range" />
        </div>
    ),
};
