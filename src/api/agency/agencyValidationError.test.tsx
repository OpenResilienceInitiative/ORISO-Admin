import { render } from '@testing-library/react';
import { Form, FormInstance, Input } from 'antd';
import { describe, expect, it } from 'vite-plus/test';
import { isFieldMounted } from './agencyValidationError';

const OFFICER = ['dataProtection', 'dataProtectionOfficerContact', 'nameAndLegalForm'];

const renderForm = (withOfficerField: boolean) => {
    let instance: FormInstance | undefined;
    const Harness = () => {
        const [form] = Form.useForm();
        instance = form;
        return (
            <Form
                form={form}
                initialValues={{
                    online: true,
                    dataProtection: { dataProtectionOfficerContact: { nameAndLegalForm: '' } },
                }}
            >
                <Form.Item name="online">
                    <Input />
                </Form.Item>
                {withOfficerField && (
                    <Form.Item name={OFFICER}>
                        <Input />
                    </Form.Item>
                )}
            </Form>
        );
    };
    render(<Harness />);
    return instance as FormInstance;
};

describe('isFieldMounted', () => {
    it('finds a nested field the card renders', () => {
        expect(isFieldMounted(renderForm(true), OFFICER)).toBe(true);
    });

    it('does not count a value the card only carries in its initial values', () => {
        // The registration card holds the whole agency as initial values but renders no contact.
        expect(isFieldMounted(renderForm(false), OFFICER)).toBe(false);
        expect(isFieldMounted(renderForm(false), 'online')).toBe(true);
    });
});
