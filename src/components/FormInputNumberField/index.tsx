import classNames from 'classnames';
import { InputNumber } from 'antd';
import { FormBaseInputField, FormBaseInputFieldProps } from '../FormBaseInputField';
import styles from './styles.module.scss';

export const FormInputNumberField = (props: Omit<FormBaseInputFieldProps, 'component'>) => {
    return (
        <FormBaseInputField {...props} className={classNames(props.className, styles.input)} component={InputNumber} />
    );
};
