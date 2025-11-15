import { Form, Switch } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import styles from './styles.module.scss';

interface FormSwitchFieldProps {
    labelKey?: string;
    label?: React.ReactChild;
    name: string | string[];
    help?: string;
    disabled?: boolean;
    required?: boolean;
    errorMessage?: string;
    checkedKey?: string;
    unCheckedKey?: string;
    paragraphKey?: string;
    inline?: boolean;
    disableLabels?: boolean;
    inverseValue?: boolean;
    className?: string;
}

interface FormSwitchFieldLocalProps {
    onChange?: (value: boolean) => void;
    checked?: boolean;
    disabled?: boolean;
    paragraphKey?: string;
    checkedKey: string;
    unCheckedKey: string;
    disableLabels?: boolean;
    inverseValue?: boolean;
}

const FormSwitchFieldLocal = ({
    onChange,
    checked,
    paragraphKey,
    checkedKey,
    disabled,
    disableLabels,
    unCheckedKey,
    inverseValue,
}: FormSwitchFieldLocalProps) => {
    const { t } = useTranslation();

    return (
        <div className="formSwitchField__container">
            <Switch
                disabled={disabled}
                size="default"
                onChange={(value) => onChange(inverseValue ? !value : value)}
                checked={inverseValue ? !checked : checked}
                checkedChildren={!disableLabels && t(checkedKey)}
                unCheckedChildren={!disableLabels && t(unCheckedKey)}
            />
            {paragraphKey && <Paragraph className="desc__toggleText">{t(paragraphKey)}</Paragraph>}
        </div>
    );
};

export const FormSwitchField = ({
    name,
    label,
    labelKey,
    required,
    help,
    disabled,
    className,
    errorMessage,
    paragraphKey,
    inline,
    inverseValue,
    disableLabels,
    checkedKey = 'yes',
    unCheckedKey = 'no',
}: FormSwitchFieldProps) => {
    const [t] = useTranslation();
    const message = errorMessage || t('form.errors.required');

    return (
        <Form.Item
            name={name}
            label={label || t(labelKey)}
            rules={required ? [{ required: true, message }] : undefined}
            help={help ? t(help) : undefined}
            valuePropName="checked"
            className={classNames(className, styles.item, { [styles.inline]: inline })}
        >
            <FormSwitchFieldLocal
                paragraphKey={paragraphKey}
                checkedKey={checkedKey}
                unCheckedKey={unCheckedKey}
                disabled={disabled}
                disableLabels={disableLabels}
                inverseValue={inverseValue}
            />
        </Form.Item>
    );
};
