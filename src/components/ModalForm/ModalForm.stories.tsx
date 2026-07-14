import type { Meta, StoryObj } from '@storybook/react-vite';
import { Form } from 'antd';
import ModalForm from './ModalForm';
import { SelectFormField } from '../SelectFormField';

const meta = {
    title: 'Organisms/ModalForm',
    component: ModalForm,
    parameters: { layout: 'fullscreen' },
    args: {
        isModalCreateVisible: true,
        isInAddMode: true,
        title: 'Neue Stadt anlegen',
        handleOnAddElement: () => {},
        handleCreateModalCancel: () => {},
        formData: undefined,
        renderFormFields: ({ form }) => (
            <Form form={form}>
                <SelectFormField
                    name="city"
                    label="Stadt"
                    required
                    options={[
                        { label: 'Berlin', value: 'berlin' },
                        { label: 'Hamburg', value: 'hamburg' },
                    ]}
                />
            </Form>
        ),
    },
} satisfies Meta<typeof ModalForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
