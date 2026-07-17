import { Input } from 'antd';
import { Rule } from 'antd/es/form';
import { FormBaseInputField } from '../FormBaseInputField';

interface FormTextAreaFieldProps {
    labelKey: string;
    className?: string;
    placeholderKey?: string;
    required?: boolean;
    name?: string;
    rules?: Rule[];
}

/**
 * M3 floating-label textarea: same outlined shell as the other form fields,
 * the label floats to the top edge and the field auto-grows with its content.
 */
export const FormTextAreaField = (props: FormTextAreaFieldProps) => {
    return <FormBaseInputField {...props} component={Input.TextArea} />;
};
