import { Input } from 'antd';
import { FormBaseInputField, FormBaseInputFieldProps } from '../FormBaseInputField';

export const FormPasswordField = (props: Omit<FormBaseInputFieldProps, 'component'>) => {
    return <FormBaseInputField {...props} component={Input.Password} />;
};
