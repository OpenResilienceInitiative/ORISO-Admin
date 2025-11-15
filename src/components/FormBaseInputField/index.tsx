import { Form, InputProps } from 'antd';
import { Rule } from 'antd/lib/form';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { useContext } from 'react';
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
    const contextDisabled = useContext(DisabledContext);
    const { t } = useTranslation();
    const Children = component;

    return (
        <Form.Item
            className={classNames(className, styles.item, {
                [styles.disabled]: contextDisabled,
                [styles.withAddon]: !!inputProps.addonAfter,
            })}
            label={t(labelKey)}
            name={name}
            rules={[{ required, message: t('form.errors.required') }, ...(rules || [])]}
            dependencies={dependencies}
        >
            <Children {...inputProps} className={styles.input} placeholder={placeholderKey && t(placeholderKey)} />
        </Form.Item>
    );
};
