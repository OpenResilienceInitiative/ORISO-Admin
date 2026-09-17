import { ConfigProvider, Form } from 'antd';
import Paragraph from 'antd/lib/typography/Paragraph';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { M3Switch } from '../M3Switch';
import styles from './styles.module.scss';

interface FormSwitchFieldProps {
    labelKey?: string;
    label?: React.ReactElement<any> | number | string;
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
    switchLabel?: string;
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
    switchLabel: string;
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
    switchLabel,
}: FormSwitchFieldLocalProps) => {
    const { t } = useTranslation();
    const { componentDisabled } = ConfigProvider.useConfig();
    const isDisabled = componentDisabled || disabled;
    const fieldChecked = inverseValue ? !checked : checked;
    const onSwitchChange = (value: boolean) => onChange?.(inverseValue ? !value : value);

    return (
        <div className="formSwitchField__container">
            <M3Switch
                disabled={isDisabled}
                label={switchLabel}
                onChange={onSwitchChange}
                checked={fieldChecked}
            />
            {!disableLabels && (
                <span className="formSwitchField__stateLabel">
                    {t(fieldChecked ? checkedKey : unCheckedKey)}
                </span>
            )}
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
    switchLabel,
}: FormSwitchFieldProps) => {
    const [t] = useTranslation();
    const message = errorMessage || t('form.errors.required');
    const accessibleSwitchLabel = switchLabel || (typeof label === 'string' ? label : t(labelKey || checkedKey));

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
                switchLabel={accessibleSwitchLabel}
            />
        </Form.Item>
    );
};
