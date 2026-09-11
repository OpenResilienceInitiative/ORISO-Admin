import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import { FormFileUploaderField } from './index';

// Each story brings its own <Form> rather than sharing one from the meta:
// a story-level decorator is applied *in addition* to the meta decorator, so a
// story that needs a disabled form would otherwise nest one <form> in another.
const inForm =
    (formDisabled = false) =>
    (Story: () => React.ReactElement) =>
        (
            <Form disabled={formDisabled} style={{ maxWidth: 360 }}>
                <Story />
            </Form>
        );

const meta = {
    title: 'Atoms/FormFileUploaderField',
    component: FormFileUploaderField,
    parameters: { layout: 'padded' },
    args: {
        name: 'logo',
        labelKey: 'Logo',
    },
} satisfies Meta<typeof FormFileUploaderField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
    decorators: [inForm()],
};

export const Disabled: Story = {
    args: { disabled: true },
    decorators: [inForm()],
};

/**
 * How the field looks inside a card that is not in edit mode: CardEditable
 * disables its whole <Form>, and the uploader has to follow that even though its
 * own `disabled` prop is false (#689).
 */
export const InsideDisabledForm: Story = {
    decorators: [inForm(true)],
};

/**
 * The favicon field also takes ICO (#782), which the file picker now offers.
 */
export const FaviconWithIcoSupport: Story = {
    args: { allowIcon: true, labelKey: 'Favicon' },
    decorators: [inForm()],
};
