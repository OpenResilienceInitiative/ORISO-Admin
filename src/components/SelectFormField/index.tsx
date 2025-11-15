import { useTranslation } from 'react-i18next';
import { Form, Select } from 'antd';
import { ValidateStatus } from 'antd/es/form/FormItem';
import classNames from 'classnames';
import { Rule } from 'rc-field-form/lib/interface';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import { useContext } from 'react';
import styles from './styles.module.scss';

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
    children?: React.ReactElement[];
    validateStatus?: ValidateStatus;
    initialValue?: string | string[];
    rules?: Rule[];
}

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
    const contextDisabled = useContext(DisabledContext);

    return (
        <Form.Item
            name={name}
            label={t(label)}
            rules={[...rules, ...(required ? [{ required: true, message }] : [])]}
            help={help ? t(help) : undefined}
            validateStatus={validateStatus}
            className={classNames(className, styles.item, { [styles.disabled]: contextDisabled || disabled })}
            initialValue={initialValue}
        >
            <Select
                className={styles.select}
                disabled={disabled}
                showSearch
                size="large"
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
            </Select>
        </Form.Item>
    );
};

SelectFormField.Option = Select.Option;
