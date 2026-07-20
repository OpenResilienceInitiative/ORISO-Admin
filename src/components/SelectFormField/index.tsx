import { useTranslation } from 'react-i18next';
import { Form, Select } from 'antd';
import { ValidateStatus } from 'antd/es/form/FormItem';
import classNames from 'classnames';
import { Rule } from 'antd/es/form';
import { FloatingLabelSelect } from '../FloatingLabelSelect';
import formFieldStyles from '../FormBaseInputField/styles.module.scss';

export interface Option {
    label: string;
    value: string;
}

export interface SelectFormFieldProps {
    className?: string;
    label?: string;
    name: string | string[];
    placeholder?: string;
    help?: string;
    loading?: boolean;
    required?: boolean;
    isMulti?: boolean;
    options?: Option[];
    allowClear?: boolean;
    disabled?: boolean;
    errorMessage?: string;
    labelInValue?: boolean;
    children?: React.ReactElement<any>[];
    validateStatus?: ValidateStatus;
    initialValue?: string | string[];
    rules?: Rule[];
}

/**
 * antd Form.Item wrapper around FloatingLabelSelect — the select counterpart
 * to FormInputField: same M3 outlined shell, floating label and error
 * styling, so the two field types render identically inside a form.
 * `label`/`placeholder` are i18n keys, translated here (matching every
 * existing call site).
 */
export const SelectFormField = ({
    className,
    label,
    options,
    name,
    isMulti,
    help,
    allowClear,
    required,
    loading,
    placeholder,
    disabled,
    errorMessage,
    labelInValue,
    children,
    validateStatus,
    initialValue,
    rules = [],
}: SelectFormFieldProps) => {
    const [t] = useTranslation();
    const message = errorMessage || t(`form.errors.required${isMulti ? '.multiSelect' : ''}`);
    const labelText = label ? t(label) : undefined;

    return (
        <Form.Item
            name={name}
            rules={[...rules, ...(required ? [{ required: true, message }] : [])]}
            help={help ? t(help) : undefined}
            validateStatus={validateStatus}
            className={classNames(className, formFieldStyles.item)}
            initialValue={initialValue}
        >
            <FloatingLabelSelect
                label={required ? `${labelText} *` : labelText}
                disabled={disabled}
                showSearch
                labelInValue={labelInValue}
                loading={loading}
                allowClear={allowClear}
                getPopupContainer={(element: HTMLElement) => element.parentElement}
                mode={isMulti ? 'multiple' : undefined}
                placeholder={placeholder ? t(placeholder) : undefined}
                optionFilterProp="children"
                filterOption={(input, option) => option.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0}
                filterSort={(optionA, optionB) =>
                    optionA.label?.toLowerCase().localeCompare(optionB.label?.toLowerCase())
                }
                options={options}
            >
                {children}
            </FloatingLabelSelect>
        </Form.Item>
    );
};

SelectFormField.Option = Select.Option;
