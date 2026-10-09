import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
// eslint-disable-next-line import/no-unresolved -- Storybook subpath export is invisible to the ESLint resolver.
import { expect } from 'storybook/test';
import { FormSwitchField } from './index';

const meta = {
    title: 'Atoms/FormSwitchField',
    component: FormSwitchField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'notifications',
        labelKey: 'Benachrichtigungen',
    },
} satisfies Meta<typeof FormSwitchField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** M3-styled switch rendering (see also Atoms/M3Switch). */
export const Default: Story = {
    args: { switchLabel: 'Benachrichtigungen' },
    play: async ({ canvas, userEvent }) => {
        const toggle = canvas.getByRole('switch', { name: 'Benachrichtigungen' });
        await expect(toggle).not.toBeChecked();
        await userEvent.click(toggle);
        await expect(toggle).toBeChecked();
        await userEvent.click(toggle);
        await expect(toggle).not.toBeChecked();
    },
};
