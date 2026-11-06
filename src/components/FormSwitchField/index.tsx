import { ConfigProvider, Form } from 'antd';
import { useContext } from 'react';
import Paragraph from 'antd/lib/typography/Paragraph';
import classNames from 'classnames';
import { useTranslation } from 'react-i18next';
import { ReadOnlyTileContext } from '../CardEditable/ReadOnlyTileContext';
import { MuiSwitch } from '../mui/MuiSwitchField';
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
    /** Asked before the switch turns ON; see `MuiSwitchField`. Turning it off never asks. */
    confirmEnable?: (proceed: () => void) => void;
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
    confirmEnable?: (proceed: () => void) => void;
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
    confirmEnable,
}: FormSwitchFieldLocalProps) => {
    const { t } = useTranslation();
    const { componentDisabled } = ConfigProvider.useConfig();
    const inReadOnlyTile = useContext(ReadOnlyTileContext);
    const readOnly = !!componentDisabled && inReadOnlyTile && !disabled;
    const fieldChecked = inverseValue ? !checked : checked;
    const onSwitchChange = (value: boolean) => {
        const next = inverseValue ? !value : value;
        if (next && confirmEnable) {
            confirmEnable(() => onChange?.(true));
            return;
        }
        onChange?.(next);
    };

    return (
        <div className="formSwitchField__container">
            <MuiSwitch
                disabled={!!disabled || (!!componentDisabled && !readOnly)}
                readOnly={readOnly}
                ariaLabel={switchLabel}
                onChange={onSwitchChange}
                checked={!!fieldChecked}
            />
            {!disableLabels && (
                <span className="formSwitchField__stateLabel">{t(fieldChecked ? checkedKey : unCheckedKey)}</span>
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
    confirmEnable,
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
                confirmEnable={confirmEnable}
            />
        </Form.Item>
    );
};
