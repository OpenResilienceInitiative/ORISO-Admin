import { Form, Radio, RadioGroupProps, Space } from 'antd';
import { Rule } from 'antd/lib/form';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
import styles from './styles.module.scss';

export interface FormRadioGroupFieldProps extends Omit<RadioGroupProps, 'name'> {
    labelKey?: string;
    placeholderKey?: string;
    required?: boolean;
    name?: string | string[];
    rules?: Rule[];
    dependencies?: string[];
    vertical?: boolean;
}

export const FormRadioGroupField = ({
    className,
    name,
    labelKey,
    required,
    placeholderKey,
    rules,
    dependencies,
    vertical,
    children,
    ...groupProps
}: FormRadioGroupFieldProps) => {
    const contextDisabled = useContext(DisabledContext);
    const { t } = useTranslation();

    return (
        <Form.Item
            className={classNames(className, {
                [styles.disabled]: contextDisabled,
                [styles.vertical]: vertical,
            })}
            label={t(labelKey)}
            name={name}
            rules={[{ required, message: t('form.errors.required') }, ...(rules || [])]}
            dependencies={dependencies}
        >
            <Radio.Group {...groupProps}>
                {vertical ? <Space direction="vertical">{children}</Space> : children}
            </Radio.Group>
        </Form.Item>
    );
};
FormRadioGroupField.Radio = Radio;
