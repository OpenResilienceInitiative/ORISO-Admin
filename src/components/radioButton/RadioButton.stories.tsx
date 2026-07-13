import type { Meta, StoryObj } from '@storybook/react-vite';
import { RadioButton } from './RadioButton';

const meta = {
    title: 'Atoms/RadioButton',
    component: RadioButton,
    parameters: { layout: 'padded' },
    args: {
        name: 'example',
        value: 'option-1',
        label: 'Option 1',
        inputId: 'radio-option-1',
        checked: false,
        type: 'default',
        handleRadioButton: () => {},
    },
} satisfies Meta<typeof RadioButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
    args: { checked: true },
};

/** Boxed variant — the whole option renders as a selectable card. */
export const Box: Story = {
    args: { type: 'box' },
};

/** Condensed variant for tighter layouts. */
export const Smaller: Story = {
    args: { type: 'smaller' },
};
