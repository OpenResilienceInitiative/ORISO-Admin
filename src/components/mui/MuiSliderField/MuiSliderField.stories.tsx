import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
// eslint-disable-next-line import/no-unresolved -- Storybook's exports map resolves for TypeScript and Vite.
import { expect, userEvent, within } from 'storybook/test';
import { MuiSliderField } from './index';

const meta = {
    title: 'Molecules/MuiSliderField',
    component: MuiSliderField,
    parameters: { layout: 'padded' },
    decorators: [
        (Story) => (
            <Form style={{ maxWidth: 360 }} initialValues={{ ageRange: [18, 65] }}>
                <Story />
            </Form>
        ),
    ],
    args: {
        name: 'ageRange',
        label: 'Altersspanne',
        min: 0,
        max: 100,
    },
} satisfies Meta<typeof MuiSliderField>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Range slider bound to an antd Form field, with min/max marks and always-on tooltips. */
export const Default: Story = {
    play: async ({ canvasElement }) => {
        const controls = within(canvasElement);
        const lowerLimit = controls.getByRole('slider', { name: 'Altersspanne min' });
        const upperLimit = controls.getByRole('slider', { name: 'Altersspanne max' });
        await userEvent.tab();
        await expect(lowerLimit).toHaveFocus();
        await userEvent.tab();
        await expect(upperLimit).toHaveFocus();
    },
};

/** With an optional help text below the label. */
export const WithHelp: Story = {
    args: { help: 'Wählen Sie die Zielgruppe für dieses Angebot.' },
};
