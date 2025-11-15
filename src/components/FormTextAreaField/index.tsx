import { Form, Input } from 'antd';
import { useContext } from 'react';
import classNames from 'classnames';
import { Rule } from 'rc-field-form/es/interface';
import DisabledContext from 'antd/es/config-provider/DisabledContext';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface FormTextAreaFieldProps {
    labelKey: string;
    className?: string;
    placeholderKey?: string;
    required?: boolean;
    name?: string;
    rules?: Rule[];
}

export const FormTextAreaField = ({
    className,
    name,
    labelKey,
    required,
    placeholderKey,
    rules = [],
}: FormTextAreaFieldProps) => {
    const { t } = useTranslation();
    const contextDisabled = useContext(DisabledContext);

    return (
        <Form.Item
            label={t(labelKey)}
            name={name}
            rules={[{ required }, ...rules]}
            className={classNames(className, styles.item, { [styles.disabled]: contextDisabled })}
        >
            <Input.TextArea className={styles.textarea} placeholder={placeholderKey && t(placeholderKey)} rows={3} />
        </Form.Item>
    );
};
