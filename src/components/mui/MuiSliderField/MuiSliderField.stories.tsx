import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
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
export const Default: Story = {};

/** With an optional help text below the label. */
export const WithHelp: Story = {
    args: { help: 'Wählen Sie die Zielgruppe für dieses Angebot.' },
};
