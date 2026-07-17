import { Form, InputProps } from 'antd';
import { Rule } from 'antd/lib/form';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { FloatingLabelInput } from '../FloatingLabelInput';
import styles from './styles.module.scss';

export interface FormBaseInputFieldProps extends Omit<InputProps, 'name'> {
    labelKey?: string;
    placeholderKey?: string;
    required?: boolean;
    /**
     * Only optional when used with TranslatableFormField
     */
    name?: string | Array<string | number>;
    rules?: Rule[];
    component: any;
    dependencies?: string[];
}

/**
 * antd Form.Item wrapper around the shared M3 FloatingLabelInput: the label
 * rests inside the field and floats into the outline gap (no separate
 * Form.Item label anymore). Validation state flows from the Form.Item into
 * the control via `Form.Item.useStatus()`; error messages render below the
 * field as M3 supporting text. `component` decides the underlying antd input
 * (Input, Input.Password, Input.TextArea).
 */
export const FormBaseInputField = ({
    className,
    name,
    labelKey,
    required,
    placeholderKey,
    rules,
    component,
    dependencies,
    ...inputProps
}: FormBaseInputFieldProps) => {
    const { t } = useTranslation();
    const label = t(labelKey);

    return (
        <Form.Item
            className={classNames(className, styles.item)}
            name={name}
            rules={[{ required, message: t('form.errors.required') }, ...(rules || [])]}
            dependencies={dependencies}
        >
            <FloatingLabelInput
                {...inputProps}
                component={component}
                label={required ? `${label} *` : label}
                placeholder={placeholderKey && t(placeholderKey)}
            />
        </Form.Item>
    );
};
