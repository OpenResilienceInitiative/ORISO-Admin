import type { Meta, StoryObj } from '@storybook/react-vite';
import Spinner from './Spinner';

const meta = {
    title: 'Atoms/Spinner',
    component: Spinner,
    parameters: { layout: 'centered' },
} satisfies Meta<typeof Spinner>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Default double-bounce spinner (light surfaces). */
export const Default: Story = {};

/** Dark variant, for use on tinted / colored surfaces. */
export const Dark: Story = {
    args: { isDark: true },
    decorators: [
        (Story) => (
            <div style={{ background: 'var(--primary)', padding: 32, borderRadius: 8 }}>
                <Story />
            </div>
        ),
    ],
};
