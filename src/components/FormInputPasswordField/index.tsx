import { Input } from 'antd';
import { FormBaseInputField, FormBaseInputFieldProps } from '../FormBaseInputField';

export const FormInputPasswordField = (props: Omit<FormBaseInputFieldProps, 'component'>) => {
    return <FormBaseInputField {...props} component={Input.Password} />;
};
