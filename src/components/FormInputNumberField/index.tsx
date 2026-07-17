import { ConfigProvider, Form } from 'antd';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { FormBaseInputFieldProps } from '../FormBaseInputField';
import { M3NumberField } from '../M3NumberField';
import styles from './styles.module.scss';

const toNumber = (candidate: string | number | undefined): number | undefined =>
    candidate === undefined ? undefined : Number(candidate);

/**
 * M3 number field ("Number Button" pill with split steppers) wired into an
 * antd Form.Item. Keeps the FormBaseInputField API (labelKey, name, required,
 * rules, min/max/step, disabled) — value/onChange flow through the Form.Item.
 */
export const FormInputNumberField = ({
    className,
    name,
    labelKey,
    required,
    rules,
    dependencies,
    min,
    max,
    step,
    disabled,
}: Omit<FormBaseInputFieldProps, 'component'>) => {
    const { t } = useTranslation();
    const { componentDisabled } = ConfigProvider.useConfig();
    const label = t(labelKey);

    return (
        <Form.Item
            className={classNames(className, styles.item)}
            name={name}
            rules={[{ required, message: t('form.errors.required') }, ...(rules || [])]}
            dependencies={dependencies}
        >
            <M3NumberField
                variant="outlined"
                label={required ? `${label} *` : label}
                min={toNumber(min)}
                max={toNumber(max)}
                step={toNumber(step)}
                disabled={disabled ?? componentDisabled ?? false}
            />
        </Form.Item>
    );
};
